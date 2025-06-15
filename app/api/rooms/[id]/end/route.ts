import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { RoomService } from "@/lib/services/roomService"
import { UserService } from "@/lib/services/userService"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies()
    const userSession = cookieStore.get("user-session")

    if (!userSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = JSON.parse(userSession.value)
    const roomService = new RoomService()
    const userService = new UserService()

    // Get room info before ending
    const room = await roomService.getRoomByCode(params.id)

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    // Check if user is host
    if (room.hostId !== user.id) {
      return NextResponse.json({ error: "Only room host can end the room" }, { status: 403 })
    }

    // Add movie to watched list for all participants
    if (room.movieFile) {
      for (const participant of room.participants) {
        await userService.addMovieWatched(participant.userId, room.movieFile.originalName)
      }
    }

    // End room (this will delete the movie file)
    await roomService.endRoom(params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error ending room:", error)
    return NextResponse.json({ error: "Failed to end room" }, { status: 500 })
  }
}
