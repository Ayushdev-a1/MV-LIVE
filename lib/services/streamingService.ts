import { getDatabase } from "@/lib/mongodb";
import { GridFSBucket } from "mongodb";

export class StreamingService {
  private async getGridFSBucket() {
    const db = await getDatabase();
    return new GridFSBucket(db, { bucketName: "movies" });
  }

  async getVideoStream(
    roomCode: string,
    range?: string,
  ): Promise<{
    stream: NodeJS.ReadableStream;
    contentLength: number;
    contentRange?: string;
    contentType: string;
  }> {
    const bucket = await this.getGridFSBucket();

    const files = await bucket
      .find({
        "metadata.roomCode": roomCode,
        "metadata.isStreamable": true,
      })
      .toArray();

    if (files.length === 0) {
      console.log(`❌ No streamable file found for roomCode: ${roomCode}`);
      throw new Error("Movie file not found");
    }

    const file = files[0];
    const totalSize = file.length;
    const contentType = file.metadata?.mimetype || "video/mp4";

    console.log(`📹 Streaming file: ${file.filename}, MIME: ${contentType}, Size: ${totalSize}`);

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = Number.parseInt(parts[0], 10);
      const end = parts[1] ? Number.parseInt(parts[1], 10) : totalSize - 1;

      if (isNaN(start) || isNaN(end) || start < 0 || end >= totalSize) {
        throw new Error("Invalid range request");
      }

      const contentLength = end - start + 1;
      const contentRange = `bytes ${start}-${end}/${totalSize}`;

      const stream = bucket.openDownloadStream(file._id, {
        start,
        end: end + 1,
      });

      stream.on("error", (err) => {
        console.error(`Stream error for file ${file._id}:`, err);
      });

      return {
        stream,
        contentLength,
        contentRange,
        contentType,
      };
    }

    const stream = bucket.openDownloadStream(file._id);
    stream.on("error", (err) => {
      console.error(`Stream error for file ${file._id}:`, err);
    });

    return {
      stream,
      contentLength: totalSize,
      contentType,
    };
  }

  async getVideoMetadata(roomCode: string): Promise<{
    filename: string;
    size: number;
    mimetype?: string;
    duration?: number;
    resolution?: string;
    bitrate?: number;
  } | null> {
    const bucket = await this.getGridFSBucket();

    const files = await bucket
      .find({
        "metadata.roomCode": roomCode,
        "metadata.isStreamable": true,
      })
      .toArray();

    if (files.length === 0) {
      console.log(`❌ No metadata found for roomCode: ${roomCode}`);
      return null;
    }

    const file = files[0];
    return {
      filename: file.metadata?.originalName || file.filename,
      size: file.length,
      mimetype: file.metadata?.mimetype,
      duration: file.metadata?.duration,
      resolution: file.metadata?.resolution,
      bitrate: file.metadata?.bitrate,
    };
  }

  async createStreamingManifest(roomCode: string): Promise<string> {
    const metadata = await this.getVideoMetadata(roomCode);
    if (!metadata) {
      throw new Error("Video not found");
    }

    const manifest = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:10.0,
/api/rooms/${roomCode}/stream/segment/0
#EXTINF:10.0,
/api/rooms/${roomCode}/stream/segment/1
#EXT-X-ENDLIST`;

    return manifest;
  }
}