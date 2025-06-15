"use client"

// Simple in-memory user storage for development (replace with MongoDB in production)
const users: any[] = []
let userCounter = 1

export interface User {
  _id: string
  googleId?: string
  email: string
  name: string
  picture: string
  accessToken?: string
  loginMethod: "google" | "demo"
  loginTime: string
  isAuthenticated: boolean
  roomsCreated: number
  roomsJoined: number
  moviesWatched: string[]
  createdAt: string
  updatedAt: string
}

export async function createOrUpdateUser(userData: Partial<User>): Promise<User> {
  console.log("💾 Creating/updating user:", userData)

  // Check if user already exists
  let existingUser = users.find(
    (u) => (userData.googleId && u.googleId === userData.googleId) || (userData.email && u.email === userData.email),
  )

  if (existingUser) {
    // Update existing user
    console.log("🔄 Updating existing user:", existingUser._id)

    existingUser = {
      ...existingUser,
      ...userData,
      updatedAt: new Date().toISOString(),
    }

    // Update in array
    const index = users.findIndex((u) => u._id === existingUser._id)
    users[index] = existingUser

    console.log("✅ User updated:", existingUser)
    return existingUser
  } else {
    // Create new user
    console.log("➕ Creating new user")

    const newUser: User = {
      _id: `user_${userCounter++}`,
      googleId: userData.googleId,
      email: userData.email!,
      name: userData.name!,
      picture: userData.picture || "/placeholder.svg",
      accessToken: userData.accessToken,
      loginMethod: userData.loginMethod || "demo",
      loginTime: userData.loginTime || new Date().toISOString(),
      isAuthenticated: true,
      roomsCreated: 0,
      roomsJoined: 0,
      moviesWatched: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    users.push(newUser)
    console.log("✅ User created:", newUser)
    return newUser
  }
}

export async function getUserById(userId: string): Promise<User | null> {
  const user = users.find((u) => u._id === userId)
  console.log("🔍 Get user by ID:", userId, user ? "Found" : "Not found")
  return user || null
}

export async function getUserByGoogleId(googleId: string): Promise<User | null> {
  const user = users.find((u) => u.googleId === googleId)
  console.log("🔍 Get user by Google ID:", googleId, user ? "Found" : "Not found")
  return user || null
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const user = users.find((u) => u.email === email)
  console.log("🔍 Get user by email:", email, user ? "Found" : "Not found")
  return user || null
}

export function getAllUsers(): User[] {
  console.log("📋 Get all users:", users.length)
  return users
}
