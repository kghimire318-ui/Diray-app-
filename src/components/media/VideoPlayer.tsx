import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { cn } from '../../lib/utils';

interface VideoPlayerProps {
  data: Blob;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ data, className }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (duration > 0) setEndTime(duration);
  }, [duration]);

  useEffect(() => {
    const newUrl = URL.createObjectURL(data);
    setUrl(newUrl);
    return () => {
      URL.revokeObjectURL(newUrl);
    };
  }, [data]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    
    let time = videoRef.current.currentTime;
    if (time < startTime || time > endTime) {
      videoRef.current.currentTime = startTime;
      time = startTime;
    }
    setCurrentTime(time);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  if (!url) return <div className="w-full h-full bg-stone-100 animate-pulse rounded-2xl" />;

  return (
    <div className={cn("relative group/player w-full h-full overflow-hidden flex items-center justify-center bg-black", className)}>
      <video
        ref={videoRef}
        src={url}
        className="w-full h-full object-contain"
        autoPlay={false}
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onClick={togglePlay}
      />
      
      {/* Custom Controls Overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-12 opacity-0 group-hover/player:opacity-100 transition-opacity pointer-events-none">
        
        {/* Trim controls */}
        <div className="flex items-center gap-2 mb-2 pointer-events-auto">
          <input
            type="number"
            value={Math.floor(startTime)}
            onChange={(e) => setStartTime(Math.max(0, Math.min(Number(e.target.value), endTime)))}
            className="w-16 bg-black/50 text-white text-xs p-1 rounded"
            placeholder="Start"
          />
          <input
            type="number"
            value={Math.floor(endTime)}
            onChange={(e) => setEndTime(Math.max(startTime, Math.min(Number(e.target.value), duration)))}
            className="w-16 bg-black/50 text-white text-xs p-1 rounded"
            placeholder="End"
          />
        </div>

        {/* Seek bar and Time display */}
        <div className="flex items-center gap-2 mb-2 pointer-events-auto">
          <span className="text-xs text-white tabular-nums">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
          />
          <span className="text-xs text-white tabular-nums">{formatTime(duration)}</span>
        </div>

        <div className="flex items-center justify-between">
          <button 
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="p-2 text-white hover:bg-white/20 rounded-full transition-colors pointer-events-auto"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
          </button>
          
          <button
            onClick={(e) => { e.stopPropagation(); toggleMute(); }}
            className="p-2 text-white hover:bg-white/20 rounded-full transition-colors pointer-events-auto"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
