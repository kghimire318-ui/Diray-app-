import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Image as ImageIcon, Trash2, X, Maximize2, Upload, FileImage, Info, Download, Calendar
} from 'lucide-react';
import { db } from '../db';

interface GallerySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  synth?: any; // Engine audio sound trigger helper if available
}

// Memory-safe Thumbnail Image helper to handle ObjectURL lifecycle
const ThumbnailImage: React.FC<{ data: Blob; alt: string }> = ({ data, alt }) => {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(data);
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [data]);

  if (!url) {
    return <div className="w-full h-full bg-stone-900 animate-pulse rounded-lg" />;
  }

  return (
    <img
      src={url}
      alt={alt}
      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      referrerPolicy="no-referrer"
    />
  );
};

// Memory-safe Full-size Image helper for Lightbox
const LightboxImage: React.FC<{ data: Blob; alt: string }> = ({ data, alt }) => {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(data);
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [data]);

  if (!url) {
    return (
      <div className="flex items-center justify-center w-full h-[60vh]">
        <div className="w-12 h-12 border-4 border-stone-800 border-t-yellow-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl border border-stone-800"
      referrerPolicy="no-referrer"
    />
  );
};

export const GallerySidebar: React.FC<GallerySidebarProps> = ({ isOpen, onClose, synth }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  // Live query to fetch only image attachments from IndexedDB
  const images = useLiveQuery(
    async () => {
      const allAttachments = await db.attachments.toArray();
      return allAttachments.filter(att => att.type === 'image');
    },
    []
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(files);
  };

  const processFiles = async (files: FileList) => {
    let count = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        setUploadMessage('⚠️ Only image files are supported in this gallery.');
        setTimeout(() => setUploadMessage(null), 3000);
        continue;
      }

      try {
        // Safe conversion of File to Blob
        const blob = new Blob([file], { type: file.type });
        
        // Add attachment into Dexie Store
        await db.attachments.add({
          entryId: 0, // General gallery item independent of specific diary entry
          type: 'image',
          data: blob,
          fileName: file.name,
          fileType: file.type
        });

        count++;
      } catch (err) {
        console.error('Failed to save image to db:', err);
      }
    }

    if (count > 0) {
      if (synth?.playCheatSuccess) synth.playCheatSuccess();
      setUploadMessage(`✅ Successfully uploaded ${count} image(s)!`);
      setTimeout(() => setUploadMessage(null), 3000);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
  };

  const handleDeleteImage = async (id: number, name: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid opening lightbox clicking delete
    
    const confirmMessage = `Are you sure you want to delete the image "${name}"?`;
    if (window.confirm(confirmMessage)) {
      try {
        await db.attachments.delete(id);
        if (synth?.playClick) synth.playClick();
        if (selectedImage?.id === id) {
          setSelectedImage(null);
        }
      } catch (err) {
        console.error('Failed to delete image:', err);
      }
    }
  };

  const handleDownload = (img: any) => {
    const blobUrl = URL.createObjectURL(img.data);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = img.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  };

  // Human friendly file sizing
  const formatBytes = (bytes: number, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ x: -350, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -350, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute left-4 top-20 z-50 w-[340px] h-[640px] bg-stone-950/90 backdrop-blur-xl border border-stone-800/80 rounded-[40px] p-4.5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.85)] flex flex-col justify-between overflow-hidden"
          >
            {/* BRAND HEADER & CLOSE */}
            <div className="flex items-center justify-between border-b border-stone-900 pb-3 mt-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                  <ImageIcon className="w-4 h-4 text-yellow-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-white uppercase font-mono">My Diary Gallery</h3>
                  <p className="text-[10px] text-stone-500">Image attachments database</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white rounded-xl transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* MAIN INTERNAL SCREEN CONTENT */}
            <div className="flex-1 overflow-y-auto my-3 pr-1 space-y-4 scrollbar-none flex flex-col">
              
              {/* UPLOAD & DROPZONE AREA */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`group border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                  isDragging 
                    ? 'border-yellow-500 bg-yellow-500/5' 
                    : 'border-stone-800 hover:border-stone-700 bg-stone-950/50 hover:bg-stone-900/30'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  className="hidden" 
                  accept="image/*" 
                  multiple 
                />
                
                <div className="w-10 h-10 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-4 h-4 text-stone-400 group-hover:text-yellow-500 transition-colors" />
                </div>
                
                <div className="text-center">
                  <p className="text-xs font-semibold text-stone-200">Upload or Drag Images</p>
                  <p className="text-[9px] text-stone-500 mt-0.5">Supports PNG, JPEG, GIF, WebP</p>
                </div>
              </div>

              {/* UPLOAD PROGRESS / STATUS */}
              {uploadMessage && (
                <div className="p-2.5 bg-stone-900/80 border border-stone-800 rounded-xl text-center">
                  <span className="text-[10px] font-medium text-stone-300">{uploadMessage}</span>
                </div>
              )}

              {/* GRID OF THUMBNAIL PREVIEWS */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-stone-500 font-bold font-mono mb-2">
                  <span>Previews</span>
                  <span className="bg-stone-900 text-stone-300 px-1.5 py-0.5 rounded-full">{images?.length || 0} Images</span>
                </div>

                {images && images.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((img: any) => (
                      <div 
                        key={img.id}
                        onClick={() => setSelectedImage(img)}
                        className="group relative aspect-square bg-stone-900 rounded-xl overflow-hidden border border-stone-850 cursor-pointer shadow-sm active:scale-95 transition-all"
                        title={img.fileName}
                      >
                        {/* Thumbnail renders the dynamic Blob safe object URL */}
                        <ThumbnailImage data={img.data} alt={img.fileName} />
                        
                        {/* Overlays / Hover Buttons */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-1.5">
                          <button
                            onClick={(e) => handleDeleteImage(img.id, img.fileName, e)}
                            className="p-1 bg-red-950/80 border border-red-900 hover:bg-red-900 text-red-200 rounded-lg self-end transition-all"
                            title="Delete attachment"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          
                          <div className="flex items-center justify-between text-[8px] text-stone-300 font-mono">
                            <span className="truncate max-w-[45px]">{formatBytes(img.data?.size || 0)}</span>
                            <Maximize2 className="w-2.5 h-2.5 shrink-0" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-10 text-stone-600 space-y-2">
                    <FileImage className="w-10 h-10 stroke-1 text-stone-800" />
                    <div>
                      <p className="text-xs font-semibold">Gallery is Empty</p>
                      <p className="text-[10px] max-w-[180px] leading-relaxed mt-0.5">Drag photos above to populate your personal media database.</p>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* SIDEBAR FOOTER METRICS */}
            <div className="p-3 bg-stone-910 rounded-2xl border border-stone-900/60 flex items-center gap-3">
              <Info className="w-4 h-4 text-stone-500 shrink-0" />
              <div className="text-[10px] leading-snug">
                <span className="text-stone-300 block font-medium">Offline Direct Persistence</span>
                <span className="text-stone-500">Stored safely inside your device in local IndexedDB.</span>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL-SIZE IMAGE lightbox PREVIEW OVERLAY */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-stone-950/95 z-[100] flex flex-col items-center justify-center p-6 backdrop-blur-md"
            onClick={() => setSelectedImage(null)}
          >
            <div 
              className="absolute top-6 right-6 flex items-center gap-3 z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => handleDownload(selectedImage)}
                className="p-2.5 bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white rounded-xl border border-stone-800 transition-all shadow-md flex items-center gap-1.5 text-xs font-bold"
                title="Download original file"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
              
              <button
                onClick={(e) => handleDeleteImage(selectedImage.id, selectedImage.fileName, e)}
                className="p-2.5 bg-red-950 hover:bg-red-900 text-red-200 rounded-xl border border-red-900 transition-all shadow-md"
                title="Delete file"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => setSelectedImage(null)}
                className="p-2.5 bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white rounded-xl border border-stone-800 transition-all shadow-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* LIGHTBOX CONTAINER */}
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="max-w-4xl w-full flex flex-col items-center gap-4 px-4 select-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Full Image */}
              <LightboxImage data={selectedImage.data} alt={selectedImage.fileName} />
              
              {/* Image Metadata Bar */}
              <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4 max-w-xl w-full flex flex-col gap-2 shadow-xl">
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <span className="font-bold text-white text-sm truncate max-w-[280px]" title={selectedImage.fileName}>
                    {selectedImage.fileName}
                  </span>
                  <span className="text-xs bg-stone-800 text-stone-400 font-mono px-2 py-0.5 rounded capitalize">
                    {selectedImage.fileType.split('/')[1] || 'image'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs font-mono text-stone-400">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider">File Size</span>
                    <span className="text-stone-300">{formatBytes(selectedImage.data?.size || 0)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider">Attachment Type</span>
                    <span className="text-stone-300 flex items-center gap-1.5 capitalize">
                      <ImageIcon className="w-3.5 h-3.5 text-stone-500" />
                      IndexedDB {selectedImage.type}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
