"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { Socket } from "socket.io-client"

interface UseWebRTCProps {
  socket: Socket | null
  roomId: string
  userId: string
}

export function useWebRTC({ socket, roomId, userId }: UseWebRTCProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())

  const configuration: RTCConfiguration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
  }

  // Initialize local media stream
  const initializeMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      setLocalStream(stream)

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      return stream
    } catch (error) {
      console.error("Error accessing media devices:", error)
      return null
    }
  }, [])

  // Create peer connection
  const createPeerConnection = useCallback(
    (remoteUserId: string) => {
      const peerConnection = new RTCPeerConnection(configuration)

      // Add local stream tracks
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStream)
        })
      }

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        const [remoteStream] = event.streams
        setRemoteStreams((prev) => new Map(prev.set(remoteUserId, remoteStream)))
      }

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("webrtc-ice-candidate", roomId, event.candidate, remoteUserId)
        }
      }

      peerConnections.current.set(remoteUserId, peerConnection)
      return peerConnection
    },
    [localStream, socket, roomId],
  )

  // Create and send offer
  const createOffer = useCallback(
    async (remoteUserId: string) => {
      const peerConnection = createPeerConnection(remoteUserId)

      try {
        const offer = await peerConnection.createOffer()
        await peerConnection.setLocalDescription(offer)

        if (socket) {
          socket.emit("webrtc-offer", roomId, offer, remoteUserId)
        }
      } catch (error) {
        console.error("Error creating offer:", error)
      }
    },
    [createPeerConnection, socket, roomId],
  )

  // Handle received offer
  const handleOffer = useCallback(
    async (offer: RTCSessionDescriptionInit, remoteUserId: string) => {
      const peerConnection = createPeerConnection(remoteUserId)

      try {
        await peerConnection.setRemoteDescription(offer)
        const answer = await peerConnection.createAnswer()
        await peerConnection.setLocalDescription(answer)

        if (socket) {
          socket.emit("webrtc-answer", roomId, answer, remoteUserId)
        }
      } catch (error) {
        console.error("Error handling offer:", error)
      }
    },
    [createPeerConnection, socket, roomId],
  )

  // Handle received answer
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit, remoteUserId: string) => {
    const peerConnection = peerConnections.current.get(remoteUserId)

    if (peerConnection) {
      try {
        await peerConnection.setRemoteDescription(answer)
      } catch (error) {
        console.error("Error handling answer:", error)
      }
    }
  }, [])

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit, remoteUserId: string) => {
    const peerConnection = peerConnections.current.get(remoteUserId)

    if (peerConnection) {
      try {
        await peerConnection.addIceCandidate(candidate)
      } catch (error) {
        console.error("Error handling ICE candidate:", error)
      }
    }
  }, [])

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoEnabled(videoTrack.enabled)
      }
    }
  }, [localStream])

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioEnabled(audioTrack.enabled)
      }
    }
  }, [localStream])

  // Socket event listeners
  useEffect(() => {
    if (!socket) return

    socket.on("user-joined", (newUserId: string) => {
      if (newUserId !== userId) {
        createOffer(newUserId)
      }
    })

    socket.on("webrtc-offer", handleOffer)
    socket.on("webrtc-answer", handleAnswer)
    socket.on("webrtc-ice-candidate", handleIceCandidate)

    socket.on("user-left", (leftUserId: string) => {
      const peerConnection = peerConnections.current.get(leftUserId)
      if (peerConnection) {
        peerConnection.close()
        peerConnections.current.delete(leftUserId)
      }
      setRemoteStreams((prev) => {
        const newMap = new Map(prev)
        newMap.delete(leftUserId)
        return newMap
      })
    })

    return () => {
      socket.off("user-joined")
      socket.off("webrtc-offer")
      socket.off("webrtc-answer")
      socket.off("webrtc-ice-candidate")
      socket.off("user-left")
    }
  }, [socket, userId, createOffer, handleOffer, handleAnswer, handleIceCandidate])

  // Initialize media on mount
  useEffect(() => {
    initializeMedia()

    return () => {
      // Cleanup
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop())
      }
      peerConnections.current.forEach((pc) => pc.close())
    }
  }, [initializeMedia])

  return {
    localStream,
    remoteStreams,
    localVideoRef,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
    initializeMedia,
  }
}
