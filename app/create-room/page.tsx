"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Film, Lock, Globe, AlertCircle, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/hooks/useAuth"
import { Navbar } from "@/components/Navbar"
import Link from "next/link"

export default function CreateRoom() {
  const [roomName, setRoomName] = useState("")
  const [description, setDescription] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [maxParticipants, setMaxParticipants] = useState("10")
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const { user, isLoading, isAuthenticated, refreshAuth } = useAuth()

  // Refresh auth state when component mounts
  useEffect(() => {
    console.log("🔄 Create room page mounted, refreshing auth...")
    refreshAuth()
  }, [refreshAuth])

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log("❌ User not authenticated, redirecting to auth...")
      window.location.href = "/auth"
    }
  }, [isLoading, isAuthenticated])

  const handleCreateRoom = async () => {
    console.log("🎬 Creating room...")
    setError("")
    setSuccess("")
    setIsCreating(true)

    try {
      // Double-check authentication
      if (!user || !isAuthenticated) {
        setError("Please sign in to create a room")
        window.location.href = "/auth"
        return
      }

      // Validate inputs
      if (!roomName.trim()) {
        setError("Please enter a room name")
        return
      }

      console.log("📝 Room data:", {
        name: roomName.trim(),
        description: description.trim(),
        isPrivate,
        maxParticipants: Number.parseInt(maxParticipants),
        user: { id: user._id, name: user.name, email: user.email },
      })

      const requestBody = {
        name: roomName.trim(),
        description: description.trim(),
        isPrivate: isPrivate,
        maxParticipants: Number.parseInt(maxParticipants),
      }

      console.log("📤 Sending room creation request...")

      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      console.log("📥 Response status:", response.status)

      const responseData = await response.json()
      console.log("📥 Response data:", responseData)

      if (response.ok) {
        console.log("✅ Room created successfully:", responseData.roomCode)
        setSuccess(`Room "${responseData.name}" created successfully!`)

        // Redirect to the created room after short delay
        setTimeout(() => {
          window.location.href = `/room/${responseData.roomCode}`
        }, 1500)
      } else {
        console.error("❌ Room creation failed:", responseData)
        setError(responseData.error || `Failed to create room (${response.status})`)
      }
    } catch (error) {
      console.error("💥 Error creating room:", error)
      setError("Network error. Please check your connection and try again.")
    } finally {
      setIsCreating(false)
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  // Show auth required if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-black/40 border-purple-800/30 backdrop-blur-sm max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-white text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-gray-300 mb-4">Please sign in to create a room</p>
            <Link href="/auth">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <Navbar showBackButton={true} />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Create Movie Room</h1>
          <p className="text-gray-300 text-lg">Set up your perfect movie night experience</p>
          <p className="text-purple-300 text-sm mt-2">
            Signed in as: {user.name} ({user.email})
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-500 bg-red-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert className="mb-6 border-green-500 bg-green-500/10">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-green-400">{success}</AlertDescription>
          </Alert>
        )}

        <Card className="bg-black/40 border-purple-800/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Room Settings</CardTitle>
            <CardDescription className="text-gray-300">Configure your movie room preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Room Name */}
            <div className="space-y-2">
              <Label htmlFor="room-name" className="text-white">
                Room Name *
              </Label>
              <Input
                id="room-name"
                placeholder="e.g., Marvel Movie Marathon"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="bg-black/20 border-purple-700/50 text-white placeholder:text-gray-400"
                disabled={isCreating}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-white">
                Description (Optional)
              </Label>
              <Textarea
                id="description"
                placeholder="Tell your friends what you'll be watching..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-black/20 border-purple-700/50 text-white placeholder:text-gray-400 resize-none"
                rows={3}
                disabled={isCreating}
              />
            </div>

            {/* Privacy Settings */}
            <div className="space-y-4">
              <Label className="text-white">Privacy Settings</Label>
              <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-purple-700/30">
                <div className="flex items-center space-x-3">
                  {isPrivate ? (
                    <Lock className="h-5 w-5 text-purple-400" />
                  ) : (
                    <Globe className="h-5 w-5 text-green-400" />
                  )}
                  <div>
                    <div className="text-white font-medium">{isPrivate ? "Private Room" : "Public Room"}</div>
                    <div className="text-sm text-gray-300">
                      {isPrivate ? "Only people with the room code can join" : "Anyone can discover and join this room"}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                  className="data-[state=checked]:bg-purple-600"
                  disabled={isCreating}
                />
              </div>
            </div>

            {/* Max Participants */}
            <div className="space-y-2">
              <Label className="text-white">Maximum Participants</Label>
              <Select value={maxParticipants} onValueChange={setMaxParticipants} disabled={isCreating}>
                <SelectTrigger className="bg-black/20 border-purple-700/50 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-purple-700/50">
                  <SelectItem value="5">5 people</SelectItem>
                  <SelectItem value="10">10 people</SelectItem>
                  <SelectItem value="15">15 people</SelectItem>
                  <SelectItem value="20">20 people</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Create Button */}
            <div className="pt-4">
              <Button
                onClick={handleCreateRoom}
                disabled={isCreating || !roomName.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Film className="h-5 w-5 mr-2" />
                {isCreating ? "Creating Room..." : "Create Room & Start Watching"}
              </Button>
            </div>

            {/* Debug Info */}
            <div className="text-xs text-gray-500 space-y-1">
              <div>Debug Info:</div>
              <div>User: {user ? `✅ ${user.name} (${user.email})` : "❌ Not authenticated"}</div>
              <div>Auth Status: {isAuthenticated ? "✅ Authenticated" : "❌ Not authenticated"}</div>
              <div>Database ID: {user?._id || "None"}</div>
              <div>Room Name: {roomName.trim() ? "✅ Valid" : "❌ Required"}</div>
              <div>Status: {isCreating ? "Creating..." : "Ready"}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
