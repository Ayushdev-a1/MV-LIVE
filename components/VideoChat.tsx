"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react"
import { useWebRTC } from "@/hooks/useWebRTC"
import type { Socket } from "socket.io-client"

interface VideoChatProps {
  socket: Socket | null
  roomId: string
  userId: string
  participants: any[]
}

export function VideoChat({ socket, roomId, userId, participants }: VideoChatProps) {
  const [isCallActive, setIsCallActive] = useState(false)
  const { localStream, remoteStreams, localVideoRef, isVideoEnabled, isAudioEnabled, toggleVideo, toggleAudio } =
    useWebRTC({
      socket,
      roomId,
      userId,
    })

  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())

  // Update remote video elements
  useEffect(() => {
    remoteStreams.forEach((stream, userId) => {
      const videoElement = remoteVideoRefs.current.get(userId)
      if (videoElement && videoElement.srcObject !== stream) {
        videoElement.srcObject = stream
      }
    })
  }, [remoteStreams])

  const startCall = () => {
    setIsCallActive(true)
    if (socket) {
      socket.emit("start-video-call", roomId, userId)
    }
  }

  const endCall = () => {
    setIsCallActive(false)
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
    }
    if (socket) {
      socket.emit("end-video-call", roomId, userId)
    }
  }

  return (
    <div className="space-y-4">
      {/* Call Controls */}
      <div className="flex items-center justify-center space-x-2">
        {!isCallActive ? (
          <Button onClick={startCall} className="bg-green-600 hover:bg-green-700">
            <Video className="h-4 w-4 mr-2" />
            Start Video Call
          </Button>
        ) : (
          <>
            <Button
              onClick={toggleAudio}
              variant={isAudioEnabled ? "default" : "destructive"}
              size="sm"
              className={isAudioEnabled ? "bg-purple-600 hover:bg-purple-700" : ""}
            >
              {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
            <Button
              onClick={toggleVideo}
              variant={isVideoEnabled ? "default" : "destructive"}
              size="sm"
              className={isVideoEnabled ? "bg-purple-600 hover:bg-purple-700" : ""}
            >
              {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </Button>
            <Button onClick={endCall} variant="destructive" size="sm">
              <PhoneOff className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Video Grid */}
      {isCallActive && (
        <div className="grid grid-cols-2 gap-2">
          {/* Local video */}
          <div className="aspect-video bg-gray-800 rounded-lg relative overflow-hidden">
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded">You</div>
            {!isVideoEnabled && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <Avatar className="h-16 w-16">
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback className="bg-purple-600 text-white">You</AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>

          {/* Remote videos */}
          {Array.from(remoteStreams.entries())
            .slice(0, 3)
            .map(([remoteUserId, stream]) => {
              const participant = participants.find((p) => p.userId === remoteUserId)
              return (
                <div key={remoteUserId} className="aspect-video bg-gray-800 rounded-lg relative overflow-hidden">
                  <video
                    ref={(el) => {
                      if (el) {
                        remoteVideoRefs.current.set(remoteUserId, el)
                        el.srcObject = stream
                      }
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded">
                    {participant?.name?.split(" ")[0] || "User"}
                  </div>
                </div>
              )
            })}

          {/* Empty slots for more participants */}
          {Array.from({ length: Math.max(0, 4 - remoteStreams.size - 1) }).map((_, index) => (
            <div
              key={`empty-${index}`}
              className="aspect-video bg-gray-700 rounded-lg flex items-center justify-center"
            >
              <div className="text-gray-400 text-sm">Waiting for participants...</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
