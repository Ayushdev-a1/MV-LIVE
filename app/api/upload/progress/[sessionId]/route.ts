import { type NextRequest, NextResponse } from "next/server"
import { ChunkUploadService } from "@/lib/services/chunkUploadService"

export async function GET(request: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const chunkUploadService = new ChunkUploadService()
    const progress = await chunkUploadService.getUploadProgress(params.sessionId)

    return NextResponse.json(progress)
  } catch (error) {
    console.error("Error getting upload progress:", error)
    return NextResponse.json({ error: "Failed to get progress" }, { status: 500 })
  }
}
