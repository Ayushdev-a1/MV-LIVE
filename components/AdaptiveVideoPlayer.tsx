"use client"

import type React from "react"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, Volume2, VolumeX, Maximize, Settings } from "lucide-react"

interface AdaptiveVideoPlayerProps {
  roomCode: string
  onTimeUpdate: (currentTime: number) => void
  onPlay: () => void
  onPause: () => void
  onSeek: (time: number) => void
  currentTime: number
  isPlaying: boolean
}

export function AdaptiveVideoPlayer({
  roomCode,
  onTimeUpdate,
  onPlay,
  onPause,
  onSeek,
  currentTime,
  isPlaying,
}: AdaptiveVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [quality, setQuality] = useState("auto")

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
    }

    const handleTimeUpdate = () => {
      onTimeUpdate(video.currentTime)
    }

    const handleWaiting = () => {
      setIsBuffering(true)
    }

    const handleCanPlay = () => {
      setIsBuffering(false)
    }

    const handlePlay = () => {
      onPlay()
    }

    const handlePause = () => {
      onPause()
    }

    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("waiting", handleWaiting)
    video.addEventListener("canplay", handleCanPlay)
    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("waiting", handleWaiting)
      video.removeEventListener("canplay", handleCanPlay)
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
    }
  }, [onTimeUpdate, onPlay, onPause])

  // Sync external state changes
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (Math.abs(video.currentTime - currentTime) > 1) {
      video.currentTime = currentTime
    }

    if (isPlaying && video.paused) {
      video.play()
    } else if (!isPlaying && !video.paused) {
      video.pause()
    }
  }, [currentTime, isPlaying])

  const handlePlayPause = () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }

  const handleVolumeChange = (newVolume: number) => {
    const video = videoRef.current
    if (!video) return

    video.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const handleMute = () => {
    const video = videoRef.current
    if (!video) return

    if (isMuted) {
      video.volume = volume
      setIsMuted(false)
    } else {
      video.volume = 0
      setIsMuted(true)
    }
  }

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    if (!video || !duration) return

    const rect = event.currentTarget.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const newTime = (clickX / rect.width) * duration

    video.currentTime = newTime
    onSeek(newTime)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="relative w-full h-full bg-black">
      <video ref={videoRef} className="w-full h-full object-contain" preload="metadata" crossOrigin="anonymous">
        <source src={`/api/rooms/${roomCode}/stream`} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Buffering indicator */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      )}

      {/* Controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        {/* Progress bar */}
        <div className="mb-4">
          <div className="w-full h-2 bg-gray-600 rounded-full cursor-pointer" onClick={handleSeek}>
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button onClick={handlePlayPause} size="sm" className="bg-purple-600 hover:bg-purple-700">
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>

            <div className="flex items-center space-x-2">
              <Button onClick={handleMute} variant="ghost" size="sm" className="text-white hover:text-purple-300">
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(Number.parseFloat(e.target.value))}
                className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="bg-black/50 text-white text-sm rounded px-2 py-1 border border-gray-600"
            >
              <option value="auto">Auto</option>
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
              <option value="480p">480p</option>
            </select>

            <Button variant="ghost" size="sm" className="text-white hover:text-purple-300">
              <Settings className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="sm" className="text-white hover:text-purple-300">
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
