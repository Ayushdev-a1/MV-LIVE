import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { UserService } from "@/lib/services/userService"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI = process.env.NEXTAUTH_URL + "/api/auth/google/callback"

export async function GET(request: NextRequest) {
  console.log("🔐 Google OAuth callback triggered")

  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error) {
    console.log("❌ OAuth error:", error)
    return NextResponse.redirect(new URL("/auth?error=oauth_error", request.url))
  }

  if (!code) {
    console.log("❌ No authorization code received")
    return NextResponse.redirect(new URL("/auth?error=no_code", request.url))
  }

  try {
    console.log("🔄 Exchanging code for tokens...")

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID || "",
        client_secret: GOOGLE_CLIENT_SECRET || "",
        code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
      }),
    })

    const tokens = await tokenResponse.json()
    console.log("🎫 Token response status:", tokenResponse.status)

    if (!tokens.access_token) {
      console.log("❌ No access token received:", tokens)
      throw new Error("No access token received")
    }

    console.log("✅ Access token received")

    // Get user info from Google
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    const googleUser = await userResponse.json()
    console.log("👤 Google user info:", { id: googleUser.id, email: googleUser.email, name: googleUser.name })

    if (!googleUser.id || !googleUser.email) {
      throw new Error("Invalid user data from Google")
    }

    // Create or update user in database using UserService
    console.log("💾 Storing user in database...")
    const userService = new UserService()
    const dbUser = await userService.createOrUpdateUser({
      googleId: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
    })

    console.log("✅ User stored in database:", dbUser._id)

    // Create comprehensive user session
    const userSession = {
      id: dbUser._id,
      googleId: dbUser.googleId,
      email: dbUser.email,
      name: dbUser.name,
      picture: dbUser.picture,
      accessToken: tokens.access_token,
      loginMethod: "google",
      loginTime: new Date().toISOString(),
      isAuthenticated: true,
    }

    console.log("💾 Creating user session:", { id: userSession.id, email: userSession.email, name: userSession.name })

    // Set secure session cookie
    const cookieStore = cookies()
    const sessionValue = JSON.stringify(userSession)
    console.log("🍪 Setting user-session cookie with options:",  {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days 
    }, sessionValue)
    
    cookieStore.set("user-session", sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })
    console.log("✅ Session cookies set successfully")
    console.log("🔄 Redirecting to dashboard...")

    // Redirect to dashboard
    return NextResponse.redirect(new URL("/dashboard", request.url))
  } catch (error) {
    console.error("💥 Google OAuth error:", error)
    return NextResponse.redirect(new URL("/auth?error=oauth_failed", request.url))
  }
}
