"use client"

import { useSocket } from "@/hooks/useSocket"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff, AlertCircle } from "lucide-react"

export function SocketStatus() {
  const { isConnected, connectionError } = useSocket()

  if (connectionError) {
    return (
      <Badge variant="destructive" className="flex items-center space-x-1">
        <AlertCircle className="h-3 w-3" />
        <span>Connection Error</span>
      </Badge>
    )
  }

  return (
    <Badge variant={isConnected ? "default" : "secondary"} className="flex items-center space-x-1">
      {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      <span>{isConnected ? "Connected" : "Connecting..."}</span>
    </Badge>
  )
}
