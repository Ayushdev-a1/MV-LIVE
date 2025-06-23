import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ChunkUploadService } from "@/lib/services/chunkUploadService";
import { RoomService } from "@/lib/services/roomService";

export async function GET(request: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const cookieStore = cookies();
    const userSession = cookieStore.get("user-session");

    if (!userSession) {
      console.log("Unauthorized: No user session found");
      return NextResponse.json({ error: "Unauthorized - Please sign in" }, { status: 401 });
    }

    let user;
    try {
      user = JSON.parse(userSession.value);
    } catch (error) {
      console.log("Invalid user session format");
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const chunkUploadService = new ChunkUploadService();
    const { progress, isComplete } = await chunkUploadService.getUploadProgress(params.sessionId);

    // Verify user has access to the session's room
    const session = await chunkUploadService.getSession(params.sessionId);
    if (!session) {
      console.log(`Session not found for sessionId: ${params.sessionId}`);
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const roomService = new RoomService();
    const room = await roomService.getRoomByCode(session.roomCode);
    if (!room || room.hostId !== user.id) {
      console.log(`Unauthorized access to session: ${params.sessionId}, user: ${user.id}`);
      return NextResponse.json({ error: "Unauthorized to access session" }, { status: 403 });
    }

    console.log(`Progress for session ${params.sessionId}: ${progress}% (complete: ${isComplete})`);
    return NextResponse.json({ progress, isComplete });
  } catch (error: any) {
    console.error("Error fetching upload progress:", error);
    return NextResponse.json({ error: `Failed to fetch progress: ${error.message}` }, { status: 500 });
  }
}