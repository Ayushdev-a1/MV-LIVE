import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { RoomService } from "@/lib/services/roomService";
import { ChunkUploadService } from "@/lib/services/chunkUploadService";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  console.log("🎬 Movie upload API called for room:", params.id);

  try {
    // Check authentication
    const cookieStore = cookies();
    const userSession = cookieStore.get("user-session");

    if (!userSession) {
      console.log("❌ No user session for upload");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userSession.value);
    console.log("✅ User authenticated for upload:", user.name);

    // Verify user is host of the room
    const roomService = new RoomService();
    const room = await roomService.getRoomByCode(params.id);

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.hostId !== user.id) {
      return NextResponse.json({ error: "Only room host can upload movies" }, { status: 403 });
    }

    // Get form data
    const formData = await request.formData();
    const action = formData.get("action") as string;
    const chunkUploadService = new ChunkUploadService();

    if (action === "init") {
      // Initialize upload session
      const file = formData.get("movie") as File;
      if (!file) {
        console.log("❌ No file provided");
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      console.log("📁 File metadata:", file.name, file.size, file.type);

      // Validate file size (2GB max)
      const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
      if (file.size > maxSize) {
        console.log("❌ File too large:", file.size);
        return NextResponse.json({ error: "File too large. Maximum size is 2GB" }, { status: 400 });
      }

      // Validate file type
      const allowedTypes = ["video/mp4", "video/avi", "video/mkv", "video/mov", "video/wmv", "video/webm"];
      if (!allowedTypes.includes(file.type)) {
        console.log("❌ Invalid file type:", file.type);
        return NextResponse.json({ error: "Invalid file type. Only video files are allowed" }, { status: 400 });
      }

      const session = await chunkUploadService.createUploadSession(params.id, file.name, file.size, file.type);
      return NextResponse.json({ success: true, sessionId: session.sessionId });
    } else if (action === "chunk") {
      // Upload a chunk
      const sessionId = formData.get("sessionId") as string;
      const chunkIndex = Number(formData.get("chunkIndex"));
      const chunk = formData.get("chunk") as File;

      if (!sessionId || isNaN(chunkIndex) || !chunk) {
        console.log("❌ Invalid chunk data");
        return NextResponse.json({ error: "Invalid chunk data" }, { status: 400 });
      }

      const chunkBuffer = Buffer.from(await chunk.arrayBuffer());
      const success = await chunkUploadService.uploadChunk(sessionId, chunkIndex, chunkBuffer);
      const { progress, isComplete } = await chunkUploadService.getUploadProgress(sessionId);

      return NextResponse.json({ success, progress, isComplete });
    } else if (action === "complete") {
      // Complete the upload
      const sessionId = formData.get("sessionId") as string;
      if (!sessionId) {
        console.log("❌ No session ID provided");
        return NextResponse.json({ error: "No session ID provided" }, { status: 400 });
      }

      const fileId = await chunkUploadService.completeUpload(sessionId);

      // Update room with movie file info
      const movieFile = {
        filename: fileId,
        originalName: formData.get("filename") as string,
        size: Number(formData.get("size")),
        mimetype: formData.get("mimetype") as string,
        uploadedAt: new Date(),
        chunks: [fileId],
      };

      await roomService.updateMovieFile(params.id, movieFile);

      return NextResponse.json({ success: true, fileId });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("💥 Upload error:", error);
    return NextResponse.json({ error: `Failed to upload movie: ${error.message}` }, { status: 500 });
  }
}