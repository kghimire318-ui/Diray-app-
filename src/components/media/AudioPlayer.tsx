import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Square } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AudioPlayerProps {
  data: Blob;
  className?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ data, className }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const newUrl = URL.createObjectURL(data);
    setUrl(newUrl);
    return () => URL.revokeObjectURL(newUrl);
  }, [data]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!url) return <div className="w-full h-full bg-stone-100 animate-pulse rounded-2xl" />;

  return (
    <div className={cn("w-full h-full flex flex-col items-center justify-center p-8 bg-stone-50 gap-6", className)}>
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
      
      <div className="w-24 h-24 rounded-full bg-stone-200 flex items-center justify-center animate-pulse-slow">
        {isMuted ? <VolumeX className="w-10 h-10 text-stone-400" /> : <Volume2 className="w-10 h-10 text-stone-400" />}
      </div>

      <div className="w-full max-w-sm space-y-4 text-center">
        <div className="space-y-1">
          <h4 className="text-stone-900 font-medium">Voice Memo</h4>
          <p className="text-stone-400 text-xs font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-stone-800 transition-all duration-100"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-center relative">
          <button 
            onClick={togglePlay}
            className="p-4 bg-stone-900 text-white rounded-full hover:bg-stone-800 transition-colors shadow-lg active:scale-95"
          >
            {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
          </button>

          <button 
            onClick={toggleMute}
            className="absolute right-0 p-2 text-stone-500 hover:text-stone-800 transition-colors"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
