import { Readable } from "stream";
import { getDatabase } from "@/lib/mongodb"
import { GridFSBucket, ObjectId } from "mongodb"
import type { Room, Participant, MovieFile } from "@/lib/models/Room"

export class RoomService {
  private async getCollection() {
    const db = await getDatabase()
    return db.collection<Room>("rooms")
  }

  private async getGridFSBucket() {
    const db = await getDatabase()
    return new GridFSBucket(db, { bucketName: "movies" })
  }

  async createRoom(roomData: Partial<Room>): Promise<Room> {
    const collection = await this.getCollection()

    const room: Omit<Room, "_id"> = {
      roomCode: this.generateRoomCode(),
      name: roomData.name!,
      description: roomData.description,
      hostId: roomData.hostId!,
      participants: roomData.participants || [],
      isActive: true,
      isPrivate: roomData.isPrivate || false,
      maxParticipants: roomData.maxParticipants || 10,
      currentTime: 0,
      isPlaying: false,
      createdAt: new Date(),
    }

    const result = await collection.insertOne(room as any)
    return { ...room, _id: result.insertedId.toString() }
  }

  async getRoomByCode(roomCode: string): Promise<Room | null> {
    const collection = await this.getCollection()
    const room = await collection.findOne({ roomCode, isActive: true })
    if (room) {
      return { ...room, _id: room._id.toString() }
    }
    return null
  }

  async getRoomById(roomId: string): Promise<Room | null> {
    const collection = await this.getCollection()
    try {
      const room = await collection.findOne({ _id: roomId })
      if (room) {
        return { ...room, _id: room._id.toString() }
      }
      return null
    } catch (error) {
      console.error("Error getting room by ID:", error)
      return null
    }
  }

  async addParticipant(roomCode: string, participant: Participant): Promise<Room | null> {
    const collection = await this.getCollection()
    if (!participant.userId) {
      throw new Error("Participant must have userId")
    }
    // First check if room exists and has space
    const room = await collection.findOne({ roomCode, isActive: true })
    if (!room) {
      return null
    }

    if (room.participants.length >= room.maxParticipants) {
      return null
    }

    // Check if user is already a participant
    const existingParticipant = room.participants.find((p) => p.userId === participant.userId)
    if (existingParticipant) {
      return { ...room, _id: room._id.toString() } // User already in room
    }

    const updatedRoom = await collection.findOneAndUpdate(
      { roomCode, isActive: true },
      {
        $push: { participants: participant },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: "after" },
    )

    if (updatedRoom) {
      return { ...updatedRoom, _id: updatedRoom._id.toString() }
    }
    return null
  }

  async removeParticipant(roomCode: string, userId: string): Promise<Room | null> {
    const collection = await this.getCollection()

    const room = await collection.findOneAndUpdate(
      { roomCode, isActive: true },
      {
        $pull: { participants: { userId } },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: "after" },
    )

    // If no participants left, end the room
    if (room && room.participants.length === 0) {
      await this.endRoom(roomCode)
    }

    if (room) {
      return { ...room, _id: room._id.toString() }
    }
    return null
  }

  async updateVideoState(roomCode: string, currentTime: number, isPlaying: boolean): Promise<void> {
    const collection = await this.getCollection()
    await collection.updateOne(
      { roomCode, isActive: true },
      {
        $set: {
          currentTime,
          isPlaying,
          updatedAt: new Date(),
        },
      },
    )
  }

  // async uploadMovieFile(roomCode: string, fileBuffer: Buffer, filename: string, mimetype: string): Promise<string> {
  //   const bucket = await this.getGridFSBucket()
  //   const collection = await this.getCollection()

  //   // Upload file to GridFS
  //   const uploadStream = bucket.openUploadStream(filename, {
  //     metadata: {
  //       roomCode,
  //       uploadedAt: new Date(),
  //       mimetype,
  //       originalName: filename,
  //       isStreamable: true,
  //     },
  //   })

  //   return new Promise((resolve, reject) => {
  //     uploadStream.on("error", (error: unknown) => {
  //       reject(error)
  //     })

  //     uploadStream.on("finish", async () => {
  //       const movieFile: MovieFile = {
  //         filename: uploadStream.filename,
  //         originalName: filename,
  //         size: fileBuffer.length,
  //         mimetype,
  //         uploadedAt: new Date(),
  //         chunks: [uploadStream.id.toString()],
  //       }

  //       // Update room with movie file info
  //       await collection.updateOne(
  //         { roomCode },
  //         {
  //           $set: {
  //             movieFile,
  //             updatedAt: new Date(),
  //           },
  //         },
  //       )

