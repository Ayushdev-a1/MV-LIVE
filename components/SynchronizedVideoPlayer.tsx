"use client";

import type React from "react";
import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, RotateCcw, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SynchronizedVideoPlayerProps {
  roomCode: string;
  onTimeUpdate: (currentTime: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  currentTime: number;
  isPlaying: boolean;
  onVideoControl: (action: string, data?: any) => void;
}

export function SynchronizedVideoPlayer({
  roomCode,
  onTimeUpdate,
  onPlay,
  onPause,
  onSeek,
  currentTime,
  isPlaying,
  onVideoControl,
}: SynchronizedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sourceRef = useRef<HTMLSourceElement>(null);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const video = videoRef.current;
    const source = sourceRef.current;
    if (!video || !source) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      console.log("📹 Video loaded, duration:", video.duration);
      setError(null);
    };

    const handleTimeUpdate = () => {
      onTimeUpdate(video.currentTime);
    };

    const handleWaiting = () => {
      setIsBuffering(true);
    };

    const handleCanPlay = () => {
      setIsBuffering(false);
    };

    const handlePlay = () => {
      console.log("▶️ Video play event");
      onPlay();
    };

    const handlePause = () => {
      console.log("⏸️ Video pause event");
      onPause();
    };

    const handleSeeked = () => {
      console.log("⏭️ Video seeked to:", video.currentTime);
      onSeek(video.currentTime);
    };

    const handleError = (e: Event) => {
      const videoError = video.error;
      const errorMessage = videoError
        ? `Video error: ${videoError.message} (Code: ${videoError.code})`
        : "Failed to load video";
      console.error("💥 Video error:", errorMessage);
      setError(errorMessage);
      setIsBuffering(false);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("error", handleError);

    // Fetch video metadata to set source
    fetch(`/api/rooms/${roomCode}/metadata`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then((data) => {
        if (data.mimetype) {
          source.src = `/api/rooms/${roomCode}/stream`;
          source.type = data.mimetype;
          video.load(); // Reload video with new source
        } else {
          throw new Error("No video found or invalid metadata");
        }
      })
      .catch((err) => {
        console.error("💥 Metadata fetch error:", err);
        setError("Failed to load video metadata");
      });

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("error", handleError);
    };
  }, [roomCode, onTimeUpdate, onPlay, onPause, onSeek]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Math.abs(video.currentTime - currentTime) > 2) {
      console.log("🔄 Syncing video time:", currentTime);
      video.currentTime = currentTime;
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
  }, [currentTime, isPlaying]);

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      onVideoControl("play", { currentTime: video.currentTime });
    } else {
      onVideoControl("pause", { currentTime: video.currentTime });
    }
  }, [onVideoControl]);

  const handleSeekClick = useCallback(
    (newTime: number) => {
      const video = videoRef.current;
      if (!video || !duration) return;

      video.currentTime = newTime;
      onVideoControl("seek", { currentTime: newTime, isPlaying: !video.paused });
    },
    [duration, onVideoControl],
  );

  const handleProgressClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const video = videoRef.current;
      if (!video || !duration) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const newTime = (clickX / rect.width) * duration;

      handleSeekClick(newTime);
    },
    [duration, handleSeekClick],
  );

  const handleSkip = useCallback(
    (seconds: number) => {
      const video = videoRef.current;
      if (!video) return;

      const newTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
      handleSeekClick(newTime);
    },
    [handleSeekClick],
  );

  const handleVolumeChange = useCallback((values: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = values[0];
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const handleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const handleFullscreen = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isFullscreen) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const handleSyncToLive = useCallback(() => {
    onVideoControl("sync-to-live");
  }, [onVideoControl]);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="relative w-full h-full bg-black group"
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => setShowControls(false)}
    >
      {error && (
        <Alert className="absolute top-4 left-4 right-4 border-red-500 bg-red-500/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        preload="metadata"
        crossOrigin="anonymous"
        onClick={handlePlayPause}
      >
        <source ref={sourceRef} src="" type="" />
        Your browser does not support the video tag.
      </video>

      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      )}

      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="mb-4">
          <div className="w-full h-2 bg-gray-600 rounded-full cursor-pointer relative" onClick={handleProgressClick}>
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
            <div
              className="absolute top-1/2 w-4 h-4 bg-white rounded-full border-2 border-purple-500 transform -translate-y-1/2 shadow-lg"
              style={{ left: `calc(${duration > 0 ? (currentTime / duration) * 100 : 0}% - 8px)` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-300 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => handleSkip(-10)}
              size="sm"
              variant="ghost"
              className="text-white hover:text-purple-300"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button onClick={handlePlayPause} size="sm" className="bg-purple-600 hover:bg-purple-700">
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>

            <Button
              onClick={() => handleSkip(10)}
              size="sm"
              variant="ghost"
              className="text-white hover:text-purple-300"
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            <Button onClick={handleSyncToLive} size="sm" variant="ghost" className="text-white hover:text-purple-300">
              <RotateCcw className="h-4 w-4" />
              <span className="ml-1 text-xs">Sync</span>
            </Button>

            <div className="flex items-center space-x-2 ml-4">
              <Button onClick={handleMute} variant="ghost" size="sm" className="text-white hover:text-purple-300">
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <div className="w-20">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button onClick={handleFullscreen} variant="ghost" size="sm" className="text-white hover:text-purple-300">
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {!isPlaying && !isBuffering && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            onClick={handlePlayPause}
            size="lg"
            className="bg-purple-600/80 hover:bg-purple-700/80 rounded-full w-16 h-16"
          >
            <Play className="h-8 w-8" />
          </Button>
        </div>
      )}
    </div>
  );
}