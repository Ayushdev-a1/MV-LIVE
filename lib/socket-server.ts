import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { RoomService } from "@/lib/services/roomService";

let io: SocketIOServer | null = null;
let httpServer: any = null;

export function initializeSocketServer() {
  if (io) {
    return io;
  }

  httpServer = createServer();

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: ["http://localhost:3000", "https://localhost:3000"],
      methods: ["GET", "POST"],
      credentials: true,
    },
    allowEIO3: true,
    transports: ["websocket", "polling"],
  });

  const roomService = new RoomService();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", async (roomCode: string, userId: string) => {
      socket.join(roomCode);
      socket.to(roomCode).emit("user-joined", userId);
      console.log(`User ${userId} joined room ${roomCode}`);

      try {
        const room = await roomService.getRoomByCode(roomCode);
        if (room && Number.isFinite(room.currentTime)) {
          socket.emit("video-sync", {
            currentTime: room.currentTime,
            isPlaying: room.isPlaying,
          });
          console.log(`Sent video-sync to ${socket.id}: time=${room.currentTime}, playing=${room.isPlaying}`);
        } else {
          console.warn(`Invalid room or currentTime for ${roomCode}:`, room);
          socket.emit("video-sync", { currentTime: 0, isPlaying: false });
        }
      } catch (error) {
        console.error("Error syncing video state:", error);
        socket.emit("video-sync", { currentTime: 0, isPlaying: false });
      }
    });

    socket.on("leave-room", (roomCode: string, userId: string) => {
      socket.leave(roomCode);
      socket.to(roomCode).emit("user-left", userId);
      console.log(`User ${userId} left room ${roomCode}`);
    });

    socket.on("video-control", async (roomCode: string, action: string, data: any) => {
      try {
        const currentTime = Number(data.currentTime);
        if (action === "timeUpdate" && !Number.isFinite(currentTime)) {
          console.warn(`Invalid timeUpdate for ${roomCode}:`, currentTime);
          return;
        }

        if (action === "seek" && (!Number.isFinite(currentTime) || currentTime < 0)) {
          console.warn(`Invalid seek time for ${roomCode}:`, currentTime);
          return;
        }

        if (action === "play" || action === "pause") {
          await roomService.updateVideoState(roomCode, currentTime || 0, action === "play");
        } else if (action === "seek") {
          await roomService.updateVideoState(roomCode, currentTime, data.isPlaying);
        } else if (action === "timeUpdate") {
          // Throttle timeUpdate to prevent flooding
          socket.throttle("video-control", 1000, () => {
            io?.to(roomCode).emit("video-control", action, { currentTime, isPlaying: data.isPlaying });
          });
          return;
        }

        io?.to(roomCode).emit("video-control", action, { currentTime, isPlaying: data.isPlaying });
        console.log(`Broadcast ${action} for ${roomCode}: time=${currentTime}, playing=${data.isPlaying}`);
      } catch (error) {
        console.error("Error handling video control:", error);
      }
    });

    socket.on("chat-message", (roomCode: string, message: any) => {
      io?.to(roomCode).emit("chat-message", message);
    });

    socket.on("webrtc-offer", (roomCode: string, offer: any, targetUserId: string) => {
      socket.to(roomCode).emit("webrtc-offer", offer, socket.id);
    });

    socket.on("webrtc-answer", (roomCode: string, answer: any, targetUserId: string) => {
      socket.to(roomCode).emit("webrtc-answer", answer, socket.id);
    });

    socket.on("webrtc-ice-candidate", (roomCode: string, candidate: any, targetUserId: string) => {
      socket.to(roomCode).emit("webrtc-ice-candidate", candidate, socket.id);
    });

    socket.on("end-room", async (roomCode: string, userId: string) => {
      try {
        const room = await roomService.getRoomByCode(roomCode);
        if (room && room.hostId === userId) {
          io?.to(roomCode).emit("room-ended");
          await roomService.endRoom(roomCode);
          console.log(`Room ${roomCode} ended by host ${userId}`);
        }
      } catch (error) {
        console.error("Error ending room:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  const port = process.env.SOCKET_PORT || 3001;
  httpServer.listen(port, () => {
    console.log(`Socket.IO server running on port ${port}`);
  });

  setInterval(async () => {
    try {
      await roomService.cleanupOldRooms();
      console.log("Cleaned up old rooms");
    } catch (error) {
      console.error("Error cleaning up old rooms:", error);
    }
  }, 60 * 60 * 1000); // 1 hour

  return io;
}

export function getSocketServer() {
  return io;
}