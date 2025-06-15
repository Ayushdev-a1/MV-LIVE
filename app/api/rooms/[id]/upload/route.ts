import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { RoomService } from "@/lib/services/roomService"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  console.log("🎬 Movie upload API called for room:", params.id)

  try {
    // Check authentication
    const cookieStore = cookies()
    const userSession = cookieStore.get("user-session")

    if (!userSession) {
      console.log("❌ No user session for upload")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = JSON.parse(userSession.value)
    console.log("✅ User authenticated for upload:", user.name)

    // Verify user is host of the room
    const roomService = new RoomService()
    const room = await roomService.getRoomByCode(params.id)

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    if (room.hostId !== user.id) {
      return NextResponse.json({ error: "Only room host can upload movies" }, { status: 403 })
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get("movie") as File

    if (!file) {
      console.log("❌ No file provided")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log("📁 File received:", file.name, file.size, file.type)

    // Validate file size (2GB max)
    const maxSize = 2 * 1024 * 1024 * 1024 // 2GB
    if (file.size > maxSize) {
      console.log("❌ File too large:", file.size)
      return NextResponse.json({ error: "File too large. Maximum size is 2GB" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ["video/mp4", "video/avi", "video/mkv", "video/mov", "video/wmv", "video/webm"]
    if (!allowedTypes.includes(file.type)) {
      console.log("❌ Invalid file type:", file.type)
      return NextResponse.json({ error: "Invalid file type. Only video files are allowed" }, { status: 400 })
    }

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    // Upload to GridFS
    console.log("⏳ Uploading to GridFS...")
    const fileId = await roomService.uploadMovieFile(params.id, fileBuffer, file.name, file.type)

    console.log("✅ Upload successful:", fileId)

    return NextResponse.json({
      success: true,
      fileId,
      filename: file.name,
      size: file.size,
      roomCode: params.id,
    })
  } catch (error) {
    console.error("💥 Upload error:", error)
    return NextResponse.json({ error: "Failed to upload movie" }, { status: 500 })
  }
}
