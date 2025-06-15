import { createServer } from "http"
import { Server as SocketIOServer } from "socket.io"
import { RoomService } from "@/lib/services/roomService"

let io: SocketIOServer | null = null
let httpServer: any = null

export function initializeSocketServer() {
  if (io) {
    return io
  }

  // Create HTTP server for Socket.IO
  httpServer = createServer()

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: ["http://localhost:3000", "https://localhost:3000"],
      methods: ["GET", "POST"],
      credentials: true,
    },
    allowEIO3: true,
    transports: ["websocket", "polling"],
  })

  const roomService = new RoomService()

  // Socket event handlers
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id)

    // Join room
    socket.on("join-room", async (roomCode: string, userId: string) => {
      socket.join(roomCode)
      socket.to(roomCode).emit("user-joined", userId)
      console.log(`User ${userId} joined room ${roomCode}`)

      // Send current video state to new user
      try {
        const room = await roomService.getRoomByCode(roomCode)
        if (room) {
          socket.emit("video-sync", {
            currentTime: room.currentTime,
            isPlaying: room.isPlaying,
          })
        }
      } catch (error) {
        console.error("Error syncing video state:", error)
      }
    })

    // Leave room
    socket.on("leave-room", (roomCode: string, userId: string) => {
      socket.leave(roomCode)
      socket.to(roomCode).emit("user-left", userId)
      console.log(`User ${userId} left room ${roomCode}`)
    })

    // Video control synchronization - everyone can control
    socket.on("video-control", async (roomCode: string, action: string, data: any) => {
      try {
        // Update room state in database
        if (action === "play" || action === "pause") {
          await roomService.updateVideoState(roomCode, data.currentTime || 0, action === "play")
        } else if (action === "seek") {
          await roomService.updateVideoState(roomCode, data.currentTime, data.isPlaying)
        }

        // Broadcast to all users in room (including sender for confirmation)
        io?.to(roomCode).emit("video-control", action, data)
      } catch (error) {
        console.error("Error handling video control:", error)
      }
    })

    // Chat messages
    socket.on("chat-message", (roomCode: string, message: any) => {
      io?.to(roomCode).emit("chat-message", message)
    })

    // WebRTC signaling
    socket.on("webrtc-offer", (roomCode: string, offer: any, targetUserId: string) => {
      socket.to(roomCode).emit("webrtc-offer", offer, socket.id)
    })

    socket.on("webrtc-answer", (roomCode: string, answer: any, targetUserId: string) => {
      socket.to(roomCode).emit("webrtc-answer", answer, socket.id)
    })

    socket.on("webrtc-ice-candidate", (roomCode: string, candidate: any, targetUserId: string) => {
      socket.to(roomCode).emit("webrtc-ice-candidate", candidate, socket.id)
    })

    // Room ended by host
    socket.on("end-room", async (roomCode: string, userId: string) => {
      try {
        const room = await roomService.getRoomByCode(roomCode)
        if (room && room.hostId === userId) {
          // Notify all users that room is ending
          io?.to(roomCode).emit("room-ended")

          // End room and cleanup
          await roomService.endRoom(roomCode)

          console.log(`Room ${roomCode} ended by host ${userId}`)
        }
      } catch (error) {
        console.error("Error ending room:", error)
      }
    })

    // Disconnect
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id)
    })
  })

  // Start the server
  const port = process.env.SOCKET_PORT || 3001
  httpServer.listen(port, () => {
    console.log(`Socket.IO server running on port ${port}`)
  })

  // Cleanup old rooms every hour
  setInterval(
    async () => {
      try {
        await roomService.cleanupOldRooms()
      } catch (error) {
        console.error("Error cleaning up old rooms:", error)
      }
    },
    60 * 60 * 1000,
  ) // 1 hour

  return io
}

export function getSocketServer() {
  return io
}
