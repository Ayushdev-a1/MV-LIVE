"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, MessageCircle, Send, Copy, Share2, Film, AlertCircle, Crown } from "lucide-react"
import { useSocket } from "@/hooks/useSocket"
import { MovieUploader } from "@/components/MovieUploader"
import { SynchronizedVideoPlayer } from "@/components/SynchronizedVideoPlayer"
import { VideoChat } from "@/components/VideoChat"
import { SocketStatus } from "@/components/SocketStatus"
import { Navbar } from "@/components/Navbar"
import { useAuth } from "@/hooks/useAuth"

export default function MovieRoom({ params }: { params: { id: string } }) {
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [room, setRoom] = useState<any>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [message, setMessage] = useState("")
  const [users, setUser] = useState<any>(null)
  const [movieUploaded, setMovieUploaded] = useState(false)
  const [showChat, setShowChat] = useState(true)
  const [showParticipants, setShowParticipants] = useState(true)

  const { socket, isConnected, connectionError } = useSocket()
 const {user} = useAuth();
 console.log("User:", user?._id);
  // Load user and room data
  useEffect(() => {
    const loadUserAndRoom = async () => {
      try {
        // Get user from cookie
        const userSession = document.cookie
          .split("; ")
          .find((row) => row.startsWith("user-session="))
          ?.split("=")[1]

        if (userSession) {
          const userData = JSON.parse(decodeURIComponent(userSession))
          setUser(userData)
        }

        // Get room data
        const getRoomResponse = await fetch(`/api/rooms/${params.id}`)

        if (getRoomResponse.ok) {
          const roomData = await getRoomResponse.json()
          setRoom(roomData)
          setMovieUploaded(!!roomData.movieFile)
          setCurrentTime(roomData.currentTime || 0)
          setIsPlaying(roomData.isPlaying || false)

          // Join room if user exists
          if (userSession) {
            const joinResponse = await fetch(`/api/rooms/${params.id}`, {
              method: "POST",
            })

            if (joinResponse.ok) {
              const updatedRoom = await joinResponse.json()
              setRoom(updatedRoom)
            }
          }
        } else if (getRoomResponse.status === 404) {
          alert("Room not found. Please check the room code.")
          window.location.href = "/dashboard"
        }
      } catch (error) {
        console.error("Error loading room:", error)
        alert("Error loading room. Please try again.")
        window.location.href = "/dashboard"
      }
    }

    loadUserAndRoom()
  }, [params.id])

  // Socket connection and room joining
  useEffect(() => {
    if (socket && user && room && isConnected) {
      socket.emit("join-room", params.id, user?._id)

      // Listen for chat messages
      socket.on("chat-message", (newMessage) => {
        setChatMessages((prev) => [...prev, newMessage])
      })

      // Listen for video controls
      socket.on("video-control", (action, data) => {
        console.log("🎬 Video control received:", action, data)

        if (action === "play") {
          setCurrentTime(data.currentTime || 0)
          setIsPlaying(true)
        } else if (action === "pause") {
          setCurrentTime(data.currentTime || 0)
          setIsPlaying(false)
        } else if (action === "seek") {
          setCurrentTime(data.currentTime)
          setIsPlaying(data.isPlaying)
        } else if (action === "sync-to-live") {
          // Sync to current room state
          setCurrentTime(room.currentTime || 0)
          setIsPlaying(room.isPlaying || false)
        }
      })

      // Listen for video sync when joining
      socket.on("video-sync", (data) => {
        console.log("🔄 Video sync received:", data)
        setCurrentTime(data.currentTime)
        setIsPlaying(data.isPlaying)
      })

      // Listen for room ended
      socket.on("room-ended", () => {
        alert("The room has been ended by the host.")
        window.location.href = "/dashboard"
      })

      return () => {
        socket.emit("leave-room", params.id, user?._id)
        socket.off("chat-message")
        socket.off("video-control")
        socket.off("video-sync")
        socket.off("room-ended")
      }
    }
  }, [socket, user, room, params.id, isConnected])

  const sendMessage = () => {
    if (message.trim() && socket && user && isConnected) {
      const newMessage = {
        id: Date.now(),
        user: user.name,
        message: message.trim(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }

      socket.emit("chat-message", params.id, newMessage)
      setMessage("")
    }
  }

  const handleVideoControl = (action: string, data?: any) => {
    if (socket && isConnected) {
      console.log("🎬 Sending video control:", action, data)
      socket.emit("video-control", params.id, action, data)
    }
  }

  const endRoom = async () => {
    if (confirm("Are you sure you want to end this room? This will delete the movie file.")) {
      try {
        const response = await fetch(`/api/rooms/${params.id}/end`, {
          method: "POST",
        })

        if (response.ok) {
          if (socket && isConnected && user) {
            socket.emit("end-room", params.id, user?._id)
          }
          window.location.href = "/dashboard"
        }
      } catch (error) {
        console.error("Error ending room:", error)
      }
    }
  }

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href)
    alert("Room link copied to clipboard!")
  }

  if (!room || !user) {
    console.log("Loading room data...", user);
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading room...</div>
      </div>
    )
  }

  const isHost = room.hostId === user?._id

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navbar showBackButton={true} />

      {/* Connection Error Alert */}
      {connectionError && (
        <Alert className="m-4 border-red-500 bg-red-500/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-400">
            Connection Error: {connectionError}. Please make sure the Socket.IO server is running.
          </AlertDescription>
        </Alert>
      )}

      <div className="container mx-auto px-4 py-4">
        {/* Room Header */}
        <div className="bg-black/40 backdrop-blur-sm border border-purple-800/30 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Film className="h-6 w-6 text-purple-400" />
              <div>
                <h1 className="text-white font-semibold text-xl">{room.name}</h1>
                <p className="text-gray-400 text-sm">Room: {params.id}</p>
              </div>
              {isHost && (
                <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-300">
                  <Crown className="h-3 w-3 mr-1" />
                  Host
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <SocketStatus />
              <Button onClick={copyRoomLink} variant="ghost" size="sm" className="text-white hover:text-purple-300">
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:text-purple-300">
                <Share2 className="h-4 w-4 mr-2" />
                Invite
              </Button>
              {isHost && (
                <Button onClick={endRoom} variant="destructive" size="sm">
                  End Room
                </Button>
              )}
              <Badge variant="secondary" className="bg-purple-600/20 text-purple-300">
                {room.participants.length} watching
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Main Video Area */}
          <div className="lg:col-span-3 space-y-4">
            {/* Video Player */}
            <div className="bg-black rounded-lg overflow-hidden aspect-video">
              {movieUploaded && room.movieFile ? (
                <SynchronizedVideoPlayer
                  roomCode={params.id}
                  onTimeUpdate={setCurrentTime}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onSeek={setCurrentTime}
                  currentTime={currentTime}
                  isPlaying={isPlaying}
                  onVideoControl={handleVideoControl}
                />
              ) : (
                <div className="h-full bg-gradient-to-br from-purple-900/20 to-pink-900/20 flex items-center justify-center">
                  <div className="text-center max-w-md">
                    {isHost ? (
                      <MovieUploader
                        roomCode={params.id}
                        onUploadComplete={(fileId) => {
                          console.log("Upload completed:", fileId)
                          setMovieUploaded(true)
                          // Reload room data
                          fetch(`/api/rooms/${params.id}`)
                            .then((res) => res.json())
                            .then((roomData) => setRoom(roomData))
                            .catch(console.error)
                        }}
                        onUploadError={(error) => {
                          console.error("Upload error:", error)
                          alert(`Upload failed: ${error}`)
                        }}
                      />
                    ) : (
                      <>
                        <Film className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                        <p className="text-white text-lg">Waiting for host to upload movie...</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Video Chat */}
            <div className="bg-black/40 backdrop-blur-sm border border-purple-800/30 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-4">Video Chat</h3>
              <VideoChat socket={socket} roomId={params.id} userId={user?._id} participants={room.participants} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Participants */}
            <div className="bg-black/40 backdrop-blur-sm border border-purple-800/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Participants ({room.participants.length})
                </h3>
                <Button
                  onClick={() => setShowParticipants(!showParticipants)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  {showParticipants ? "−" : "+"}
                </Button>
              </div>
              {showParticipants && (
                <div className="space-y-2">
                  {room.participants.map((participant: any) => (
                    <div
                      key={participant.userId}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-purple-900/20"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={participant.picture || "/placeholder.svg"} />
                        <AvatarFallback className="bg-purple-600 text-white text-xs">
                          {participant.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="text-white text-sm font-medium">{participant.name}</div>
                        {participant.isHost && (
                          <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-300 text-xs">
                            <Crown className="h-3 w-3 mr-1" />
                            Host
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chat */}
            <div className="bg-black/40 backdrop-blur-sm border border-purple-800/30 rounded-lg flex flex-col h-96">
              <div className="flex items-center justify-between p-4 border-b border-purple-800/30">
                <h3 className="text-white font-semibold flex items-center">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chat
                </h3>
                <Button
                  onClick={() => setShowChat(!showChat)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  {showChat ? "−" : "+"}
                </Button>
              </div>

              {showChat && (
                <>
                  {/* Messages */}
                  <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-purple-300 text-sm font-medium">{msg.user}</span>
                          <span className="text-gray-500 text-xs">{msg.time}</span>
                        </div>
                        <p className="text-gray-300 text-sm">{msg.message}</p>
                      </div>
                    ))}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-purple-800/30">
                    <div className="flex space-x-2">
                      <Input
                        placeholder={isConnected ? "Type a message..." : "Connecting..."}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                        className="bg-black/20 border-purple-700/50 text-white placeholder:text-gray-400"
                        disabled={!isConnected}
                      />
                      <Button
                        onClick={sendMessage}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                        disabled={!isConnected}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
