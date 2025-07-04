import { type NextRequest, NextResponse } from "next/server"
import { StreamingService } from "@/lib/services/streamingService"
import { Readable } from "stream"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const streamingService = new StreamingService()
    const range = request.headers.get("range")

    const { stream, contentLength, contentRange, contentType } = await streamingService.getVideoStream(
      params.id,
      range || undefined,
    )

    // Convert Node.js stream to Web ReadableStream for broader compatibility
    const webStream = Readable.toWeb(stream as any) as ReadableStream

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    }

    if (range && contentRange) {
      headers["Content-Range"] = contentRange
      headers["Content-Length"] = contentLength.toString()

      return new NextResponse(webStream, {
        status: 206, // Partial Content
        headers,
      })
    }

    headers["Content-Length"] = contentLength.toString()

    return new NextResponse(webStream, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("Error streaming movie:", error)
    return NextResponse.json({ error: "Movie not found" }, { status: 404 })
  }
}
