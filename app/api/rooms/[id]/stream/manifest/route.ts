import { type NextRequest, NextResponse } from "next/server"
import { StreamingService } from "@/lib/services/streamingService"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const streamingService = new StreamingService()
    const manifest = await streamingService.createStreamingManifest(params.id)

    return new NextResponse(manifest, {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("Error creating manifest:", error)
    return NextResponse.json({ error: "Failed to create manifest" }, { status: 500 })
  }
}
