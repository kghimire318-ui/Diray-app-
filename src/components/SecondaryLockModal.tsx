import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Lock, Fingerprint, Delete, Shield, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface SecondaryLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prompt?: string;
  expectedPin?: string;
}

export const SecondaryLockModal: React.FC<SecondaryLockModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  prompt = "Accessing this secure folder requires secondary authentication.",
  expectedPin
}) => {
  const [authMode, setAuthMode] = useState<'pin' | 'biometric'>('pin');
  const [pin, setPin] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [expectedPinState, setExpectedPinState] = useState('5678');
  const [error, setError] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  // We determine what PIN/password to verify against
  const finalExpected = expectedPin || expectedPinState;
  const isNumericFourDigit = /^\d{4}$/.test(finalExpected);

  useEffect(() => {
    const loadSecondaryPin = async () => {
      try {
        const stored = await db.settings.get('secondary_pin');
        if (stored?.value) {
          setExpectedPinState(stored.value);
        }
      } catch (err) {
        console.warn('Failed to load secondary PIN:', err);
      }
    };
    if (isOpen) {
      loadSecondaryPin();
      setPin('');
      setPasswordInput('');
      setShowPassword(false);
      setError(false);
      setIsScanning(false);
      setScanSuccess(false);
    }
  }, [isOpen]);

  const handlePinInput = (digit: string) => {
    if (pin.length >= 4 || isScanning) return;
    
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      if (newPin === finalExpected) {
        setScanSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 600);
      } else {
        setError(true);
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 600);
      }
    }
  };

  const handleBackspace = () => {
    if (isScanning) return;
    setPin(pin.slice(0, -1));
    setError(false);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === finalExpected) {
      setScanSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 600);
    } else {
      setError(true);
      setTimeout(() => {
        setError(false);
      }, 1500);
    }
  };

  const triggerBiometricScan = () => {
    if (isScanning || scanSuccess) return;
    setIsScanning(true);
    setError(false);

    // Simulate fingerprint recognition scanning sequence
    setTimeout(() => {
      setIsScanning(false);
      setScanSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 500);
    }, 1800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Dark blur backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-stone-950/80 backdrop-blur-md"
      />

      {/* Security Vault Dialog box */}
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="bg-white rounded-[32px] border border-stone-200/50 shadow-2xl p-6 w-full max-w-sm relative z-10 flex flex-col items-center"
      >
        {/* Header Indicator */}
        <div className="absolute top-4 left-6 flex items-center gap-1.5 text-stone-400 font-mono text-[9px] uppercase tracking-widest">
          <Shield className="w-3.5 h-3.5 text-amber-500" /> Secondary Security Vault
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-5 text-stone-400 hover:text-stone-600 text-xs font-bold transition px-2 py-1 rounded-lg hover:bg-stone-50"
        >
          Cancel
        </button>

        {/* Dynamic status illustration */}
        <div className="mt-8 mb-4 relative flex items-center justify-center">
          <div className="w-16 h-16 bg-stone-50 border border-stone-100 rounded-full flex items-center justify-center shadow-inner relative overflow-hidden">
            <AnimatePresence mode="wait">
              {scanSuccess ? (
                <motion.div
                  key="success"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-emerald-500"
                >
                  <CheckCircle2 className="w-8 h-8" />
                </motion.div>
              ) : authMode === 'biometric' ? (
                <motion.div
                  key="fingerprint"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className={cn(
                    "transition-colors duration-300",
                    isScanning ? "text-amber-500" : "text-stone-600"
                  )}
                >
                  <Fingerprint className="w-8 h-8" />
                </motion.div>
              ) : (
                <motion.div
                  key="pin"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="text-stone-600"
                >
                  <KeyRound className="w-7 h-7" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scanning Line Effect */}
            {authMode === 'biometric' && isScanning && (
              <motion.div
                initial={{ top: '0%' }}
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                className="absolute left-0 right-0 h-0.5 bg-amber-400 shadow-lg shadow-amber-400/50"
              />
            )}
          </div>
        </div>

        {/* Title & Instructions */}
        <h3 className="text-lg font-serif font-bold text-stone-900 text-center px-4 leading-snug">
          {scanSuccess ? "Identity Confirmed" : "Authentication Required"}
        </h3>
        <p className="text-[11px] text-stone-500 text-center px-3 mt-1.5 leading-normal max-w-[260px]">
          {prompt}
        </p>

        {/* Mode Selector Tab */}
        {!scanSuccess && isNumericFourDigit && (
          <div className="flex bg-stone-100 p-1 rounded-2xl gap-1 mt-5 mb-6 w-full max-w-[220px]">
            <button
              onClick={() => { setAuthMode('pin'); setPin(''); }}
              className={cn(
                "flex-1 py-1.5 text-[10px] font-bold rounded-xl transition cursor-pointer",
                authMode === 'pin' ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
              )}
            >
              Secondary PIN
            </button>
            <button
              onClick={() => { setAuthMode('biometric'); setPin(''); }}
              className={cn(
                "flex-1 py-1.5 text-[10px] font-bold rounded-xl transition cursor-pointer",
                authMode === 'biometric' ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
              )}
            >
              Touch ID / Face ID
            </button>
          </div>
        )}

        {/* Security verification container */}
        <div className="w-full h-64 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {scanSuccess ? (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center py-6"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute" />
                <span className="text-xs font-mono font-bold text-emerald-600 uppercase tracking-widest mt-2">
                  Decrypting record...
                </span>
              </motion.div>
            ) : !isNumericFourDigit ? (
              <motion.div
                key="password-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full"
              >
                <form onSubmit={handlePasswordSubmit} className="flex flex-col items-center w-full px-4 space-y-4">
                  <div className="relative w-full">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Enter custom password"
                      className="w-full bg-stone-50 border border-stone-200 text-sm text-center text-stone-800 py-3 px-4 rounded-2xl font-sans focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-3 text-stone-400 hover:text-stone-600 text-xs font-bold"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {error && (
                    <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Incorrect password. Please try again.
                    </p>
                  )}
                  <button
                    type="submit"
                    className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl text-xs font-bold transition shadow-md cursor-pointer"
                  >
                    Decrypt Secure Page
                  </button>
                </form>
              </motion.div>
            ) : authMode === 'biometric' ? (
              <motion.div
                key="biometric-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center gap-6 h-full w-full py-4"
              >
                <button
                  onClick={triggerBiometricScan}
                  disabled={isScanning}
                  className={cn(
                    "w-28 h-28 rounded-full flex flex-col items-center justify-center border-2 transition-all duration-300 relative group overflow-hidden shadow-lg shadow-stone-100",
                    isScanning
                      ? "border-amber-400 bg-amber-500/5 scale-105"
                      : "border-stone-200 bg-stone-50 hover:border-stone-400 hover:bg-stone-100"
                  )}
                >
                  <Fingerprint className={cn(
                    "w-12 h-12 transition-all duration-300",
                    isScanning ? "text-amber-500 animate-pulse scale-110" : "text-stone-500 group-hover:text-stone-800"
                  )} />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mt-2 font-mono">
                    {isScanning ? "Scanning..." : "Tap to Scan"}
                  </span>
                </button>

                <p className="text-[10px] text-stone-400 text-center leading-normal max-w-[220px]">
                  Simulates standard biometric system framework validation via fingerprint overlay sensor.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="pin-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center w-full"
              >
                {/* 4 dots indicator */}
                <div className="flex gap-4 mb-8">
                  {[0, 1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      animate={error ? { x: [0, -8, 8, -8, 8, 0] } : {}}
                      className={cn(
                        "w-3.5 h-3.5 rounded-full border border-stone-300 transition-all duration-200",
                        pin.length > i ? "bg-stone-900 border-stone-900 scale-110" : "bg-transparent",
                        error && "border-red-500 bg-red-100 animate-none"
                      )}
                    />
                  ))}
                </div>

                {/* Number Pad Grid */}
                <div className="grid grid-cols-3 gap-y-3 gap-x-6 w-full max-w-[240px]">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handlePinInput(num.toString())}
                      className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-stone-700 hover:bg-stone-100 active:bg-stone-200 transition-colors mx-auto cursor-pointer"
                    >
                      {num}
                    </button>
                  ))}
                  <div className="flex items-center justify-center">
                    {error && <AlertCircle className="w-5 h-5 text-red-500" />}
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePinInput('0')}
                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-stone-700 hover:bg-stone-100 active:bg-stone-200 transition-colors mx-auto cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    className="w-12 h-12 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-100 active:bg-stone-200 transition-colors mx-auto cursor-pointer"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
