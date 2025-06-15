export interface Room {
  _id?: string
  roomCode: string
  name: string
  description?: string
  hostId: string
  participants: Participant[]
  movieFile?: MovieFile
  isActive: boolean
  isPrivate: boolean
  maxParticipants: number
  currentTime: number
  isPlaying: boolean
  createdAt: Date
  endedAt?: Date
}

export interface Participant {
  userId: string
  name: string
  picture: string
  joinedAt: Date
  isHost: boolean
}

export interface MovieFile {
  filename: string
  originalName: string
  size: number
  mimetype: string
  uploadedAt: Date
  chunks: string[] // GridFS chunk IDs
}
