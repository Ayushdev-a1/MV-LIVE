import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { RoomService } from "@/lib/services/roomService"
import { UserService } from "@/lib/services/userService"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  console.log("🔍 Get room API called for:", params.id)

  try {
    const roomService = new RoomService()
    const room = await roomService.getRoomByCode(params.id)

    if (!room) {
      console.log("❌ Room not found:", params.id)
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    console.log("✅ Room found:", room.name)
    return NextResponse.json(room)
  } catch (error) {
    console.error("💥 Error fetching room:", error)
    return NextResponse.json({ error: "Failed to fetch room" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  console.log("🚪 Join room API called for:", params.id)

  try {
    const cookieStore = cookies()
    const userSession = cookieStore.get("user-session")

    if (!userSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = JSON.parse(userSession.value)
    const roomService = new RoomService()
    const userService = new UserService()

    const participant = {
      userId: user.id,
      name: user.name,
      picture: user.picture || "/placeholder.svg",
      joinedAt: new Date(),
      isHost: false,
    }

    const room = await roomService.addParticipant(params.id, participant)

    if (!room) {
      return NextResponse.json({ error: "Room not found or full" }, { status: 404 })
    }

    // Increment user's rooms joined count if they're not the host
    if (room.hostId !== user.id) {
      await userService.incrementRoomsJoined(user.id)
    }

    console.log("✅ User joined room:", user.name)
    return NextResponse.json(room)
  } catch (error) {
    console.error("💥 Error joining room:", error)
    return NextResponse.json({ error: "Failed to join room" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies()
    const userSession = cookieStore.get("user-session")

    if (!userSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = JSON.parse(userSession.value)
    const roomService = new RoomService()

    await roomService.removeParticipant(params.id, user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error leaving room:", error)
    return NextResponse.json({ error: "Failed to leave room" }, { status: 500 })
  }
}
