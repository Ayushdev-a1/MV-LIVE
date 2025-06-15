import { getDatabase } from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

export class StreamingService {
  private async getGridFSBucket() {
    const db = await getDatabase()
    return new GridFSBucket(db, { bucketName: "movies" })
  }

  async getVideoStream(
    roomCode: string,
    range?: string,
  ): Promise<{
    stream: NodeJS.ReadableStream
    contentLength: number
    contentRange?: string
    contentType: string
  }> {
    const bucket = await this.getGridFSBucket()

    // Find the movie file for this room
    const files = await bucket
      .find({
        "metadata.roomCode": roomCode,
        "metadata.isStreamable": true,
      })
      .toArray()

    if (files.length === 0) {
      throw new Error("Movie file not found")
    }

    const file = files[0]
    const totalSize = file.length
    const contentType = file.metadata?.mimetype || "video/mp4"

    if (range) {
      // Parse range header for partial content
      const parts = range.replace(/bytes=/, "").split("-")
      const start = Number.parseInt(parts[0], 10)
      const end = parts[1] ? Number.parseInt(parts[1], 10) : Math.min(start + 10 * 1024 * 1024, totalSize - 1) // 10MB chunks

      const contentLength = end - start + 1
      const contentRange = `bytes ${start}-${end}/${totalSize}`

      const stream = bucket.openDownloadStream(file._id, {
        start,
        end: end + 1,
      })

      return {
        stream,
        contentLength,
        contentRange,
        contentType,
      }
    }

    // Full file stream
    const stream = bucket.openDownloadStream(file._id)
    return {
      stream,
      contentLength: totalSize,
      contentType,
    }
  }

  async getVideoMetadata(roomCode: string): Promise<{
    filename: string
    size: number
    duration?: number
    resolution?: string
    bitrate?: number
  } | null> {
    const bucket = await this.getGridFSBucket()

    const files = await bucket
      .find({
        "metadata.roomCode": roomCode,
        "metadata.isStreamable": true,
      })
      .toArray()

    if (files.length === 0) {
      return null
    }

    const file = files[0]
    return {
      filename: file.metadata?.originalName || file.filename,
      size: file.length,
      duration: file.metadata?.duration,
      resolution: file.metadata?.resolution,
      bitrate: file.metadata?.bitrate,
    }
  }

  // Adaptive bitrate streaming preparation
  async createStreamingManifest(roomCode: string): Promise<string> {
    const metadata = await this.getVideoMetadata(roomCode)
    if (!metadata) {
      throw new Error("Video not found")
    }

    // Simple HLS-like manifest for adaptive streaming
    const manifest = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD

#EXTINF:10.0,
/api/rooms/${roomCode}/stream/segment/0
#EXTINF:10.0,
/api/rooms/${roomCode}/stream/segment/1
#EXT-X-ENDLIST`

    return manifest
  }
}
