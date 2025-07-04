import { type NextRequest, NextResponse } from "next/server";
import { StreamingService } from "@/lib/services/streamingService";
import { Readable } from "stream";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const streamingService = new StreamingService();
    const range = request.headers.get("range");

    const { stream, contentLength, contentRange, contentType } = await streamingService.getVideoStream(
      params.id,
      range || undefined,
    );

    // Create a PassThrough stream to monitor flow
    const passThrough = new Readable().wrap(stream);

    // Handle stream errors
    passThrough.on("error", (err) => {
      console.error(`Stream error for room ${params.id}:`, err);
      passThrough.destroy();
    });

    // Handle client abort (NextRequest does not support 'on', so use AbortSignal)
    if (request.signal) {
      request.signal.addEventListener("abort", () => {
        console.log(`Client closed connection for room ${params.id}`);
        passThrough.destroy();
      });
    }

    const webStream = Readable.toWeb(passThrough) as ReadableStream;

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "Connection": "keep-alive",
    };

    if (range && contentRange) {
      headers["Content-Range"] = contentRange;
      headers["Content-Length"] = contentLength.toString();
      console.log(`Serving partial content for ${params.id}: ${contentRange}`);
      return new NextResponse(webStream, { status: 206, headers });
    }

    headers["Content-Length"] = contentLength.toString();
    console.log(`Serving full content for ${params.id}: ${contentLength} bytes`);
    return new NextResponse(webStream, { status: 200, headers });
  } catch (error: any) {
    console.error("Error streaming movie:", error);
    return new NextResponse(`Movie not found: ${error.message}`, {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  }
}