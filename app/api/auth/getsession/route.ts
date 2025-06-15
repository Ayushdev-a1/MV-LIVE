import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Fetching user session from cookies...");

    const cookieStore = cookies();
    const userSession = cookieStore.get("user-session")?.value;

    if (!userSession) {
      console.log("❌ No user session found");
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const userData = JSON.parse(userSession);
    console.log("✅ User session found:", {
      id: userData.id,
      email: userData.email,
      name: userData.name,
    });

    return NextResponse.json({ user: userData }, { status: 200 });
  } catch (error) {
    console.error("💥 Error fetching user session:", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}