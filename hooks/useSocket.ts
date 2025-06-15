"use client"

import { useEffect, useRef, useState } from "react"
import { io, type Socket } from "socket.io-client"

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  useEffect(() => {
    // Initialize socket connection with fallback options
    const socketUrl =
      process.env.NODE_ENV === "production" ? window.location.origin.replace(/^http/, "ws") : "http://localhost:3001"

    socketRef.current = io(socketUrl, {
      transports: ["websocket", "polling"],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    const socket = socketRef.current

    // Connection event handlers
    socket.on("connect", () => {
      console.log("Socket connected:", socket.id)
      setIsConnected(true)
      setConnectionError(null)
    })

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason)
      setIsConnected(false)
    })

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error)
      setConnectionError(error.message)
      setIsConnected(false)
    })

    socket.on("reconnect", (attemptNumber) => {
      console.log("Socket reconnected after", attemptNumber, "attempts")
      setIsConnected(true)
      setConnectionError(null)
    })

    socket.on("reconnect_error", (error) => {
      console.error("Socket reconnection error:", error)
      setConnectionError(error.message)
    })

    socket.on("reconnect_failed", () => {
      console.error("Socket reconnection failed")
      setConnectionError("Failed to reconnect to server")
    })

    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [])

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
  }
}