  //       resolve(uploadStream.id.toString())
  //     })

  //     uploadStream.end(fileBuffer)
  //   })
  // }
  // Add to RoomService.ts
// In RoomService.ts
async updateMovieFile(roomCode: string, movieFile: MovieFile): Promise<void> {
  const collection = await this.getCollection();
  await collection.updateOne(
    { roomCode, isActive: true },
    {
      $set: {
        movieFile: {
          filename: movieFile.filename,
          originalName: movieFile.originalName,
          size: movieFile.size,
          mimetype: movieFile.mimetype,
          uploadedAt: movieFile.uploadedAt,
          chunks: movieFile.chunks,
        },
        updatedAt: new Date(),
      },
    },
  );
}


async uploadMovieFile(roomCode: string, fileStream: Readable, filename: string, mimetype: string): Promise<string> {
  const bucket = await this.getGridFSBucket();
  const collection = await this.getCollection();

  const uploadStream = bucket.openUploadStream(filename, {
    metadata: {
      roomCode,
      uploadedAt: new Date(),
      mimetype,
      originalName: filename,
      isStreamable: true,
    },
  });

  return new Promise((resolve, reject) => {
    fileStream.pipe(uploadStream);
    uploadStream.on("finish", async () => {
      const movieFile: MovieFile = {
        filename: uploadStream.filename,
        originalName: filename,
        size: uploadStream.length || 0,
        mimetype,
        uploadedAt: new Date(),
        chunks: [uploadStream.id.toString()],
      };

      await collection.updateOne(
        { roomCode },
        {
          $set: {
            movieFile,
            updatedAt: new Date(),
          },
        },
      );

      resolve(uploadStream.id.toString());
    });
    uploadStream.on("error", reject);
    fileStream.on("error", reject);
  });
}
  

  async getMovieStream(roomCode: string): Promise<NodeJS.ReadableStream | null> {
    const bucket = await this.getGridFSBucket()
    const collection = await this.getCollection()

    const room = await collection.findOne({ roomCode, isActive: true })
    if (!room || !room.movieFile) {
      return null
    }

    try {
      const downloadStream = bucket.openDownloadStreamByName(room.movieFile.filename)
      return downloadStream
    } catch (error) {
      console.error("Error getting movie stream:", error)
      return null
    }
  }

  async endRoom(roomCode: string): Promise<void> {
    const collection = await this.getCollection()
    const bucket = await this.getGridFSBucket()

    // Get room info before ending
    const room = await collection.findOne({ roomCode })

    if (room) {
      // Delete movie file from GridFS
      if (room.movieFile) {
        try {
          const files = await bucket.find({ filename: room.movieFile.filename }).toArray()
          for (const file of files) {
            await bucket.delete(file._id)
          }
          console.log(`Deleted movie file: ${room.movieFile.filename}`)
        } catch (error) {
          console.error("Error deleting movie file:", error)
        }
      }

      // Mark room as inactive
      await collection.updateOne(
        { roomCode },
        {
          $set: {
            isActive: false,
            endedAt: new Date(),
            updatedAt: new Date(),
          },
        },
      )
    }
  }

  async getUserRooms(userId: string): Promise<Room[]> {
    const collection = await this.getCollection()
    const rooms = await collection
      .find({
        $or: [{ hostId: userId }, { "participants.userId": userId }],
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray()

    return rooms.map((room) => ({ ...room, _id: room._id.toString() }))
  }

  private generateRoomCode(): string {
    return "ROOM-" + Math.random().toString(36).substr(2, 8).toUpperCase()
  }

  // Cleanup inactive rooms older than 24 hours
  async cleanupOldRooms(): Promise<void> {
    const collection = await this.getCollection()
    const bucket = await this.getGridFSBucket()

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const oldRooms = await collection
      .find({
        isActive: false,
        endedAt: { $lt: oneDayAgo },
      })
      .toArray()

    for (const room of oldRooms) {
      if (room.movieFile) {
        try {
          const files = await bucket.find({ filename: room.movieFile.filename }).toArray()
          for (const file of files) {
            await bucket.delete(file._id)
          }
        } catch (error) {
          console.error("Error deleting old movie file:", error)
        }
      }
    }

    // Delete old room records
    await collection.deleteMany({
      isActive: false,
      endedAt: { $lt: oneDayAgo },
    })

    console.log(`Cleaned up ${oldRooms.length} old rooms`)
  }
}
