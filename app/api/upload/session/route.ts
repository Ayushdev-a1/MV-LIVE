import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { ChunkUploadService } from "@/lib/services/chunkUploadService"
import { RoomService } from "@/lib/services/roomService"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const userSession = cookieStore.get("user-session")

    if (!userSession) {
      return NextResponse.json({ error: "Unauthorized - Please sign in" }, { status: 401 })
    }

    let user
    try {
      user = JSON.parse(userSession.value)
    } catch (error) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const body = await request.json()
    const { roomCode, filename, totalSize, mimetype } = body

    if (!roomCode || !filename || !totalSize || !mimetype) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify user is host of the room
    const roomService = new RoomService()
    const room = await roomService.getRoomByCode(roomCode)

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    if (room.hostId !== user.id) {
      return NextResponse.json({ error: "Only room host can upload movies" }, { status: 403 })
    }

    // Validate file size (50GB max)
    const maxSize = 50 * 1024 * 1024 * 1024 // 50GB
    if (totalSize > maxSize) {
      return NextResponse.json({ error: "File too large. Maximum size is 50GB" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ["video/mp4", "video/avi", "video/mkv", "video/mov", "video/wmv", "video/webm"]
    if (!allowedTypes.includes(mimetype)) {
      return NextResponse.json({ error: "Invalid file type. Only video files are allowed" }, { status: 400 })
    }

    // Create upload session
    const chunkUploadService = new ChunkUploadService()
    const session = await chunkUploadService.createUploadSession(roomCode, filename, totalSize, mimetype)

    return NextResponse.json(session)
  } catch (error) {
    console.error("Error creating upload session:", error)
    return NextResponse.json({ error: "Failed to create upload session" }, { status: 500 })
  }
}
