import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { UserService } from "@/lib/services/userService"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const userSession = cookieStore.get("user-session")

    if (!userSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sessionUser = JSON.parse(userSession.value)
    const userService = new UserService()

    const user = await userService.getUserById(sessionUser.id)
    const stats = await userService.getUserStats(sessionUser.id)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
        picture: user.picture,
        moviesWatched: user.moviesWatched,
        createdAt: user.createdAt,
      },
      stats,
    })
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}
