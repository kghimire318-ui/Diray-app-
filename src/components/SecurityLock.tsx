import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Lock, Fingerprint, Delete } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface SecurityLockProps {
  children: React.ReactNode;
}

export const SecurityLock: React.FC<SecurityLockProps> = ({ children }) => {
  const [isLocked, setIsLocked] = useState(true);
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    const checkSecurity = async () => {
      const pinSetting = await db.settings.get('storage_pin');
      setHasPin(!!pinSetting);
      if (!pinSetting) {
        setIsLocked(false);
      }
    };
    checkSecurity();
  }, []);

  const handlePinInput = async (digit: string) => {
    if (pin.length >= 4) return;
    
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      const pinSetting = await db.settings.get('storage_pin');
      if (pinSetting?.value === newPin) {
        setIsLocked(false);
      } else {
        setError(true);
        setTimeout(() => setPin(''), 500);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  if (hasPin === null) return null;

  if (!isLocked) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-stone-50 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center w-full max-w-xs"
      >
        <div className="mb-8 p-4 bg-stone-100 rounded-full shadow-inner">
          <Lock className="w-8 h-8 text-stone-600" />
        </div>
        
        <h2 className="text-2xl font-semibold text-stone-800 mb-2">Welcome Back</h2>
        <p className="text-stone-500 mb-8">Enter your PIN to unlock</p>

        <div className="flex gap-4 mb-12">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              animate={error ? { x: [0, -10, 10, -10, 10, 0] } : {}}
              className={cn(
                "w-4 h-4 rounded-full border-2 border-stone-300 transition-all duration-200",
                pin.length > i ? "bg-stone-800 border-stone-800 scale-110" : "bg-transparent",
                error && "border-red-500 bg-red-100"
              )}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6 w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handlePinInput(num.toString())}
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-medium text-stone-700 hover:bg-stone-200 active:bg-stone-300 transition-colors mx-auto"
            >
              {num}
            </button>
          ))}
          <div className="flex items-center justify-center">
            <Fingerprint className="w-6 h-6 text-stone-400" />
          </div>
          <button
            onClick={() => handlePinInput('0')}
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-medium text-stone-700 hover:bg-stone-200 active:bg-stone-300 transition-colors mx-auto"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="w-16 h-16 rounded-full flex items-center justify-center text-stone-700 hover:bg-stone-200 active:bg-stone-300 transition-colors mx-auto"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
