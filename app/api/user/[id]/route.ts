import { type NextRequest, NextResponse } from "next/server"
import { UserService } from "@/lib/services/userService"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  console.log("👤 Get user API called for ID:", params.id)

  try {
    const userService = new UserService()
    const user = await userService.getUserById(params.id)

    if (!user) {
      console.log("❌ User not found:", params.id)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("✅ User found:", user.name)
    return NextResponse.json(user)
  } catch (error) {
    console.error("💥 Error fetching user:", error)
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}
