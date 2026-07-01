import React, { useRef, useState } from 'react';
import { X, Check, Eraser, Pen } from 'lucide-react';
import { motion } from 'motion/react';

interface CanvasModalProps {
  onSave: (blob: Blob) => void;
  onClose: () => void;
}

export const CanvasModal: React.FC<CanvasModalProps> = ({ onSave, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lineWidth, setLineWidth] = useState(2);
  const [isEraser, setIsEraser] = useState(false);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Get mouse/touch coordinates
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const saveDrawing = () => {
    canvasRef.current?.toBlob((blob) => {
      if (blob) onSave(blob);
    }, 'image/png');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50"
    >
      <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-stone-900">Doodle Note</h3>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1"
              max="20"
              value={lineWidth}
              onChange={(e) => setLineWidth(parseInt(e.target.value))}
              className="w-24"
            />
            <button
              onClick={() => setIsEraser(!isEraser)}
              className={`p-2 rounded-full ${isEraser ? 'bg-stone-200 text-stone-900' : 'text-stone-400 hover:bg-stone-100'}`}
            >
              {isEraser ? <Pen className="w-5 h-5" /> : <Eraser className="w-5 h-5" />}
            </button>
            <button onClick={onClose} className="p-2 text-stone-400 hover:bg-stone-100 rounded-full"><X className="w-5 h-5" /></button>
            <button onClick={saveDrawing} className="p-2 bg-stone-800 text-white rounded-full"><Check className="w-5 h-5" /></button>
          </div>
        </div>
        <canvas
          ref={canvasRef}
          width={400}
          height={300}
          className="border border-stone-200 rounded-xl cursor-crosshair touch-none bg-stone-50"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
    </motion.div>
  );
};
