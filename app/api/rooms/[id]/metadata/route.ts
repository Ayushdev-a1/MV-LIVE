import { type NextRequest, NextResponse } from "next/server";
import { StreamingService } from "@/lib/services/streamingService";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const streamingService = new StreamingService();
    const metadata = await streamingService.getVideoMetadata(params.id);

    if (!metadata) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    return NextResponse.json({
      filename: metadata.filename,
      size: metadata.size,
      mimetype: metadata.mimetype || "video/mp4",
      duration: metadata.duration,
      resolution: metadata.resolution,
      bitrate: metadata.bitrate,
    });
  } catch (error) {
    console.error("Error fetching video metadata:", error);
    return NextResponse.json({ error: "Failed to fetch metadata" }, { status: 500 });
  }
}