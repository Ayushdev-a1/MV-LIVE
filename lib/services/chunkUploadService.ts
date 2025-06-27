import { getDatabase } from "@/lib/mongodb"
import { GridFSBucket, ObjectId } from "mongodb"

export interface ChunkUploadSession {
  sessionId: string
  roomCode: string
  filename: string
  totalSize: number
  chunkSize: number
  totalChunks: number
  uploadedChunks: number[]
  createdAt: Date
  expiresAt: Date
}

export class ChunkUploadService {
  private readonly CHUNK_SIZE = 5 * 1024 * 1024 // 5MB chunks
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000 // 24 hours

  private async getSessionCollection() {
    const db = await getDatabase()
    return db.collection<ChunkUploadSession>("upload_sessions")
  }

  private async getGridFSBucket() {
    const db = await getDatabase()
    return new GridFSBucket(db, { bucketName: "movies" })
  }

  async createUploadSession(
    roomCode: string,
    filename: string,
    totalSize: number,
    mimetype: string,
  ): Promise<ChunkUploadSession> {
    try {
      const collection = await this.getSessionCollection()

      const totalChunks = Math.ceil(totalSize / this.CHUNK_SIZE)
      const sessionId = new ObjectId().toString()

      const session: ChunkUploadSession = {
        sessionId,
        roomCode,
        filename,
        totalSize,
        chunkSize: this.CHUNK_SIZE,
        totalChunks,
        uploadedChunks: [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + this.SESSION_TIMEOUT),
      }

      await collection.insertOne(session)
      console.log("Upload session created:", sessionId)
      return session
    } catch (error) {
      console.error("Error creating upload session:", error)
      throw new Error("Failed to create upload session")
    }
  }

  async getSession(sessionId: string): Promise<ChunkUploadSession | null> {
    try {
      const collection = await this.getSessionCollection()
      const session = await collection.findOne({ sessionId })

      if (!session) {
        console.log(`Session not found: ${sessionId}`)
        return null
      }

      return session
    } catch (error) {
      console.error("Error retrieving session:", error)
      throw new Error("Failed to retrieve session")
    }
  }

  async uploadChunk(sessionId: string, chunkIndex: number, chunkData: Buffer): Promise<boolean> {
    const collection = await this.getSessionCollection()
    const bucket = await this.getGridFSBucket()

    const session = await collection.findOne({ sessionId })
    if (!session) {
      throw new Error("Upload session not found")
    }

    if (session.uploadedChunks.includes(chunkIndex)) {
      return true // Chunk already uploaded
    }

    // Store chunk in GridFS with metadata
    const chunkFilename = `${sessionId}_chunk_${chunkIndex}`
    const uploadStream = bucket.openUploadStream(chunkFilename, {
      metadata: {
        sessionId,
        chunkIndex,
        roomCode: session.roomCode,
        uploadedAt: new Date(),
      },
    })

    return new Promise((resolve, reject) => {
      uploadStream.on("finish", async () => {
        // Update session with uploaded chunk
        await collection.updateOne(
          { sessionId },
          {
            $addToSet: { uploadedChunks: chunkIndex },
            $set: { updatedAt: new Date() },
          },
        )
        resolve(true)
      })
      uploadStream.on("error", (error: any) => {
        reject(error)
      })
      uploadStream.end(chunkData)
    })
  }

  async getUploadProgress(sessionId: string): Promise<{ progress: number; isComplete: boolean }> {
    const collection = await this.getSessionCollection()
    const session = await collection.findOne({ sessionId })

    if (!session) {
      throw new Error("Upload session not found")
    }

    const progress = (session.uploadedChunks.length / session.totalChunks) * 100
    const isComplete = session.uploadedChunks.length === session.totalChunks

    return { progress, isComplete }
  }

  async completeUpload(sessionId: string): Promise<string> {
    const collection = await this.getSessionCollection()
    const bucket = await this.getGridFSBucket()

    const session = await collection.findOne({ sessionId })
    if (!session) {
      throw new Error("Upload session not found")
    }

    if (session.uploadedChunks.length !== session.totalChunks) {
      throw new Error("Upload not complete")
    }

    // Combine all chunks into final file
    const finalFilename = `${session.roomCode}_${session.filename}`
    const uploadStream = bucket.openUploadStream(finalFilename, {
      metadata: {
        roomCode: session.roomCode,
        originalName: session.filename,
        totalSize: session.totalSize,
        uploadedAt: new Date(),
        isStreamable: true,
      },
    })

    // Stream all chunks in order
    for (let i = 0; i < session.totalChunks; i++) {
      const chunkFilename = `${sessionId}_chunk_${i}`
      const downloadStream = bucket.openDownloadStreamByName(chunkFilename)

      await new Promise((resolve, reject) => {
        downloadStream.on("data", (chunk) => {
          uploadStream.write(chunk)
        })
        downloadStream.on("end", resolve)
        downloadStream.on("error", reject)
      })

      // Delete chunk after combining
      try {
        const chunkFiles = await bucket.find({ filename: chunkFilename }).toArray()
        for (const file of chunkFiles) {
          await bucket.delete(file._id)
        }
      } catch (error) {
        console.error(`Error deleting chunk ${i}:`, error)
      }
    }

    uploadStream.end()

    // Clean up session
    await collection.deleteOne({ sessionId })

    return uploadStream.id.toString()
  }

  async getStreamingUrl(
    roomCode: string,
    range?: string,
  ): Promise<{ stream: NodeJS.ReadableStream; size: number; range?: { start: number; end: number; total: number } }> {
    const bucket = await this.getGridFSBucket()

    const files = await bucket.find({ "metadata.roomCode": roomCode, "metadata.isStreamable": true }).toArray()

    if (files.length === 0) {
      throw new Error("Movie file not found")
    }

    const file = files[0]
    const totalSize = file.length

    if (range) {
      // Parse range header (e.g., "bytes=0-1023")
      const parts = range.replace(/bytes=/, "").split("-")
      const start = Number.parseInt(parts[0], 10)
      const end = parts[1] ? Number.parseInt(parts[1], 10) : totalSize - 1

      const chunkSize = end - start + 1

      const stream = bucket.openDownloadStream(file._id, {
        start,
        end: end + 1,
      })

      return {
        stream,
        size: chunkSize,
        range: { start, end, total: totalSize },
      }
    }

    const stream = bucket.openDownloadStream(file._id)
    return { stream, size: totalSize }
  }

  async cleanupExpiredSessions(): Promise<void> {
    const collection = await this.getSessionCollection()
    const bucket = await this.getGridFSBucket()

    const expiredSessions = await collection.find({ expiresAt: { $lt: new Date() } }).toArray()

    for (const session of expiredSessions) {
      // Delete all chunks for this session
      for (let i = 0; i < session.totalChunks; i++) {
        const chunkFilename = `${session.sessionId}_chunk_${i}`
        try {
          const chunkFiles = await bucket.find({ filename: chunkFilename }).toArray()
          for (const file of chunkFiles) {
            await bucket.delete(file._id)
          }
        } catch (error) {
          console.error(`Error deleting expired chunk ${i}:`, error)
        }
      }
    }

    // Delete expired session records
    await collection.deleteMany({ expiresAt: { $lt: new Date() } })
  }
}