import React, { useState, useRef, useEffect } from 'react';
import { Mic, StopCircle, X, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface AudioRecorderProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onCapture, onClose }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [visualizerData, setVisualizerData] = useState<number[]>(new Array(20).fill(0));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const MAX_DURATION = 300; // 5 minutes

  useEffect(() => {
    startMicrophone();
    return () => {
      stopMicrophone();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const startMicrophone = async () => {
    setAudioError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(mediaStream);
      
      // Setup Visualizer
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(mediaStream);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 64;
      source.connect(analyzer);
      analyzerRef.current = analyzer;

      const updateVisualizer = () => {
        const dataArray = new Uint8Array(analyzer.frequencyBinCount);
        analyzer.getByteFrequencyData(dataArray);
        
        // Take a small portion for the visualizer
        const simplifiedData = Array.from(dataArray.slice(0, 20)).map(v => v / 255);
        setVisualizerData(simplifiedData);
        
        animationFrameRef.current = requestAnimationFrame(updateVisualizer);
      };
      updateVisualizer();

    } catch (err: any) {
      console.error('Error accessing microphone:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setAudioError('Microphone access was denied. Please check your browser settings.');
      } else {
        setAudioError('Could not access microphone. Please ensure it is connected and not in use.');
      }
    }
  };

  const stopMicrophone = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startRecording = () => {
    if (!stream) return;

    setRecordedChunks([]);
    const mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        setRecordedChunks((prev) => [...prev, event.data]);
      }
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTime(0);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= MAX_DURATION - 1) {
            stopRecording();
            return MAX_DURATION;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording && recordedChunks.length > 0) {
      const blob = new Blob(recordedChunks, { type: 'audio/webm' });
      onCapture(blob);
      onClose();
    }
  }, [isRecording, recordedChunks, onCapture, onClose]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-lg flex flex-col items-center justify-center p-6">
      <div className="absolute top-6 right-6">
        <button 
          onClick={onClose}
          className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="w-full max-w-md bg-stone-900 rounded-[3rem] p-8 shadow-2xl flex flex-col items-center gap-12 border border-white/10">
        <div className="text-center space-y-2">
          <h2 className="text-white text-xl font-medium">Audio Recorder</h2>
          <p className="text-stone-400 text-sm">
            {isRecording ? 'Recording in progress...' : 'Ready to record'}
          </p>
        </div>

        {/* Visualizer */}
        <div className="flex items-center justify-center gap-1 h-32 w-full">
          {visualizerData.map((value, i) => (
            <motion.div
              key={i}
              animate={{ height: `${Math.max(10, value * 100)}%` }}
              className={cn(
                "w-1.5 rounded-full transition-colors",
                isRecording ? "bg-red-500" : "bg-stone-700"
              )}
            />
          ))}
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="text-4xl font-mono font-bold text-white tabular-nums">
            {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
          </div>
          
          <div className="flex items-center gap-8">
            {!isRecording ? (
              <button 
                onClick={startRecording}
                disabled={!!audioError}
                className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-lg hover:bg-stone-100 transition-all active:scale-95 disabled:opacity-50"
              >
                <Mic className="w-10 h-10 text-red-500" />
              </button>
            ) : (
              <button 
                onClick={stopRecording}
                className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-lg hover:bg-stone-100 transition-all active:scale-95"
              >
                <StopCircle className="w-10 h-10 text-red-500" />
              </button>
            )}
          </div>
        </div>

        {audioError && (
          <p className="text-red-400 text-sm text-center">{audioError}</p>
        )}
      </div>
    </div>
  );
};
