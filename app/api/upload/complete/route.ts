import { type NextRequest, NextResponse } from "next/server";
import { ChunkUploadService } from "@/lib/services/chunkUploadService";
import { RoomService } from "@/lib/services/roomService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, roomCode, filename, totalSize, mimetype } = body;

    if (!sessionId || !roomCode || !filename || !totalSize || !mimetype) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const chunkUploadService = new ChunkUploadService();
    const roomService = new RoomService();

    // Check if upload is complete
    const { isComplete } = await chunkUploadService.getUploadProgress(sessionId);
    if (!isComplete) {
      return NextResponse.json({ error: "Upload not complete" }, { status: 400 });
    }

    // Combine chunks into final file
    const fileId = await chunkUploadService.completeUpload(sessionId);

    // Update room with movie file metadata
    const movieFile = {
      filename: fileId,
      originalName: filename,
      size: totalSize,
      mimetype,
      uploadedAt: new Date(),
      chunks: [fileId],
    };

    await roomService.updateMovieFile(roomCode, movieFile);

    return NextResponse.json({ success: true, fileId });
  } catch (error: any) {
    console.error("Error completing upload:", error);
    return NextResponse.json({ error: `Failed to complete upload: ${error.message}` }, { status: 500 });
  }
}