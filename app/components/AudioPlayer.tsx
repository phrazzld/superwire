"use client";

import React, { useState, useEffect, useRef } from "react";
import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "../../pages/_app";

interface AudioPlayerProps {
  episodeName: string;
  episodeUrl: string;
  episodeDate: string;
  duration?: number;
  autoLoad?: boolean;
}

export default function AudioPlayer({
  episodeName,
  episodeUrl,
  episodeDate,
  duration,
  autoLoad = false
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  // Load audio URL from Firebase
  useEffect(() => {
    const loadAudioUrl = async () => {
      if (!episodeUrl || !autoLoad) return;
      
      setIsLoading(true);
      setHasError(false);
      
      try {
        const pathReference = ref(storage, episodeUrl);
        const url = await getDownloadURL(pathReference);
        setAudioSrc(url);
      } catch (error) {
        console.error("Error loading audio:", error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAudioUrl();
  }, [episodeUrl, autoLoad]);

  // Update audio element when src changes
  useEffect(() => {
    if (audioRef.current && audioSrc) {
      audioRef.current.src = audioSrc;
      audioRef.current.load();
    }
  }, [audioSrc]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      updateProgressBar(audio.currentTime, audio.duration);
    };

    const handleLoadedMetadata = () => {
      setTotalDuration(audio.duration);
      setIsBuffering(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleWaiting = () => {
      setIsBuffering(true);
    };

    const handleCanPlay = () => {
      setIsBuffering(false);
    };

    const handleError = () => {
      setHasError(true);
      setIsPlaying(false);
      setIsBuffering(false);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
    };
  }, [audioSrc]);

  const updateProgressBar = (current: number, total: number) => {
    if (progressBarRef.current && total > 0) {
      const percentage = (current / total) * 100;
      progressBarRef.current.style.width = `${percentage}%`;
    }
  };

  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    // Load audio URL if not loaded yet
    if (!audioSrc && episodeUrl) {
      setIsLoading(true);
      try {
        const pathReference = ref(storage, episodeUrl);
        const url = await getDownloadURL(pathReference);
        setAudioSrc(url);
        audioRef.current.src = url;
        await audioRef.current.load();
      } catch (error) {
        console.error("Error loading audio:", error);
        setHasError(true);
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      try {
        await audioRef.current.play();
      } catch (error) {
        console.error("Error playing audio:", error);
      }
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !totalDuration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * totalDuration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSpeedChange = (rate: number) => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const handleVolumeChange = (newVolume: number) => {
    if (!audioRef.current) return;
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 1.0;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const skip = (seconds: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(audioRef.current.currentTime + seconds, totalDuration));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  // Speed options
  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

  if (hasError) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">Unable to load audio</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800"
          >
            Try refreshing the page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Episode Info */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Episode: {formatDate(episodeDate)}
        </h3>
        <p className="text-sm text-gray-600">
          Duration: {formatTime(totalDuration)}
        </p>
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        preload="none"
        className="hidden"
      />

      {/* Custom Controls */}
      <div className="space-y-4">
        {/* Progress Bar */}
        <div 
          className="relative h-2 bg-gray-200 rounded-full cursor-pointer overflow-hidden"
          onClick={handleProgressClick}
        >
          <div
            ref={progressBarRef}
            className="absolute h-full bg-blue-600 rounded-full transition-all duration-100"
            style={{ width: '0%' }}
          />
          {isBuffering && (
            <div className="absolute inset-0 bg-gray-300 animate-pulse" />
          )}
        </div>

        {/* Time Display */}
        <div className="flex justify-between text-xs text-gray-600">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>

        {/* Main Controls */}
        <div className="flex items-center justify-center space-x-4">
          {/* Skip Back 15s */}
          <button
            onClick={() => skip(-15)}
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
            title="Skip back 15 seconds"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
            </svg>
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={togglePlayPause}
            disabled={isLoading}
            className={`
              p-3 rounded-full transition-all
              ${isLoading ? 'bg-gray-200 cursor-wait' :
                isPlaying ? 'bg-blue-600 hover:bg-blue-700 text-white' : 
                'bg-blue-600 hover:bg-blue-700 text-white'}
            `}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : isPlaying ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>

          {/* Skip Forward 15s */}
          <button
            onClick={() => skip(15)}
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
            title="Skip forward 15 seconds"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
            </svg>
          </button>
        </div>

        {/* Additional Controls */}
        <div className="flex items-center justify-between">
          {/* Volume Control */}
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleMute}
              className="p-1 text-gray-600 hover:text-gray-900 transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              title="Volume"
            />
          </div>

          {/* Speed Control */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-600">Speed:</span>
            <select
              value={playbackRate}
              onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
              className="text-sm text-gray-700 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {speedOptions.map(speed => (
                <option key={speed} value={speed}>
                  {speed}x
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      {isBuffering && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">Buffering...</p>
        </div>
      )}
    </div>
  );
}