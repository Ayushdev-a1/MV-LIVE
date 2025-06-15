export interface User {
  _id?: string
  googleId: string
  email: string
  name: string
  picture: string
  roomsCreated: number
  roomsJoined: number
  moviesWatched: string[]
  createdAt: Date
  updatedAt: Date
}

export interface UserStats {
  roomsCreated: number
  roomsJoined: number
  moviesWatched: number
  totalWatchTime: number
}
