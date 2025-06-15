"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, X, AlertCircle, CheckCircle } from "lucide-react"

interface ChunkedUploaderProps {
  roomCode: string
  onUploadComplete: (fileId: string) => void
  onUploadError: (error: string) => void
}

export function ChunkedUploader({ roomCode, onUploadComplete, onUploadError }: ChunkedUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadSpeed, setUploadSpeed] = useState(0)
  const [eta, setEta] = useState(0)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadSessionRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const CHUNK_SIZE = 1 * 1024 * 1024 // 1MB chunks for testing

  // Simple upload for development (no chunking)
  const uploadFile = useCallback(
    async (file: File) => {
      if (!file) return

      console.log("🎬 Starting file upload:", file.name)
      setIsUploading(true)
      setProgress(0)
      setCurrentFile(file)
      setError("")
      setSuccess("")

      try {
        // Check authentication
        const userSession = document.cookie
          .split("; ")
          .find((row) => row.startsWith("user-session="))
          ?.split("=")[1]

        if (!userSession) {
          throw new Error("Please sign in to upload movies")
        }

        console.log("✅ User authenticated for upload")

        // Create FormData for simple upload
        const formData = new FormData()
        formData.append("movie", file)

        console.log("📤 Uploading file...")

        // Simulate progress for demo
        const progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval)
              return prev
            }
            return prev + 10
          })
        }, 500)

        const response = await fetch(`/api/rooms/${roomCode}/upload`, {
          method: "POST",
          body: formData,
        })

        clearInterval(progressInterval)

        console.log("📥 Upload response:", response.status)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Upload failed")
        }

        const result = await response.json()
        console.log("✅ Upload successful:", result)

        setProgress(100)
        setSuccess("Movie uploaded successfully!")
        onUploadComplete(result.fileId || "demo-file-id")
      } catch (error: any) {
        console.error("💥 Upload error:", error)
        setError(error.message)
        onUploadError(error.message)
      } finally {
        setIsUploading(false)
        setIsPaused(false)
        setTimeout(() => {
          setProgress(0)
          setCurrentFile(null)
          setError("")
          setSuccess("")
        }, 3000)
      }
    },
    [roomCode, onUploadComplete, onUploadError],
  )

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      console.log("📁 File selected:", file.name, file.size, file.type)

      // Validate file
      const maxSize = 100 * 1024 * 1024 // 100MB for testing
      if (file.size > maxSize) {
        setError("File too large. Maximum size is 100MB for testing")
        return
      }

      const allowedTypes = ["video/mp4", "video/avi", "video/mkv", "video/mov", "video/wmv", "video/webm"]
      if (!allowedTypes.includes(file.type)) {
        setError("Invalid file type. Only video files are allowed")
        return
      }

      uploadFile(file)
    }
  }

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsUploading(false)
    setProgress(0)
    setCurrentFile(null)
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="space-y-4">
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

      {!isUploading ? (
        <div className="text-center">
          <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
          <Button onClick={() => fileInputRef.current?.click()} className="bg-purple-600 hover:bg-purple-700">
            <Upload className="h-4 w-4 mr-2" />
            Upload Movie (up to 100MB)
          </Button>
          <p className="text-gray-400 text-sm mt-2">
            Supports: MP4, AVI, MKV, MOV, WMV, WebM
            <br />
            For testing: Maximum 100MB file size
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-white font-semibold mb-2">Uploading: {currentFile?.name}</h3>
            <div className="text-gray-300 text-sm space-y-1">
              <div>Size: {formatBytes(currentFile?.size || 0)}</div>
              <div>Type: {currentFile?.type}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-300">
              <span>Progress</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>

          <div className="flex justify-center space-x-2">
            <Button onClick={cancelUpload} variant="destructive" size="sm">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Debug Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <div>Debug Info:</div>
        <div>Room Code: {roomCode}</div>
        <div>Upload Status: {isUploading ? "Uploading" : "Ready"}</div>
        <div>File: {currentFile ? currentFile.name : "None selected"}</div>
      </div>
    </div>
  )
}
