import { getDatabase } from "@/lib/mongodb"
import type { User, UserStats } from "@/lib/models/User"
import { ObjectId } from "mongodb"

// Ensure User type defines _id as string
interface UserWithStringId extends Omit<User, '_id'> {
  _id: string
}

export class UserService {
  private async getCollection() {
    const db = await getDatabase()
    return db.collection<User>("users")
  }

  async createOrUpdateUser(userData: Partial<User>): Promise<UserWithStringId> {
    const collection = await this.getCollection()

    // Check if user exists by googleId or email
    let existingUser = null
    if (userData.googleId) {
      existingUser = await collection.findOne({ googleId: userData.googleId })
    } else if (userData.email) {
      existingUser = await collection.findOne({ email: userData.email })
    }

    if (existingUser) {
      // Update existing user
      const updatedUser = await collection.findOneAndUpdate(
        { _id: existingUser._id },
        {
          $set: {
            ...userData,
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after" }
      )
      return { ...updatedUser!, _id: updatedUser!._id.toString() }
    } else {
      // Create new user
      const newUser: Omit<User, "_id"> = {
        googleId: userData.googleId!,
        email: userData.email!,
        name: userData.name!,
        picture: userData.picture || "/placeholder.svg",
        roomsCreated: 0,
        roomsJoined: 0,
        moviesWatched: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = await collection.insertOne(newUser as any)
      return { ...newUser, _id: result.insertedId.toString() }
    }
  }

  async getUserById(userId: string): Promise<UserWithStringId | null> {
    const collection = await this.getCollection()
    try {
      // Validate ObjectId format
      if (!ObjectId.isValid(userId)) {
        return null
      }
      
      const user = await collection.findOne({ _id: userId })
      if (user) {
        return { ...user, _id: user._id.toString() }
      }
      return null
    } catch (error) {
      console.error("Error getting user by ID:", error)
      return null
    }
  }

  async getUserByGoogleId(googleId: string): Promise<UserWithStringId | null> {
    const collection = await this.getCollection()
    const user = await collection.findOne({ googleId })
    if (user) {
      return { ...user, _id: user._id.toString() }
    }
    return null
  }

  async getUserByEmail(email: string): Promise<UserWithStringId | null> {
    const collection = await this.getCollection()
    const user = await collection.findOne({ email })
    if (user) {
      return { ...user, _id: user._id.toString() }
    }
    return null
  }

  async incrementRoomsCreated(userId: string): Promise<void> {
    const collection = await this.getCollection()
    if (!ObjectId.isValid(userId)) {
      throw new Error("Invalid userId")
    }
    
    await collection.updateOne(
      { _id: userId },
      {
        $inc: { roomsCreated: 1 },
        $set: { updatedAt: new Date() },
      }
    )
  }

  async incrementRoomsJoined(userId: string): Promise<void> {
    const collection = await this.getCollection()
    if (!ObjectId.isValid(userId)) {
      throw new Error("Invalid userId")
    }
    
    await collection.updateOne(
      { _id: userId },
      {
        $inc: { roomsJoined: 1 },
        $set: { updatedAt: new Date() },
      }
    )
  }

  async addMovieWatched(userId: string, movieName: string): Promise<void> {
    const collection = await this.getCollection()
    if (!ObjectId.isValid(userId)) {
      throw new Error("Invalid userId")
    }
    
    await collection.updateOne(
      { _id: userId },
      {
        $addToSet: { moviesWatched: movieName },
        $set: { updatedAt: new Date() },
      }
    )
  }

  async getUserStats(userId: string): Promise<UserStats | null> {
    const collection = await this.getCollection()
    if (!ObjectId.isValid(userId)) {
      return null
    }
    
    const user = await collection.findOne({ _id: userId })
    if (!user) return null

    return {
      roomsCreated: user.roomsCreated,
      roomsJoined: user.roomsJoined,
      moviesWatched: user.moviesWatched.length,
      totalWatchTime: 0, // Can be calculated from room history
    }
  }
}