import { type NextRequest, NextResponse } from "next/server"
import { ChunkUploadService } from "@/lib/services/chunkUploadService"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const sessionId = formData.get("sessionId") as string
    const chunkIndex = Number.parseInt(formData.get("chunkIndex") as string)
    const chunkFile = formData.get("chunk") as File

    if (!sessionId || isNaN(chunkIndex) || !chunkFile) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const chunkBuffer = Buffer.from(await chunkFile.arrayBuffer())

    const chunkUploadService = new ChunkUploadService()
    await chunkUploadService.uploadChunk(sessionId, chunkIndex, chunkBuffer)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error uploading chunk:", error)
    return NextResponse.json({ error: "Failed to upload chunk" }, { status: 500 })
  }
}
