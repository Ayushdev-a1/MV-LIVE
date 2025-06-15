import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { RoomService } from "@/lib/services/roomService"
import { UserService } from "@/lib/services/userService"

export async function POST(request: NextRequest) {
  console.log("🎬 Room creation API called")

  try {
    // Check authentication
    const cookieStore = cookies()
    const userSession = cookieStore.get("user-session")

    console.log("🔐 Checking authentication...")
    console.log("User session cookie:", userSession ? "Found" : "Not found")

    if (!userSession) {
      console.log("❌ No user session found")
      return NextResponse.json({ error: "Unauthorized - Please sign in" }, { status: 401 })
    }

    let user
    try {
      user = JSON.parse(userSession.value)
      console.log("✅ User authenticated:", {
        id: user.id,
        name: user.name,
        email: user.email,
      })
    } catch (error) {
      console.log("❌ Invalid session data:", error)
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    // Validate user has required fields
    if (!user.id || !user.name || !user.email) {
      console.log("❌ Incomplete user data:", user)
      return NextResponse.json({ error: "Incomplete user session" }, { status: 401 })
    }

    // Parse request body
    let body
    try {
      body = await request.json()
      console.log("📝 Request body:", body)
    } catch (error) {
      console.log("❌ Invalid JSON body:", error)
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    // Validate required fields
    if (!body.name || !body.name.trim()) {
      console.log("❌ Room name missing")
      return NextResponse.json({ error: "Room name is required" }, { status: 400 })
    }

    // Create room using RoomService
    const roomService = new RoomService()
    const userService = new UserService()

    const roomData = {
      name: body.name.trim(),
      description: body.description?.trim() || "",
      hostId: user.id,
      isPrivate: body.isPrivate || false,
      maxParticipants: body.maxParticipants || 10,
      participants: [
        {
          userId: user.id,
          name: user.name,
          picture: user.picture || "/placeholder.svg",
          joinedAt: new Date(),
          isHost: true,
        },
      ],
    }

    console.log("🏗️ Creating room with data:", roomData)

    const room = await roomService.createRoom(roomData)
    console.log("✅ Room created successfully:", room.roomCode)

    // Increment user's rooms created count
    await userService.incrementRoomsCreated(user.id)

    return NextResponse.json(room)
  } catch (error) {
    console.error("💥 Error creating room:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  console.log("📋 Get rooms API called")

  try {
    const cookieStore = cookies()
    const userSession = cookieStore.get("user-session")

    if (!userSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = JSON.parse(userSession.value)
    const roomService = new RoomService()

    // Get user's rooms from database
    const userRooms = await roomService.getUserRooms(user.id)

    console.log("✅ Found", userRooms.length, "rooms for user:", user.name)
    return NextResponse.json(userRooms)
  } catch (error) {
    console.error("💥 Error fetching rooms:", error)
    return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 500 })
  }
}
