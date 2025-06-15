import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { UserService } from "@/lib/services/userService"

export async function POST(request: NextRequest) {
  console.log("📧 Email authentication API called")
  console.log("Request origin:", request.headers.get("origin") || "Unknown")
  console.log("Request host:", request.headers.get("host") || "Unknown")

  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    console.log("📧 Creating email user:", email)

    // Create or update user in database using UserService
    const userService = new UserService()
    const dbUser = await userService.createOrUpdateUser({
      email: email.trim(),
      name: email.split("@")[0] || "User",
      picture: "/placeholder.svg",
    })

    console.log("✅ Email user stored in database:", dbUser._id)

    // Create user session
    const userSession = {
      id: dbUser._id,
      email: dbUser.email,
      name: dbUser.name,
      picture: dbUser.picture,
      loginMethod: "email",
      loginTime: new Date().toISOString(),
      isAuthenticated: true,
    }

    console.log("💾 Creating user session:", { id: userSession.id, email: userSession.email, name: userSession.name })

    const cookieStore = cookies()
    const sessionValue = JSON.stringify(userSession)

    const cookieOptions = {
      httpOnly: false,
      secure: false,
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    };
    console.log("🍪 Setting user-session cookie with options:", cookieOptions);
    cookieStore.set("user-session", sessionValue, cookieOptions);

    console.log("✅ Email user session created successfully")

    return NextResponse.json({
      success: true,
      user: dbUser,
      message: `Welcome ${dbUser.name}!`,
    })
  } catch (error) {
    console.error("💥 Email authentication error:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}