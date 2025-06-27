"use client";

import type React from "react";
import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AdaptiveVideoPlayerProps {
  roomCode: string;
  onTimeUpdate: (currentTime: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  currentTime: number;
  isPlaying: boolean;
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const sourceRef = useRef<HTMLSourceElement>(null);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [quality, setQuality] = useState("auto");
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const loadVideo = useCallback(() => {
    const video = videoRef.current;
    const source = sourceRef.current;
    if (!video || !source) return;

    fetch(`/api/rooms/${roomCode}/metadata`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then((data) => {
        if (data.mimetype) {
          source.src = `/api/rooms/${roomCode}/stream`;
          source.type = data.mimetype;
          video.load();
          console.log(`📹 Set source: ${source.src}, type: ${source.type}`);
          setError(null);
          setRetryCount(0);
        } else {
          throw new Error("No video found or invalid metadata");
        }
      })
      .catch((err) => {
        console.error("💥 Metadata fetch error:", err);
        if (retryCount < maxRetries) {
          setTimeout(() => {
            setRetryCount(retryCount + 1);
            console.log(`Retrying metadata fetch (${retryCount + 1}/${maxRetries})`);
            loadVideo();
          }, 2000);
        } else {
          setError("Failed to load video metadata after retries");
        }
      });
  }, [roomCode, retryCount]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0);
      console.log("📹 Video loaded, duration:", video.duration);
      setError(null);
    };

    const handleTimeUpdate = () => {
      if (Number.isFinite(video.currentTime)) {
        onTimeUpdate(video.currentTime);
      }
    };

    const handleWaiting = () => {
      setIsBuffering(true);
      console.log("⏳ Buffering...");
    };

    const handleCanPlay = () => {
      setIsBuffering(false);
      console.log("✅ Can play");
    };

    const handlePlay = () => {
      console.log("▶️ Video play event");
      onPlay();
    };

    const handlePause = () => {
      console.log("⏸️ Video pause event");
      onPause();
    };

    const handleError = (e: Event) => {
      const videoError = video.error;
      const errorMessage = videoError
        ? `Video error: ${videoError.message} (Code: ${videoError.code})`
        : "Failed to load video";
      console.error("💥 Video error:", errorMessage);
      setError(errorMessage);
      setIsBuffering(false);
      if (retryCount < maxRetries) {
        setTimeout(() => {
          setRetryCount(retryCount + 1);
          console.log(`Retrying video load (${retryCount + 1}/${maxRetries})`);
          loadVideo();
        }, 2000);
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("error", handleError);

    loadVideo();

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("error", handleError);
    };
  }, [roomCode, onTimeUpdate, onPlay, onPause, loadVideo]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(currentTime) || !Number.isFinite(duration)) {
      console.warn("Invalid currentTime or duration:", { currentTime, duration });
      return;
    }

    if (Math.abs(video.currentTime - currentTime) > 1) {
      console.log("🔄 Syncing video time:", currentTime);
      if (currentTime >= 0 && currentTime <= duration) {
        video.currentTime = currentTime;
      } else {
        console.warn("Invalid currentTime value, skipping sync:", currentTime);
        setError("Invalid playback time received");
      }
    }

    if (isPlaying && video.paused) {
      console.log("▶️ Syncing play state");
      video.play().catch((err) => {
        console.error("💥 Play error:", err);
        setError("Failed to play video");
      });
    } else if (!isPlaying && !video.paused) {
      console.log("⏸️ Syncing pause state");
      video.pause();
    }
  }, [currentTime, isPlaying, duration]);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch((err) => {
        console.error("💥 Play error:", err);
        setError("Failed to play video");
      });
    } else {
      video.pause();
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const handleSeek = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const video = videoRef.current;
      if (!video || !duration) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const newTime = (clickX / rect.width) * duration;

      if (Number.isFinite(newTime) && newTime >= 0 && newTime <= duration) {
        video.currentTime = newTime;
        onSeek(newTime);
      } else {
        console.warn("Invalid seek time:", newTime);
        setError("Invalid seek position");
      }
    },
    [duration, onSeek],
  );

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative w-full h-full bg-black">
      {error && (
        <Alert className="absolute top-4 left-4 right-4 border-red-500 bg-red-500/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      <video ref={videoRef} className="w-full h-full object-contain" preload="metadata" crossOrigin="anonymous">
        <source ref={sourceRef} src="" type="" />
        Your browser does not support the video tag.
      </video>

      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        <div className="mb-4">
          <div className="w-full h-2 bg-gray-600 rounded-full cursor-pointer" onClick={handleSeek}>
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
        </div>

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
  );
}