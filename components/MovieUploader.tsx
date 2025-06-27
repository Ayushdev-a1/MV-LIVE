"use client";

import type React from "react";
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, X, AlertCircle, CheckCircle, Film } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface MovieUploaderProps {
  roomCode: string;
  onUploadComplete: (fileId: string) => void;
  onUploadError: (error: string) => void;
}

export function MovieUploader({ roomCode, onUploadComplete, onUploadError }: MovieUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { user, isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

  const completeUpload = async (file: File, sessionId: string) => {
    const response = await fetch(`/api/upload/progress/${sessionId}`, {
      method: "GET",
      signal: abortControllerRef.current?.signal,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to check progress");
    }

    const { isComplete } = await response.json();
    if (!isComplete) {
      throw new Error("Upload not complete");
    }

    const completeBody = JSON.stringify({
      sessionId,
      roomCode,
      filename: file.name,
      totalSize: file.size,
      mimetype: file.type,
    });

    const completeResponse = await fetch(`/api/upload/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: completeBody,
      signal: abortControllerRef.current?.signal,
    });

    if (!completeResponse.ok) {
      const errorData = await completeResponse.json();
      throw new Error(errorData.error || "Failed to complete upload");
    }

    const { fileId } = await completeResponse.json();
    console.log("✅ Upload completed:", fileId);
    setSuccess("Movie uploaded successfully!");
    onUploadComplete(fileId);
  };

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file) return;

      console.log("🎬 Starting file upload:", file.name);
      setIsUploading(true);
      setProgress(0);
      setCurrentFile(file);
      setError("");
      setSuccess("");

      try {
        // Check authentication
        if (!user || !isAuthenticated) {
          throw new Error("Please sign in to upload movies");
        }

        console.log("✅ User authenticated for upload");

        // Step 1: Initialize upload session
        const initBody = JSON.stringify({
          roomCode,
          filename: file.name,
          totalSize: file.size,
          mimetype: file.type,
        });

        abortControllerRef.current = new AbortController();
        const initResponse = await fetch(`/api/upload/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: initBody,
          signal: abortControllerRef.current.signal,
        });

        if (!initResponse.ok) {
          const errorData = await initResponse.json();
          throw new Error(errorData.error || "Failed to initialize upload");
        }

        const { sessionId } = await initResponse.json();
        console.log("📤 Upload session initialized:", sessionId);

        // Step 2: Upload chunks
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);

          const chunkFormData = new FormData();
          chunkFormData.append("sessionId", sessionId);
          chunkFormData.append("chunkIndex", i.toString());
          chunkFormData.append("chunk", chunk);

          const chunkResponse = await fetch(`/api/upload/chunk`, {
            method: "POST",
            body: chunkFormData,
            signal: abortControllerRef.current.signal,
          });

          if (!chunkResponse.ok) {
            const errorData = await chunkResponse.json();
            throw new Error(errorData.error || `Failed to upload chunk ${i}`);
          }

          // Fetch progress
          const progressResponse = await fetch(`/api/upload/progress/${sessionId}`, {
            method: "GET",
            signal: abortControllerRef.current.signal,
          });

          if (!progressResponse.ok) {
            const errorData = await progressResponse.json();
            throw new Error(errorData.error || "Failed to fetch progress");
          }

          const { progress, isComplete } = await progressResponse.json();
          setProgress(progress);
          console.log(`📤 Chunk ${i + 1}/${totalChunks} uploaded, progress: ${progress}%`);

          if (isComplete && i === totalChunks - 1) {
            await completeUpload(file, sessionId);
          }
        }
      } catch (error: any) {
        if (error.name === "AbortError") {
          console.log("📤 Upload cancelled");
          setError("Upload cancelled");
        } else {
          console.error("💥 Upload error:", error);
          setError(error.message);
          onUploadError(error.message);
        }
      } finally {
        setIsUploading(false);
        setTimeout(() => {
          setProgress(0);
          setCurrentFile(null);
          setError("");
          setSuccess("");
        }, 3000);
      }
    },
    [roomCode, onUploadComplete, onUploadError, user, isAuthenticated],
  );

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("📁 File selected:", file.name, file.size, file.type);

      // Validate file
      const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
      if (file.size > maxSize) {
        setError("File too large. Maximum size is 2GB");
        return;
      }

      const allowedTypes = ["video/mp4", "video/avi", "video/mkv", "video/mov", "video/wmv", "video/webm"];
      if (!allowedTypes.includes(file.type)) {
        setError("Invalid file type. Only video files are allowed");
        return;
      }

      uploadFile(file);
    }
  };

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsUploading(false);
    setProgress(0);
    setCurrentFile(null);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert className="border-red-500 bg-red-500/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-500/10">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-green-400">{success}</AlertDescription>
        </Alert>
      )}

      {!isUploading ? (
        <div className="text-center">
          <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
          <div className="border-2 border-dashed border-purple-600/50 rounded-lg p-8 hover:border-purple-600 transition-colors">
            <Film className="h-12 w-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-white text-lg font-semibold mb-2">Upload Movie</h3>
            <p className="text-gray-400 text-sm mb-4">
              Drag and drop your movie file here, or click to browse
              <br />
              Supports: MP4, AVI, MKV, MOV, WMV, WebM (Max: 2GB)
            </p>
            <Button onClick={() => fileInputRef.current?.click()} className="bg-purple-600 hover:bg-purple-700">
              <Upload className="h-4 w-4 mr-2" />
              Choose Movie File
            </Button>
          </div>
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
              <span>Upload Progress</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>

          <div className="flex justify-center space-x-2">
            <Button onClick={cancelUpload} variant="destructive" size="sm">
              <X className="h-4 w-4 mr-2" />
              Cancel Upload
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}