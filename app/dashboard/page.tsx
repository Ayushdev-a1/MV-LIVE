"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Users, Clock, Play, Search, Hash, Trophy, Calendar, AlertCircle, Film } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { Navbar } from "@/components/Navbar"
import Link from "next/link"

export default function Dashboard() {
  const [roomCode, setRoomCode] = useState("")
  const [userStats, setUserStats] = useState<any>(null)
  const [recentRooms, setRecentRooms] = useState<any[]>([])
  const [error, setError] = useState("")

  const { user, isLoading, isAuthenticated, refreshAuth } = useAuth()
 
  // Refresh auth state when component mounts
  useEffect(() => {
    console.log("🔄 Dashboard mounted, refreshing auth...")
    refreshAuth()
  }, [refreshAuth])

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log("❌ User not authenticated, redirecting to auth...")
      window.location.href = "/auth"
    }
  }, [isLoading, isAuthenticated])

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user || !isAuthenticated) return

      try {
        console.log("📊 Loading dashboard data for user:", user.name)

        // Set stats from user data
        setUserStats({
          moviesWatched: user.moviesWatched?.length || 0,
          roomsCreated: user.roomsCreated || 0,
          roomsJoined: user.roomsJoined || 0,
          totalWatchTime: 0,
        })

        // Load recent rooms
        try {
          const roomsResponse = await fetch("/api/rooms")
          if (roomsResponse.ok) {
            const roomsData = await roomsResponse.json()
            setRecentRooms(roomsData)
            console.log("✅ Rooms loaded:", roomsData.length)
          } else {
            console.log("⚠️ Could not load rooms:", roomsResponse.status)
          }
        } catch (error) {
          console.log("⚠️ Could not load rooms:", error)
        }
      } catch (error) {
        console.error("💥 Error loading dashboard data:", error)
        setError("Error loading dashboard. Please try refreshing.")
      }
    }

    loadDashboardData()
  }, [user, isAuthenticated])

  const handleJoinRoom = () => {
    if (roomCode.trim()) {
      window.location.href = `/room/${roomCode.trim()}`
    } else {
      alert("Please enter a room code")
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading dashboard...</div>
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
            <p className="text-gray-300 mb-4">Please sign in to access your dashboard</p>
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
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Welcome back, {user?.name?.split(" ")[0]}!</h1>
          <p className="text-gray-300 text-lg">Ready for your next movie night?</p>
          <p className="text-purple-300 text-sm mt-2">{user.email}</p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-500 bg-red-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        {/* User Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-black/40 border-purple-800/30 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Trophy className="h-5 w-5 text-purple-400 mr-2" />
                <div className="text-2xl font-bold text-purple-400">{userStats?.moviesWatched || 0}</div>
              </div>
              <div className="text-sm text-gray-300">Movies Watched</div>
            </CardContent>
          </Card>
          <Card className="bg-black/40 border-purple-800/30 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Plus className="h-5 w-5 text-purple-400 mr-2" />
                <div className="text-2xl font-bold text-purple-400">{userStats?.roomsCreated || 0}</div>
              </div>
              <div className="text-sm text-gray-300">Rooms Created</div>
            </CardContent>
          </Card>
          <Card className="bg-black/40 border-purple-800/30 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-purple-400 mr-2" />
                <div className="text-2xl font-bold text-purple-400">{userStats?.roomsJoined || 0}</div>
              </div>
              <div className="text-sm text-gray-300">Rooms Joined</div>
            </CardContent>
          </Card>
          <Card className="bg-black/40 border-purple-800/30 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Calendar className="h-5 w-5 text-purple-400 mr-2" />
                <div className="text-2xl font-bold text-purple-400">{new Date(user.createdAt).getFullYear()}</div>
              </div>
              <div className="text-sm text-gray-300">Member Since</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-black/40 border-purple-800/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Plus className="h-5 w-5 mr-2 text-purple-400" />
                Create New Room
              </CardTitle>
              <CardDescription className="text-gray-300">Start a new movie night with your friends</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/create-room">
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Room
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-purple-800/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Hash className="h-5 w-5 mr-2 text-purple-400" />
                Join Room
              </CardTitle>
              <CardDescription className="text-gray-300">Enter a room code to join your friends</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleJoinRoom()}
                  className="bg-black/20 border-purple-700/50 text-white placeholder:text-gray-400"
                />
                <Button onClick={handleJoinRoom} className="bg-purple-600 hover:bg-purple-700 text-white">
                  Join
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Rooms */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Recent Rooms</h2>
            <Button variant="ghost" className="text-purple-300 hover:text-white">
              <Search className="h-4 w-4 mr-2" />
              View All
            </Button>
          </div>

          {recentRooms.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {recentRooms.slice(0, 6).map((room) => (
                <Card
                  key={room._id}
                  className="bg-black/40 border-purple-800/30 backdrop-blur-sm hover:border-purple-600/50 transition-colors cursor-pointer"
                >
                  <CardContent className="p-0">
                    <div className="aspect-video bg-gradient-to-br from-purple-800/30 to-pink-800/30 rounded-t-lg flex items-center justify-center">
                      <Play className="h-12 w-12 text-white/70" />
                    </div>
                    <div className="p-4">
                      <h3 className="text-white font-semibold mb-2">{room.name}</h3>
                      <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {room.participants?.length || 0} participants
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {new Date(room.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      {room.isActive ? (
                        <Button
                          onClick={() => (window.location.href = `/room/${room.roomCode}`)}
                          className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          Join Room
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="w-full justify-center bg-gray-600/20 text-gray-400">
                          Room Ended
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-black/40 border-purple-800/30 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <Film className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                <h3 className="text-white text-lg font-semibold mb-2">No rooms yet</h3>
                <p className="text-gray-300 mb-4">Create your first room to start watching movies with friends!</p>
                <Link href="/create-room">
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Room
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Debug Info */}
        <div className="text-xs text-gray-500 space-y-1">
          <div>Debug Info:</div>
          <div>User: {user ? `✅ ${user.name} (${user.loginMethod})` : "❌ Not authenticated"}</div>
          <div>Auth Status: {isAuthenticated ? "✅ Authenticated" : "❌ Not authenticated"}</div>
          <div>User ID: {user?._id || "None"}</div>
          <div>Database ID: {user?._id || "None"}</div>
          <div>Rooms: {recentRooms.length} loaded</div>
          <div>Stats: {userStats ? "✅ Loaded" : "❌ Not loaded"}</div>
        </div>
      </div>
    </div>
  )
}
