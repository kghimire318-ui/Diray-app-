import React, { useEffect } from 'react';
import { Sparkles, Info, X } from 'lucide-react';

interface AdSenseBannerProps {
  pubId: string;
  slotId: string;
  enabled: boolean;
  testMode: boolean;
  onClose?: () => void;
}

export const AdSenseBanner: React.FC<AdSenseBannerProps> = ({
  pubId,
  slotId,
  enabled,
  testMode,
  onClose
}) => {
  // Try to push the ad init call if AdSense script is loaded and in live mode
  useEffect(() => {
    if (enabled && pubId && slotId && !testMode) {
      try {
        const adsbygoogle = (window as any).adsbygoogle || [];
        adsbygoogle.push({});
      } catch (err) {
        console.warn('AdSense push failed (expected if script is blocked or still loading):', err);
      }
    }
  }, [enabled, pubId, slotId, testMode]);

  if (!enabled) return null;

  // Render simulated AdSense placeholder banner if testMode is enabled OR credentials are blank
  const isMock = testMode || !pubId || !slotId;

  return (
    <div className="w-full max-w-4xl mx-auto my-2 px-4 transition-all duration-300">
      <div className="relative bg-stone-900/90 backdrop-blur-md border border-stone-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col sm:flex-row items-center justify-between p-3.5 gap-4 min-h-[90px]">
        
        {/* Banner Label & Branding */}
        <div className="absolute top-1.5 left-3 flex items-center gap-1.5 pointer-events-none select-none">
          <span className="text-[7.5px] font-mono font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1 rounded uppercase tracking-widest">
            {isMock ? 'Google AdSense (Preview Mode)' : 'Advertisement'}
          </span>
          <span className="text-[7.5px] text-stone-500 font-mono">
            {isMock ? 'Responsive Banner Slot' : `Slot: ${slotId}`}
          </span>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-stone-500 hover:text-stone-300 p-1 rounded-lg hover:bg-stone-800 transition"
            title="Dismiss Ad placeholder"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {isMock ? (
          /* Mock Visual Responsive Banner (Interactive & Authentic Indian Highway Theme) */
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-orange-500 via-white to-green-500 flex items-center justify-center shadow-lg font-extrabold text-stone-950 text-xs shrink-0 select-none antialiased">
                BUSSIN
              </div>
              <div>
                <h4 className="text-xs font-black text-white tracking-tight flex items-center gap-1">
                  Chalo Belbari Express Deluxe! <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
                </h4>
                <p className="text-[10px] text-stone-400 leading-snug max-w-md mt-0.5">
                  Book ticket fares directly on local routes. Enjoy telolet air pressure horns & high neon underglows today!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
              <div className="text-right hidden md:block">
                <span className="text-[8px] text-stone-500 block uppercase font-mono font-bold">SPONSOR MATCH</span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">₹150 Per Ticket</span>
              </div>
              <a 
                href="https://ai.studio/build" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-black tracking-wide shadow-md hover:scale-105 active:scale-95 transition-all text-center w-full sm:w-auto"
              >
                TRAVEL NOW
              </a>
            </div>
          </div>
        ) : (
          /* Live Google AdSense Banner Insertion Element */
          <div className="w-full overflow-hidden mt-3" style={{ minHeight: '90px' }}>
            <ins 
              className="adsbygoogle"
              style={{ display: 'block', textDecoration: 'none' }}
              data-ad-client={pubId}
              data-ad-slot={slotId}
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          </div>
        )}

        {/* AdSense Info Footer - only visible when mock/preview is active */}
        {isMock && (
          <div className="absolute bottom-1 right-3 flex items-center gap-1.5 pointer-events-none select-none text-[8px] font-mono text-stone-600">
            <Info className="w-3 h-3 text-stone-700" />
            <span>Responsive Banner Area (728x90) • Stored in Dexie</span>
          </div>
        )}
      </div>
    </div>
  );
};
