import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, X, ExternalLink, Link as LinkIcon, Download } from 'lucide-react';
import { cn } from '../../lib/utils';
import { VideoPlayer } from './VideoPlayer';
import { AudioPlayer } from './AudioPlayer';

interface MediaCarouselProps {
  attachments: any[];
  onDelete: (id: any) => void;
}

export const MediaCarousel: React.FC<MediaCarouselProps> = ({ attachments, onDelete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [linkData, setLinkData] = useState<Record<string, string>>({});

  useEffect(() => {
    const nextUrls: Record<string, string> = {};
    const nextLinks: Record<string, string> = {};
    
    const processAttachments = async () => {
      for (const att of attachments) {
        const id = att.id || att.fileName;
        if (att.type === 'image') {
          nextUrls[id] = URL.createObjectURL(att.data);
        } else if (att.type === 'link') {
          const text = await att.data.text();
          nextLinks[id] = text;
        }
      }
      setUrls(nextUrls);
      setLinkData(nextLinks);
    };

    processAttachments();

    return () => {
      Object.values(nextUrls).forEach(URL.revokeObjectURL);
    };
  }, [attachments]);

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex((prevIndex) => {
      let nextIndex = prevIndex + newDirection;
      if (nextIndex < 0) nextIndex = attachments.length - 1;
      if (nextIndex >= attachments.length) nextIndex = 0;
      return nextIndex;
    });
  };

  const handleDownload = () => {
    if (currentMedia.type === 'link') return;
    
    const blobUrl = URL.createObjectURL(currentMedia.data);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = currentMedia.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  };

  if (attachments.length === 0) return null;

  const currentMedia = attachments[currentIndex];
  const currentId = currentMedia.id || currentMedia.fileName;

  const renderCurrentItem = () => {
    switch (currentMedia.type) {
      case 'image':
        return urls[currentId] ? (
          <img
            src={urls[currentId]}
            alt={currentMedia.fileName}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full bg-stone-200 animate-pulse" />
        );
      case 'video':
        return <VideoPlayer data={currentMedia.data} />;
      case 'audio':
        return <AudioPlayer data={currentMedia.data} />;
      case 'link':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-stone-50 gap-6">
            <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
              <LinkIcon className="w-10 h-10 text-blue-600" />
            </div>
            <div className="text-center space-y-4 max-w-sm">
              <div className="space-y-1">
                <h4 className="text-stone-900 font-medium">Link Attachment</h4>
                <p className="text-stone-500 text-sm truncate">{linkData[currentId] || 'Loading link...'}</p>
              </div>
              <a 
                href={linkData[currentId]} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-full font-medium shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
              >
                <span>Visit URL</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full aspect-square sm:aspect-video rounded-3xl overflow-hidden bg-stone-100 shadow-md group border border-stone-200">
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={1}
          onDragEnd={(e, { offset, velocity }) => {
            const swipe = swipePower(offset.x, velocity.x);

            if (swipe < -swipeConfidenceThreshold) {
              paginate(1);
            } else if (swipe > swipeConfidenceThreshold) {
              paginate(-1);
            }
          }}
          className="absolute inset-0 flex items-center justify-center bg-stone-50"
        >
          {renderCurrentItem()}
        </motion.div>
      </AnimatePresence>

      {/* Overlays */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {currentMedia.type !== 'link' && (
          <button
            onClick={handleDownload}
            className="p-2 bg-stone-900/50 hover:bg-stone-900/70 text-white rounded-full backdrop-blur-md shadow-lg transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => onDelete(currentMedia.id)}
          className="p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
          title="Delete"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {attachments.length > 1 && (
        <>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 text-stone-900 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100"
            onClick={() => paginate(-1)}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 text-stone-900 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100"
            onClick={() => paginate(1)}
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {attachments.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  i === currentIndex ? "bg-stone-800 w-4" : "bg-stone-400"
                )}
              />
            ))}
          </div>
        </>
      )}

      {/* Badge/Counter */}
      <div className="absolute top-4 left-4 px-3 py-1 bg-stone-900/10 backdrop-blur-md rounded-full text-[10px] font-bold text-stone-600">
        {currentIndex + 1} / {attachments.length}
      </div>
    </div>
  );
};
