import React, { useState, useRef, useEffect } from 'react';
import { Camera, StopCircle, RefreshCw, X, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface VideoRecorderProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

export const VideoRecorder: React.FC<VideoRecorderProps> = ({ onCapture, onClose }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [zoomCapabilities, setZoomCapabilities] = useState<{ min: number; max: number; step: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const MAX_DURATION = 60;

  const [mimeType, setMimeType] = useState<string>('');

  useEffect(() => {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        setMimeType(type);
        break;
      }
    }
    checkCameras();
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const checkCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setHasMultipleCameras(videoDevices.length > 1);
    } catch (err) {
      console.error('Error enumerating devices:', err);
    }
  };

  const toggleFacingMode = () => {
    if (isRecording) return; // Prevent switching while recording to avoid stream interruptions
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      // First try with ideal constraints
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: facingMode,
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          frameRate: { ideal: 24 }
        }, 
        audio: true 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities() as any;
        if (capabilities.zoom) {
          setZoomCapabilities({
            min: capabilities.zoom.min,
            max: capabilities.zoom.max,
            step: capabilities.zoom.step,
          });
          setZoom((videoTrack.getSettings() as any).zoom || 1);
        }
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.includes('Permission dismissed')) {
        setCameraError('Camera access was denied or dismissed. Please check your browser settings and allow camera/microphone access for this site.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera or microphone found on this device.');
      } else {
        // Fallback to basic constraints if advanced ones failed
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          setStream(fallbackStream);
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
          }
        } catch (fallbackErr) {
          setCameraError('Could not access camera or microphone. Please ensure no other app is using them.');
        }
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startRecording = () => {
    if (!stream) return;

    setRecordedChunks([]);
    const options: MediaRecorderOptions = {
        videoBitsPerSecond: 1500000
    };
    if (mimeType) {
        options.mimeType = mimeType;
    }

    const mediaRecorder = new MediaRecorder(stream, options);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        setRecordedChunks((prev) => [...prev, event.data]);
      }
    };

    mediaRecorder.onstop = () => {
        // Handled in stopRecording logic
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
      
      mediaRecorderRef.current.addEventListener('stop', () => {
          // Note: setRecordedChunks is async so we use the onstop callback or a dedicated handler
          // However, we wait for dataavailable to finish
      }, { once: true });
    }
  };

  const handleZoomChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setZoom(value);
    
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        try {
          await videoTrack.applyConstraints({
            advanced: [{ zoom: value }]
          } as any);
        } catch (err) {
          console.error('Error applying zoom:', err);
        }
      }
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
          const blob = new Blob(recordedChunks, { type: mimeType || 'video/webm' });
          onCapture(blob);
          onClose();
      }
  }, [isRecording, recordedChunks, onCapture, onClose, mimeType]);

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center">
      <div className="absolute top-6 right-6 z-10">
        <button 
          onClick={onClose}
          className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="relative w-full max-w-2xl aspect-[3/4] sm:aspect-video bg-stone-900 overflow-hidden sm:rounded-3xl shadow-2xl">
        {cameraError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <Video className="w-12 h-12 text-stone-600 mb-4" />
            <p className="text-stone-400">{cameraError}</p>
            <button 
                onClick={startCamera}
                className="mt-4 px-6 py-2 bg-white text-stone-900 rounded-full font-medium"
            >
                Retry
            </button>
          </div>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            className="w-full h-full object-cover"
          />
        )}

        {isRecording && (
          <div className="absolute top-6 left-6 flex items-center gap-3">
            <div className="flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
              <div className="w-2 h-2 bg-white rounded-full" />
              RECORDING
            </div>
            <div className="bg-black/40 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-mono font-bold">
              {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')} / 1:00
            </div>
          </div>
        )}

        {zoomCapabilities && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-2/3 max-w-xs px-4 py-2 bg-black/40 backdrop-blur-md rounded-full flex items-center gap-4 group">
            <span className="text-[10px] font-bold text-white/60 min-w-[24px]">1x</span>
            <input
              type="range"
              min={zoomCapabilities.min}
              max={zoomCapabilities.max}
              step={zoomCapabilities.step}
              value={zoom}
              onChange={handleZoomChange}
              className="flex-1 accent-white h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-[10px] font-bold text-white min-w-[24px]">{zoom.toFixed(1)}x</span>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center gap-8">
        {!isRecording && hasMultipleCameras && (
          <button 
            onClick={toggleFacingMode}
            className="p-4 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors"
          >
            <RefreshCw className="w-6 h-6" />
          </button>
        )}
        {!isRecording ? (
          <button 
            onClick={startRecording}
            disabled={!!cameraError}
            className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg hover:bg-stone-100 transition-colors disabled:opacity-50"
          >
            <div className="w-16 h-16 rounded-full border-4 border-red-500 bg-red-500 scale-90 hover:scale-100 transition-transform" />
          </button>
        ) : (
          <button 
            onClick={stopRecording}
            className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg hover:bg-stone-100 transition-colors"
          >
            <StopCircle className="w-10 h-10 text-red-500" />
          </button>
        )}
      </div>
    </div>
  );
};
