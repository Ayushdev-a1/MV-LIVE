const { createServer } = require("http")
const { Server } = require("socket.io")
const { MongoClient, GridFSBucket } = require("mongodb")

// MongoDB connection
let db = null

async function connectToDatabase() {
  if (db) return db

  const client = new MongoClient(process.env.MONGODB_URI || "mongodb://localhost:27017/cinesync")
  await client.connect()
  db = client.db("cinesync")
  console.log("Connected to MongoDB")
  return db
}

// Room service functions
async function getRoomByCode(roomCode) {
  const database = await connectToDatabase()
  return await database.collection("rooms").findOne({ roomCode, isActive: true })
}

async function updateVideoState(roomCode, currentTime, isPlaying) {
  const database = await connectToDatabase()
  await database.collection("rooms").updateOne(
    { roomCode, isActive: true },
    {
      $set: {
        currentTime,
        isPlaying,
        updatedAt: new Date(),
      },
    },
  )
}

async function endRoom(roomCode) {
  const database = await connectToDatabase()
  const room = await database.collection("rooms").findOne({ roomCode })

  if (room) {
    const bucket = new GridFSBucket(database, { bucketName: "movies" })
    if (room.movieFile) {
      try {
        const files = await bucket.find({ filename: room.movieFile.filename }).toArray()
        for (const file of files) {
          await bucket.delete(file._id)
        }
        console.log(`Deleted movie file: ${room.movieFile.filename}`)
      } catch (error) {
        console.error("Error deleting movie file:", error)
      }
    }

    await database.collection("rooms").updateOne(
      { roomCode },
      {
        $set: {
          isActive: false,
          endedAt: new Date(),
          updatedAt: new Date(),
        },
      },
    )
  }
}

async function cleanupOldRooms() {
  try {
    const database = await connectToDatabase()
    const bucket = new GridFSBucket(database, { bucketName: "movies" })
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const oldRooms = await database.collection("rooms").find({
      isActive: false,
      endedAt: { $lt: oneDayAgo },
    }).toArray()

    for (const room of oldRooms) {
      if (room.movieFile) {
        try {
          const files = await bucket.find({ filename: room.movieFile.filename }).toArray()
          for (const file of files) {
            await bucket.delete(file._id)
          }
        } catch (error) {
          console.error("Error deleting old movie file:", error)
        }
      }
    }

    await database.collection("rooms").deleteMany({
      isActive: false,
      endedAt: { $lt: oneDayAgo },
    })
    console.log(`Cleaned up ${oldRooms.length} old rooms`)
  } catch (error) {
    console.error("Error cleaning up old rooms:", error)
  }
}

// Create HTTP server
const httpServer = createServer()

// Create Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "https://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  allowEIO3: true,
  transports: ["websocket", "polling"],
})

// Store user socket association: socket.id -> { userId, roomCode }
const socketToUser = new Map()

// Socket event handlers
io.on("connection", (socket) => {
  console.log("User connected:", socket.id)

  // Join room
  socket.on("join-room", async (roomCode, userId) => {
    socket.join(roomCode)
    socketToUser.set(socket.id, { userId, roomCode })
    
    // Broadcast both userId and socketId to the room
    socket.to(roomCode).emit("user-joined", userId, socket.id)
    console.log(`User ${userId} joined room ${roomCode} with socket ${socket.id}`)

    // Send current video state to new user
    try {
      const room = await getRoomByCode(roomCode)
      if (room) {
        socket.emit("video-sync", {
          currentTime: room.currentTime || 0,
          isPlaying: room.isPlaying || false,
        })
      }
    } catch (error) {
      console.error("Error syncing video state:", error)
    }
  })

  // Leave room
  socket.on("leave-room", (roomCode, userId) => {
    socket.leave(roomCode)
    socketToUser.delete(socket.id)
    socket.to(roomCode).emit("user-left", userId, socket.id)
    console.log(`User ${userId} left room ${roomCode}`)
  })

  // Video control synchronization
  socket.on("video-control", async (roomCode, action, data) => {
    try {
      // Update room state in database
      if (action === "play" || action === "pause") {
        await updateVideoState(roomCode, data.currentTime || 0, action === "play")
      } else if (action === "seek") {
        await updateVideoState(roomCode, data.currentTime, data.isPlaying)
      }

      // Broadcast to all users in room
      io.to(roomCode).emit("video-control", action, data)
    } catch (error) {
      console.error("Error handling video control:", error)
    }
  })

  // Chat messages
  socket.on("chat-message", (roomCode, message) => {
    io.to(roomCode).emit("chat-message", message)
  })

  // WebRTC signaling (targeted routing)
  socket.on("webrtc-offer", (roomCode, offer, targetSocketId) => {
    const sender = socketToUser.get(socket.id)
    const senderUserId = sender ? sender.userId : null
    io.to(targetSocketId).emit("webrtc-offer", offer, socket.id, senderUserId)
  })

  socket.on("webrtc-answer", (roomCode, answer, targetSocketId) => {
    const sender = socketToUser.get(socket.id)
    const senderUserId = sender ? sender.userId : null
    io.to(targetSocketId).emit("webrtc-answer", answer, socket.id, senderUserId)
  })

  socket.on("webrtc-ice-candidate", (roomCode, candidate, targetSocketId) => {
    const sender = socketToUser.get(socket.id)
    const senderUserId = sender ? sender.userId : null
    io.to(targetSocketId).emit("webrtc-ice-candidate", candidate, socket.id, senderUserId)
  })

  // Room ended by host
  socket.on("end-room", async (roomCode, userId) => {
    try {
      const room = await getRoomByCode(roomCode)
      if (room && room.hostId === userId) {
        // Notify all users that room is ending
        io.to(roomCode).emit("room-ended")

        // End room and cleanup
        await endRoom(roomCode)

        console.log(`Room ${roomCode} ended by host ${userId}`)
      }
    } catch (error) {
      console.error("Error ending room:", error)
    }
  })

  // Disconnect
  socket.on("disconnect", () => {
    const info = socketToUser.get(socket.id)
    if (info) {
      const { userId, roomCode } = info
      socketToUser.delete(socket.id)
      socket.to(roomCode).emit("user-left", userId, socket.id)
      console.log(`User ${userId} disconnected from room ${roomCode}`)
    } else {
      console.log("User disconnected:", socket.id)
    }
  })
})

// Start server
const PORT = process.env.SOCKET_PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`)
})

// Cleanup old rooms every hour
setInterval(cleanupOldRooms, 60 * 60 * 1000)

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully")
  httpServer.close(() => {
    console.log("Socket.IO server closed")
    process.exit(0)
  })
})

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully")
  httpServer.close(() => {
    console.log("Socket.IO server closed")
    process.exit(0)
  })
})
