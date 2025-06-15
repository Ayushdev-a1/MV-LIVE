import { type NextRequest, NextResponse } from "next/server"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI = process.env.NEXTAUTH_URL + "/api/auth/google/callback"

export async function GET(request: NextRequest) {
  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")

  googleAuthUrl.searchParams.append("client_id", GOOGLE_CLIENT_ID || "")
  googleAuthUrl.searchParams.append("redirect_uri", REDIRECT_URI)
  googleAuthUrl.searchParams.append("response_type", "code")
  googleAuthUrl.searchParams.append("scope", "openid email profile")
  googleAuthUrl.searchParams.append("access_type", "offline")
  googleAuthUrl.searchParams.append("prompt", "consent")

  return NextResponse.redirect(googleAuthUrl.toString())
}
