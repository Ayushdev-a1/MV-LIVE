"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { Navbar } from "@/components/Navbar"

export default function AuthPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const { user, isAuthenticated, createEmailUser } = useAuth()

  // Check for OAuth errors in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const error = urlParams.get("error")

    if (error) {
      switch (error) {
        case "oauth_error":
          setError("Google OAuth authentication failed. Please try again.")
          break
        case "no_code":
          setError("No authorization code received from Google.")
          break
        case "oauth_failed":
          setError("Failed to complete Google authentication. Please try again.")
          break
        default:
          setError("Authentication error occurred.")
      }
    }
  }, [])

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log("✅ User already authenticated, redirecting to dashboard...")
      window.location.href = "/dashboard"
    }
  }, [isAuthenticated, user])

  const handleGoogleLogin = async () => {
    console.log("🔐 Starting Google OAuth...")
    setIsLoading(true)
    setError("")

    try {
      // Redirect to Google OAuth
      window.location.href = "/api/auth/google"
    } catch (error) {
      console.error("💥 Google login failed:", error)
      setError("Failed to start Google authentication")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      if (!email.trim()) {
        setError("Please enter an email address")
        return
      }

      const emailUser = await createEmailUser(email, password)
      setSuccess(`Welcome ${emailUser.name}!`)

      // Redirect to dashboard after short delay
      setTimeout(() => {
        window.location.href = "/dashboard"
      }, 1500)
    } catch (error) {
      console.error("💥 Demo login error:", error)
      setError("Failed to create demo user")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navbar />

      <div className="flex items-center justify-center p-4 pt-20">
        <div className="w-full max-w-md">
          <Card className="bg-black/40 border-purple-800/30 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-white">Welcome Back</CardTitle>
              <CardDescription className="text-gray-300">Sign in to continue watching with friends</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Error Alert */}
              {error && (
                <Alert className="border-red-500 bg-red-500/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-400">{error}</AlertDescription>
                </Alert>
              )}

              {/* Success Alert */}
              {success && (
                <Alert className="border-green-500 bg-green-500/10">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="text-green-400">{success}</AlertDescription>
                </Alert>
              )}

              {/* Google Login */}
              <Button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full bg-white hover:bg-gray-100 text-gray-900 border border-gray-300"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {isLoading ? "Signing in..." : "Continue with Google"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full bg-purple-800/30" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-black/40 px-2 text-gray-400">Or continue with email</span>
                </div>
              </div>

              {/* Email Login Form */}
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-black/20 border-purple-700/50 text-white placeholder:text-gray-400"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-black/20 border-purple-700/50 text-white placeholder:text-gray-400"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <div className="text-center">
                <p className="text-gray-400 text-sm">
                  New to MV-LIVE? Create an account by entering your email above.
                </p>
              </div>

              {/* Debug Info */}
              <div className="text-xs text-gray-500 space-y-1">
                <div>Debug Info:</div>
                <div>Auth Status: {isAuthenticated ? "✅ Authenticated" : "❌ Not authenticated"}</div>
                <div>User: {user ? `✅ ${user.name}` : "❌ None"}</div>
                <div>Loading: {isLoading ? "⏳ Yes" : "✅ No"}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
