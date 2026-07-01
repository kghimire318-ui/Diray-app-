import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, useBox, usePlane } from '@react-three/cannon';
import { OrbitControls, Sky, Stars, KeyboardControls, useKeyboardControls } from '@react-three/drei';
import { db, type LeaderboardRun, type SavedLivery } from './db';
import { VEHICLE_DATABASE, type VehicleSettings } from './data/vehicles';
import { VillageEnvironment } from './components/VillageEnvironment';
import { AITrafficSystem } from './components/AITrafficSystem';
import { MiniMap } from './components/MiniMap';
import { synth } from './utils/audio';
import { 
  Compass, Gauge, Volume2, VolumeX, RefreshCw, 
  Sun, Moon, Shield, Sparkles, User, Palette, Eye, HelpCircle, 
  MapPin, CheckSquare, Plus, Trash2, BatteryCharging, Wifi, Signal, Check,
  Image as ImageIcon, EyeOff, Sliders, Trophy, Wrench, Navigation, Play, RotateCcw,
  Download, Upload, Radio, FileText, ChevronRight, MessageSquare
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

// --- STATIONS & BUS ROUTES METADATA ---
interface BusRoute {
  id: string;
  name: string;
  payout: number;
  passengerCount: number;
  difficulty: 'Easy' | 'Medium' | 'Challenging';
  stops: string[];
  description: string;
}

const BUS_ROUTES: BusRoute[] = [
  {
    id: 'route-nh2',
    name: 'NH-2 Grand Trunk Highway Express',
    payout: 2500,
    passengerCount: 14,
    difficulty: 'Easy',
    stops: ['Belbari Central Terminus', 'National Highway DHABA Halt'],
    description: 'Drive along the wide, paved state highway. Look out for over-speeding cargo trucks and toll barriers!'
  },
  {
    id: 'route-ghats',
    name: 'Western Ghats Hairpin Pass',
    payout: 4200,
    passengerCount: 18,
    difficulty: 'Challenging',
    stops: ['Belbari Central Terminus', 'Western Ghats Scenic Viewpoint'],
    description: 'Steep hill climbs, dangerous hairpin curves, and narrow gravel roads where precision driving is vital!'
  },
  {
    id: 'route-grand-tour',
    name: 'All-India Grand Convoy Route',
    payout: 7500,
    passengerCount: 26,
    difficulty: 'Medium',
    stops: ['Belbari Central Terminus', 'National Highway DHABA Halt', 'Western Ghats Scenic Viewpoint'],
    description: 'The ultimate long-distance test crossing every major regional terminal in a single continuous drive.'
  }
];

interface BusStopLocation {
  name: string;
  pos: [number, number, number];
  color: string;
  icon: string;
}

const BUS_STOPS: Record<string, BusStopLocation> = {
  'Belbari Central Terminus': { name: 'Belbari Central Terminus', pos: [5, 0, 30], color: '#fbbf24', icon: '🏪' },
  'National Highway DHABA Halt': { name: 'National Highway DHABA Halt', pos: [-5, 0, -50], color: '#10b981', icon: '🍲' },
  'Western Ghats Scenic Viewpoint': { name: 'Western Ghats Scenic Viewpoint', pos: [45, 0, -25], color: '#3b82f6', icon: '🏔️' }
};

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'drive' | 'routes' | 'livery' | 'mods' | 'leaderboard' | 'saves'>('drive');

  // Livery settings
  const [paintColor, setPaintColor] = useState('#b91c1c'); // Lal Dabba Cherry Red default
  const [stripeColor, setStripeColor] = useState('#fbbf24'); // Yellow stripes accent
  const [stickerId, setStickerId] = useState<'none' | 'flag' | 'om' | 'ganesha' | 'stars' | 'lightning'>('flag');
  const [ledText, setLedText] = useState('DELHI ➔ JAIPUR DIRECT');
  const [quoteText, setQuoteText] = useState('HORN OK PLEASE');
  const [tasselsEnabled, setTasselsEnabled] = useState(true);
  const [underglowColor, setUnderglowColor] = useState('#00ffea'); // Cyan neon outline
  const [customLiveryName, setCustomLiveryName] = useState('My Classic tricolor');

  // Chassis Mod Tuner Stats
  const [customLength, setCustomLength] = useState(11.0); // slider 8.5 to 14.5
  const [customWidth, setCustomWidth] = useState(2.55); // slider 2.2 to 2.8
  const [horsePower, setHorsePower] = useState(320); // engine slider 200 hp to 600 hp
  const [brakeStrength, setBrakeStrength] = useState(0.65); // brakes slider 0.3 to 1.0
  const [suspensionBounciness, setSuspensionBounciness] = useState(0.40); // 0.1 to 0.9
  const [wheelType, setWheelType] = useState<'steel' | 'alloy' | 'chrome'>('alloy');
  const [modSetupName, setModSetupName] = useState('Heavy Highway Tune');

  // Simulated pilot / profile name
  const [pilotName, setPilotName] = useState('Captain Raj');

  // Active Map Route States
  const [activeRoute, setActiveRoute] = useState<BusRoute>(BUS_ROUTES[0]);
  const [currentGoalStopIndex, setCurrentGoalStopIndex] = useState(0);
  const [earnings, setEarnings] = useState(12500); // rupees wallet ₹
  const [totalMiles, setTotalMiles] = useState(12.4); // odometer miles
  const [currentRouteStars, setCurrentRouteStars] = useState(5.0); // safety rating drops on crash!
  const [routePassengersBoarded, setRoutePassengersBoarded] = useState(0);
  const [isCurrentlyTouring, setIsCurrentlyTouring] = useState(false);

  // Core Driving Game States
  const [activeVehicle, setActiveVehicle] = useState<VehicleSettings>(VEHICLE_DATABASE['8000']); // Starts with Leyland
  const [mudIntensity, setMudIntensity] = useState(0); // Mud Level (0 to 100 %)
  const [garageCategory, setGarageCategory] = useState<'bus' | 'heavy' | 'car' | 'bike' | 'aerial'>('bus');
  const [isDriving, setIsDriving] = useState(true); // Default to starting in driver's cab!
  const [fuel, setFuel] = useState(100);
  const [vehicleHealth, setVehicleHealth] = useState(100);
  const [speed, setSpeed] = useState(0);
  const [gear, setGear] = useState<'D' | 'N' | 'R'>('D'); // Driving gear D, neutral N, reverse R
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [headlightsEnabled, setHeadlightsEnabled] = useState(false);
  const [dayNightProgress, setDayNightProgress] = useState(16.5); // Hours of the clock 0-24
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [uiVisible, setUiVisible] = useState(true);
  const [hudMessage, setHudMessage] = useState('📍 Drive your custom bus to Belbari Terminal to board passengers!');

  // Real-time Walkie-Talkie Walk-through Band
  const [walkieMessages, setWalkieMessages] = useState<{ id: number; pilot: string; text: string; time: string }[]>([
    { id: 1, pilot: 'Sardar Ji 📿', text: 'Namaste co-drivers! Commencing overnight run to Agra now. Highway is clear!', time: '05:50' },
    { id: 2, pilot: 'Amit Belbari Express ⚡', text: 'Thar has passed with heavy neon lights. Overtake carefully!', time: '05:53' },
    { id: 3, pilot: 'Pilot Vikram 🚌', text: 'Had solid Ginger Tea at checking Dhaba. Highly recommend!', time: '05:54' }
  ]);

  // Teleportation request
  const [teleportRequest, setTeleportRequest] = useState<{ pos: [number, number, number]; label: string; timestamp: number } | null>(null);

  // IndexDB reactive queries
  const runs = useLiveQuery(async () => {
    const all = await db.runs.toArray();
    return all.sort((a, b) => {
      const tA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const tB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return tB - tA;
    });
  });
  const savedLiveries = useLiveQuery(() => db.liveries.toArray());

  // Refs for tracking positions
  const playerPositionRef = useRef<[number, number, number]>([2, 1.2, 5]);
  const vehiclePositionRef = useRef<[number, number, number]>([0, 1.5, 0]);

  // Track dynamic audio roars
  useEffect(() => {
    if (audioEnabled) {
      if (isDriving) {
        synth.startEngine();
      } else {
        synth.stopEngine();
      }
    } else {
      synth.stopEngine();
    }
  }, [isDriving, audioEnabled]);

  // Adjust pitch with heavy speed factor
  useEffect(() => {
    if (isDriving && audioEnabled) {
      synth.updateEnginePitch(speed, 28);
    }
  }, [speed, isDriving, audioEnabled]);

  // Handle reverse beeper loops
  useEffect(() => {
    if (isDriving && gear === 'R' && Math.abs(speed) > 0.1 && audioEnabled) {
      synth.startReverseBeeps();
    } else {
      synth.stopReverseBeeps();
    }
    return () => synth.stopReverseBeeps();
  }, [gear, speed, isDriving, audioEnabled]);

  // Walkie talkie dynamic chimes
  const walkiePhrases = [
    'Heavy cow sitting near the state milestone 52. Give a loud telolet horn!',
    'Pothole detected near the RTO checkpost! Slow down co-drivers.',
    'Ah, beautiful sunset view of the Far Himalayas lookouts!',
    'Overtaking a slow container cargo truck on the single lane... Horn OK Please!',
    'State police checkpoint set up at the crossroad crossing. Have license files ready!',
    'Toll plaza barrier lane 3 autotag is working today. Fast transit!',
    'Pneumatic air horn sounds majestic today! Safe driving!',
    'Rain forecast on Western Ghats road. Dangerous landslide alert. Keep a direct watch!',
  ];

  const walkiePilots = ['Sardar Ji 📿', 'Amit Belbari Express ⚡', 'Pilot Vikram 🚌', 'Gurpreet Sher-e-Punjab 🦁', 'Sanjay Deluxe 🌟'];

  useEffect(() => {
    const interval = setInterval(() => {
      const randomPilot = walkiePilots[Math.floor(Math.random() * walkiePilots.length)];
      const randomText = walkiePhrases[Math.floor(Math.random() * walkiePhrases.length)];
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      setWalkieMessages(prev => [
        { id: Date.now(), pilot: randomPilot, text: randomText, time: timeStr },
        ...prev.slice(0, 7)
      ]);

      if (audioEnabled) {
        synth.playClick();
      }
    }, 18000); // New message every 18 seconds
    return () => clearInterval(interval);
  }, [audioEnabled]);

  // Get current checkpoint location
  const goalStopName = isCurrentlyTouring && activeRoute
    ? activeRoute.stops[currentGoalStopIndex]
    : 'Belbari Central Terminus';

  const goalStopCoords = BUS_STOPS[goalStopName];

  // GPS Distance calculations
  const [gpsDistance, setGpsDistance] = useState(0);

  // Check proximity to destination stop
  const [isInsideStopZone, setIsInsideStopZone] = useState(false);
  const [boardingPercentage, setBoardingPercentage] = useState(0);
  const [isBoarding, setIsBoarding] = useState(false);

  // Proximity tick
  useEffect(() => {
    const interval = setInterval(() => {
      const vpos = vehiclePositionRef.current;
      if (!vpos || !goalStopCoords) return;

      const dx = vpos[0] - goalStopCoords.pos[0];
      const dz = vpos[2] - goalStopCoords.pos[2];
      const dist = Math.sqrt(dx*dx + dz*dz);
      setGpsDistance(Math.round(dist));

      // 6 meters radius is a valid boarding stop zone boundary
      if (dist < 8) {
        setIsInsideStopZone(true);
      } else {
        setIsInsideStopZone(false);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [goalStopCoords]);

  // Handle passenger boarding task
  const triggerBoarding = () => {
    if (!isDriving) {
      setHudMessage('❌ Sit in the driver seat first to operate boarding controls!');
      return;
    }
    if (!isInsideStopZone) {
      setHudMessage('❌ Drive closer to the highlighted golden Bus Stop terminal boundary!');
      return;
    }
    if (!doorsOpen) {
      setHudMessage('⚠️ Open passenger doors (Press G or Door button) to let passengers board!');
      return;
    }
    if (isBoarding) return;

    setIsBoarding(true);
    setBoardingPercentage(0);
    setHudMessage(`🤝 Welcoming travelers at ${goalStopName}... Boarding in progress!`);
  };

  useEffect(() => {
    if (!isBoarding) return;

    const interval = setInterval(() => {
      setBoardingPercentage(prev => {
        const nextVal = prev + 10;
        
        // play coin sound occasionally representing tickets sold!
        if (nextVal % 30 === 0 && audioEnabled) {
          synth.playCoinSale();
        }

        if (nextVal >= 100) {
          clearInterval(interval);
          setIsBoarding(false);
          finishBoarding();
          return 100;
        }
        return nextVal;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [isBoarding, audioEnabled]);

  const finishBoarding = () => {
    // Collect fares
    const passengerGroup = Math.floor(Math.random() * 5) + 6; // 6-10 passengers boarding
    setRoutePassengersBoarded(prev => prev + passengerGroup);
    
    const fareIncome = passengerGroup * 150; // ₹150 INR ticket price
    setEarnings(prev => prev + fareIncome);

    if (audioEnabled) {
      synth.playCheatSuccess();
    }

    setHudMessage(`✅ Boarding complete! ${passengerGroup} passengers climbed aboard. (Ticket Sales: +₹${fareIncome})`);

    // Progress route milestone
    if (isCurrentlyTouring && activeRoute) {
      const nextIndex = currentGoalStopIndex + 1;
      if (nextIndex < activeRoute.stops.length) {
        setCurrentGoalStopIndex(nextIndex);
        setHudMessage(`🛣️ Station complete! Destination updated. Proceed to: ${activeRoute.stops[nextIndex]}`);
      } else {
        // Finished whole route!
        completeCareerRoute();
      }
    } else {
      setHudMessage(`📍 You are free driving! Want to earn big Rupees? Go to "ROUTE DISPATCH" tab to launch a trip!`);
    }
  };

  const completeCareerRoute = async () => {
    setIsCurrentlyTouring(false);
    
    // Calculate total payout bonus
    const routeBonus = activeRoute.payout;
    setEarnings(prev => prev + routeBonus);
    setTotalMiles(prev => Number((prev + (activeRoute.stops.length * 3.5)).toFixed(1)));

    // Save run details dynamically to DB
    const safetyStarRating = Number(currentRouteStars.toFixed(1));
    const secondsTaken = Math.floor(Math.random() * 45) + 75; // simulated elapsed route time
    
    try {
      await db.runs.add({
        pilotName: pilotName || 'Anon Pilot',
        routeName: activeRoute.name,
        busName: activeVehicle.name,
        passengersCarried: routePassengersBoarded,
        earnings: activeRoute.payout + (routePassengersBoarded * 150),
        safetyStars: safetyStarRating,
        timeTaken: secondsTaken,
        completedAt: new Date()
      });
    } catch (e) {
      console.warn("DB save error", e);
    }

    setHudMessage(`🏆 CONGRATULATIONS! Route fully conquered! Safety Stars: ${safetyStarRating}⭐. Payout Payout: +₹${routeBonus}!`);
    setActiveTab('leaderboard');
  };

  const handleLaunchRoute = (route: BusRoute) => {
    setActiveRoute(route);
    setCurrentGoalStopIndex(0);
    setRoutePassengersBoarded(0);
    setCurrentRouteStars(5.0);
    setIsCurrentlyTouring(true);
    setHudMessage(`🛣️ ROUTE LAUNCHED: ${route.name}. Drive to ${route.stops[0]} terminal, stop, and open doors (G)!`);
    setActiveTab('drive');
    synth.playCheatSuccess();
  };

  const toggleSound = () => {
    setAudioEnabled(prev => !prev);
  };

  // Completely delete and reset all game database state and local stats
  const handleDeleteGame = async () => {
    try {
      await Promise.all([
        db.runs.clear(),
        db.liveries.clear()
      ]);
      setEarnings(0);
      setTotalMiles(0);
      setCurrentGoalStopIndex(0);
      setRoutePassengersBoarded(0);
      setIsCurrentlyTouring(false);
      setCurrentRouteStars(5.0);
      setVehicleHealth(100);
      setFuel(100);
      
      // Reset aesthetics & customization
      setPaintColor('#b91c1c');
      setStripeColor('#fbbf24');
      setStickerId('flag');
      setLedText('DELHI ➔ JAIPUR DIRECT');
      setQuoteText('HORN OK PLEASE');
      setTasselsEnabled(true);
      setUnderglowColor('#00ffea');
      setCustomLiveryName('My Classic tricolor');
      
      setCustomLength(11.0);
      setCustomWidth(2.55);
      setHorsePower(320);
      setBrakeStrength(0.65);
      setSuspensionBounciness(0.40);
      setWheelType('alloy');
      setModSetupName('Heavy Highway Tune');
      setActiveVehicle(VEHICLE_DATABASE['8000']);

      if (audioEnabled) {
        synth.playCheatFailure();
      }
      setHudMessage('💥 GAME DELETED: All save files, career progress, custom liveries, and telemetry have been erased and reset!');
    } catch (err) {
      console.warn("Delete game error", err);
    }
  };

  // Livery Library controls
  const handleSaveLivery = async () => {
    try {
      await db.liveries.add({
        name: customLiveryName || 'My Custom Route Master',
        paintColor,
        stripeColor,
        stickerId,
        ledText,
        quoteText,
        tasselsEnabled,
        underglowColor,
        createdAt: new Date()
      });
      setHudMessage(`🎨 Saved Livery "${customLiveryName}" successfully into local library!`);
      synth.playCheatSuccess();
    } catch (e) {
      setHudMessage('❌ Could not save livery.');
    }
  };

  // Mods file JSON sync / import / export
  const exportModSetup = () => {
    const fileData = {
      game: 'BUSSIN',
      modSetupName,
      specs: {
        customLength,
        customWidth,
        horsePower,
        brakeStrength,
        suspensionBounciness,
        wheelType
      },
      livery: {
        paintColor,
        stripeColor,
        stickerId,
        ledText,
        quoteText,
        tasselsEnabled,
        underglowColor
      }
    };
    
    const blob = new Blob([JSON.stringify(fileData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${modSetupName.toLowerCase().replace(/\s+/g, '_')}_bussin_mod.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setHudMessage(`📂 Exported vehicle setup mod "${modSetupName}" successfully!`);
    synth.playCheatSuccess();
  };

  const handleImportMod = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.game !== 'BUSSIN' || !parsed.specs) {
          throw new Error('Invalid setup file.');
        }

        // Apply Specs
        setModSetupName(parsed.modSetupName || 'Imported Mod');
        setCustomLength(parsed.specs.customLength ?? 11.0);
        setCustomWidth(parsed.specs.customWidth ?? 2.55);
        setHorsePower(parsed.specs.horsePower ?? 320);
        setBrakeStrength(parsed.specs.brakeStrength ?? 0.65);
        setSuspensionBounciness(parsed.specs.suspensionBounciness ?? 0.40);
        setWheelType(parsed.specs.wheelType ?? 'alloy');

        // Apply Livery if packed
        if (parsed.livery) {
          setPaintColor(parsed.livery.paintColor ?? '#b91c1c');
          setStripeColor(parsed.livery.stripeColor ?? '#fbbf24');
          setStickerId(parsed.livery.stickerId ?? 'flag');
          setLedText(parsed.livery.ledText ?? 'DELHI DIRECT');
          setQuoteText(parsed.livery.quoteText ?? 'HORN OK PLEASE');
          setTasselsEnabled(parsed.livery.tasselsEnabled ?? true);
          setUnderglowColor(parsed.livery.underglowColor ?? '#00ffea');
        }

        setHudMessage(`📂 Imported and active setup mod file applied successfully!`);
        synth.playCheatSuccess();
      } catch (err) {
        setHudMessage('❌ Invalid setup mod file format.');
        synth.playCheatFailure();
      }
    };
    reader.readAsText(file);
  };

  // Keyboard hooks for visual indicators, toggle door, horns chimes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === 'g' || e.key === 'G') {
        const nextState = !doorsOpen;
        setDoorsOpen(nextState);
        synth.playDoorPneumatic();
        setHudMessage(nextState ? '🚪 Passenger doors slid open. Hydraulic hiss!' : '🚪 Passenger doors locked closed.');
      }

      if (e.key === 'q' || e.key === 'Q') {
        setGear(prev => {
          const nextGear = prev === 'D' ? 'N' : prev === 'N' ? 'R' : 'D';
          synth.playClick();
          return nextGear;
        });
      }

      // Headlights toggle keyboard
      if (e.key === 'l' || e.key === 'L') {
        setHeadlightsEnabled(prev => !prev);
        synth.playClick();
      }

      // Horn keys chimes
      if (e.key === 'h' || e.key === 'H') {
        synth.playMusicalHorn();
      }
      if (e.key === 'j' || e.key === 'J') {
        synth.playTeloletHorn();
      }
      if (e.key === 'k' || e.key === 'K') {
        synth.playPressureHorn();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [doorsOpen]);

  // Combined customization specifications passed to 3D Canvas
  const dynamicSpecs = useMemo(() => {
    return {
      length: activeVehicle.code === '8400' ? customLength : activeVehicle.args[2],
      width: activeVehicle.code === '8400' ? customWidth : activeVehicle.args[0],
      height: activeVehicle.args[1],
      mass: activeVehicle.mass,
      horsePower: activeVehicle.code === '8400' ? horsePower : 300,
      brakeStrength: activeVehicle.code === '8400' ? brakeStrength : 0.6,
      suspensionBounciness: activeVehicle.code === '8400' ? suspensionBounciness : 0.4,
    };
  }, [activeVehicle, customLength, customWidth, horsePower, brakeStrength, suspensionBounciness]);

  return (
    <div className="w-full h-screen bg-stone-950 text-white relative select-none overflow-hidden font-sans">
      
      {/* 1. BACKGROUND SCENIC GRADIENT CANVAS */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-stone-900/40 via-stone-950 to-stone-950 pointer-events-none" />

      {/* 2. MAIN HEADER APP BRANDING */}
      <header className="absolute top-4 left-4 z-40 bg-stone-900/90 backdrop-blur-xl border border-stone-800/80 rounded-2xl flex items-center justify-between p-3.5 shadow-2xl max-w-sm tracking-tight transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 via-white to-orange-500 rounded-xl flex items-center justify-center font-extrabold text-stone-950 text-base shadow-inner antialiased min-w-10">
            BUS
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold tracking-tight text-white uppercase font-sans">BUSSIN</h1>
              <span className="text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 py-0.2 rounded-md font-bold uppercase tracking-wider font-mono">India v2</span>
            </div>
            <p className="text-[10px] text-stone-400 font-medium truncate mt-0.5 max-w-[200px]">Chaotic Roads & Traffic Simulator</p>
          </div>
        </div>
      </header>

      {/* 3. DYNAMIC METRICS READOUT BAR (HUD GAUGE - Monospace Pairings) */}
      {uiVisible && (
        <div className="absolute top-4 right-4 z-40 flex gap-2">
          {/* Main speedo digital display */}
          <div className="bg-stone-900/95 backdrop-blur-xl border border-stone-800 rounded-2xl p-3 shadow-2xl flex items-center gap-4">
            <div className="flex flex-col text-right">
              <span className="text-[8px] text-stone-500 uppercase tracking-widest font-mono font-bold">Wallet Cash</span>
              <span className="text-sm font-extrabold text-emerald-400 font-mono tracking-tight">₹{earnings.toLocaleString('en-IN')}</span>
            </div>

            <div className="w-px h-8 bg-stone-800" />
            
            <div className="flex flex-col text-right">
              <span className="text-[8px] text-stone-500 uppercase tracking-widest font-mono font-bold">Active Pilot</span>
              <span className="text-xs font-bold text-stone-300 truncate max-w-[90px]">{pilotName}</span>
            </div>
          </div>

          {/* Odometer metrics */}
          <div className="bg-stone-900/95 backdrop-blur-xl border border-stone-800 rounded-2xl p-3 shadow-2xl flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="text-[8px] text-stone-500 uppercase tracking-widest font-mono font-bold">Odometer</span>
              <span className="text-xs font-bold font-mono text-amber-400">{totalMiles.toFixed(1)} km</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. DRIVER HUD CONSOLE DASHBOARD OVERLAY */}
      {uiVisible && isDriving && (
        <div id="Dash HUD Instrument" className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-stone-900/90 backdrop-blur-xl border border-stone-800/90 rounded-[28px] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col gap-3 max-w-4xl w-[92%]">
          {/* Top Status Alert Line */}
          <div className="flex items-center justify-between text-xs border-b border-stone-800/80 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">GPS Dispatch</span>
              <span className="text-stone-300 font-medium truncate max-w-md">{hudMessage}</span>
            </div>

            {isCurrentlyTouring && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-stone-400 font-mono">Tour Payout: <strong className="text-emerald-400">₹{activeRoute.payout}</strong></span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            
            {/* DIGITAL GAUGES SECTION (Speed, Fuel, Passengers) */}
            <div className="flex items-center gap-5">
              {/* SPEED GAUGEMETER */}
              <div className="flex items-center gap-2.5">
                <div className="w-12 h-12 bg-stone-950/90 border border-stone-800 rounded-full flex flex-col items-center justify-center shadow-inner relative">
                  <span className="text-[15px] font-mono font-extrabold tracking-tighter text-red-500">{Math.round(Math.abs(speed * 3.6))}</span>
                  <span className="text-[7px] text-stone-500 font-mono font-bold uppercase -mt-1">km/h</span>
                </div>
                <div className="text-left">
                  <span className="text-[8px] text-stone-500 block uppercase tracking-wider font-mono">Analog dials</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-stone-300 capitalize">{activeVehicle.name.split(' (')[0]}</span>
                    <span className={`text-[9px] font-bold px-1 py-0.2 rounded font-mono ${gear === 'D' ? 'bg-green-500/10 text-green-400' : gear === 'R' ? 'bg-red-500/10 text-red-400 animate-pulse' : 'bg-stone-800 text-stone-400'}`}>{gear}</span>
                  </div>
                </div>
              </div>

              <div className="w-px h-10 bg-stone-800 hidden sm:block" />

              {/* FUEL & STRUCTURAL INTEGRITY */}
              <div className="flex flex-col gap-1.5 min-w-[130px]">
                <div className="flex items-center justify-between text-[9px] text-stone-400">
                  <span className="uppercase font-mono flex items-center gap-1"><BatteryCharging className="w-3 h-3 text-amber-500" /> Diesel Fuel</span>
                  <span className="font-mono text-emerald-400 font-bold">{Math.round(fuel)}%</span>
                </div>
                <div className="w-full h-1.5 bg-stone-950 rounded-full overflow-hidden border border-stone-850">
                  <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-300" style={{ width: `${fuel}%` }} />
                </div>

                <div className="flex items-center justify-between text-[9px] text-stone-400">
                  <span className="uppercase font-mono flex items-center gap-1"><Shield className="w-3 h-3 text-red-500" /> Bus Body HP</span>
                  <span className={`font-mono font-bold ${vehicleHealth < 40 ? 'text-red-400 animate-pulse' : 'text-stone-300'}`}>{Math.round(vehicleHealth)}%</span>
                </div>
                <div className="w-full h-1.5 bg-stone-950 rounded-full overflow-hidden border border-stone-850">
                  <div className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300" style={{ width: `${vehicleHealth}%` }} />
                </div>
              </div>

              <div className="w-px h-10 bg-stone-800 hidden md:block" />

              {/* ACTIVE BOARDING PASSENGERS & STOPS */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col text-left">
                  <span className="text-[8px] text-stone-500 block uppercase tracking-wider font-mono">Bus Passengers</span>
                  <span className="text-xs font-bold text-stone-200">{routePassengersBoarded} Onboard</span>
                </div>
                
                {isInsideStopZone && (
                  <button 
                    onClick={triggerBoarding}
                    disabled={isBoarding}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg text-[10px] font-bold shadow-md active:scale-95 transition-all flex items-center gap-1 shrink-0"
                  >
                    <User className="w-3.5 h-3.5" />
                    {isBoarding ? `Loading ${boardingPercentage}%` : 'Let Travelers Board'}
                  </button>
                )}
              </div>

            </div>

            {/* CLICKABLE PRESSURE & TELOLET HORNS (South Asian signature chimes) */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[8px] text-stone-500 font-mono uppercase tracking-widest block md:hidden xl:block">Pressure horns:</span>
              
              <button 
                onClick={() => synth.playMusicalHorn()} 
                className="px-2.5 py-1.5 bg-stone-800 hover:bg-orange-600 text-stone-300 hover:text-white rounded-lg text-[9px] font-mono font-bold border border-stone-750 transition-all cursor-pointer shadow active:scale-95"
                title="Shortcut: Key H"
              >
                📿 Musical (Kye H)
              </button>

              <button 
                onClick={() => synth.playTeloletHorn()} 
                className="px-2.5 py-1.5 bg-stone-800 hover:bg-yellow-500 text-stone-300 hover:text-stone-950 rounded-lg text-[9px] font-mono font-bold border border-stone-750 transition-all cursor-pointer shadow active:scale-95"
                title="Shortcut: Key J"
              >
                🎺 Telolet (Key J)
              </button>

              <button 
                onClick={() => synth.playPressureHorn()} 
                className="px-2.5 py-1.5 bg-stone-800 hover:bg-red-600 text-stone-300 hover:text-white rounded-lg text-[9px] font-mono font-bold border border-stone-750 transition-all cursor-pointer shadow active:scale-95"
                title="Shortcut: Key K"
              >
                📢 Air Pressure (Key K)
              </button>
            </div>

            {/* PHYSICAL INTERACTIVE DASH CONTROL KEYS (Doors toggle, gear shift, headlights) */}
            <div className="flex gap-1.5">
              <button 
                onClick={() => {
                  const s = !doorsOpen;
                  setDoorsOpen(s);
                  synth.playDoorPneumatic();
                }}
                className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer active:scale-90 w-12 h-12 ${doorsOpen ? 'bg-teal-500/10 border-teal-500 text-teal-400' : 'bg-stone-800/80 border-stone-700 text-stone-400 hover:text-stone-300'}`}
                title="Shortcut: Key G"
              >
                <div className="text-[13px] font-extrabold -mb-0.5">{doorsOpen ? '🚪 ☄' : '🚪 ■'}</div>
                <span className="text-[7px] uppercase font-mono tracking-tight font-bold">Doors (G)</span>
              </button>

              <button 
                onClick={() => setGear(prev => prev === 'D' ? 'N' : prev === 'N' ? 'R' : 'D')}
                className="p-2 bg-stone-800/80 border border-stone-700 hover:border-amber-500 text-stone-300 hover:text-white rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer active:scale-90 w-12 h-12"
                title="Shortcut: Key Q to cycle Gear"
              >
                <span className="text-xs font-black font-mono text-amber-500">{gear}</span>
                <span className="text-[7px] uppercase font-mono tracking-tight font-bold">Gear (Q)</span>
              </button>

              <button 
                onClick={() => setHeadlightsEnabled(prev => !prev)}
                className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer active:scale-90 w-12 h-12 ${headlightsEnabled ? 'bg-amber-500/15 border-amber-500 text-amber-400' : 'bg-stone-800/80 border-stone-700 text-stone-400 hover:text-stone-300'}`}
                title="Shortcut: Key L"
              >
                <span className="text-[13px] font-semibold">{headlightsEnabled ? '💡 On' : '💡 Off'}</span>
                <span className="text-[7px] uppercase font-mono tracking-tight font-bold">Lights (L)</span>
              </button>

              <button 
                onClick={() => {
                  setVehicleHealth(100);
                  setFuel(100);
                  setCurrentRouteStars(5.0);
                  synth.playCheatSuccess();
                  setHudMessage('🔧 RTO emergency roadside mechanic repaired and refueled your Bus!');
                }}
                className="p-2 bg-stone-800/80 border border-stone-700 hover:border-teal-500 hover:text-teal-400 text-stone-400 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer active:scale-90 w-12 h-12"
              >
                <span className="text-xs">🔧</span>
                <span className="text-[7px] uppercase font-mono tracking-tight font-bold">Repair</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. PRIMARY FULL-SCALE SIMULATOR CONTROL HUBS */}
      <div className="absolute left-4 bottom-4 z-40 flex flex-col gap-2">
        <div className="bg-stone-900/95 backdrop-blur-xl border border-stone-800 rounded-2xl p-1.5 shadow-2xl flex gap-1 items-center">
          <button 
            onClick={() => {
              setActiveTab('drive');
              synth.playClick();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 transition-all cursor-pointer ${activeTab === 'drive' ? 'bg-red-600 text-white shadow' : 'text-stone-400 hover:text-stone-200'}`}
          >
            <Compass className="w-3.5 h-3.5 animate-spin-slow" /> Driving Deck
          </button>

          <button 
            onClick={() => {
              setActiveTab('routes');
              synth.playClick();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 transition-all cursor-pointer ${activeTab === 'routes' ? 'bg-red-600 text-white shadow' : 'text-stone-400 hover:text-stone-200'}`}
          >
            <Navigation className="w-3.5 h-3.5" /> Route Depot
          </button>

          <button 
            onClick={() => {
              setActiveTab('livery');
              synth.playClick();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 transition-all cursor-pointer ${activeTab === 'livery' ? 'bg-red-600 text-white shadow' : 'text-stone-400 hover:text-stone-200'}`}
          >
            <Palette className="w-3.5 h-3.5" /> Livery Customizer
          </button>

          <button 
            onClick={() => {
              setActiveTab('mods');
              synth.playClick();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 transition-all cursor-pointer ${activeTab === 'mods' ? 'bg-red-600 text-white shadow' : 'text-stone-400 hover:text-stone-200'}`}
          >
            <Sliders className="w-3.5 h-3.5" /> Mod Chassis Specs
          </button>

          <button 
            onClick={() => {
              setActiveTab('leaderboard');
              synth.playClick();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 transition-all cursor-pointer ${activeTab === 'leaderboard' ? 'bg-red-600 text-white shadow' : 'text-stone-400 hover:text-stone-200'}`}
          >
            <Trophy className="w-3.5 h-3.5" /> Leaderboard
          </button>

          <button 
            onClick={() => {
              setActiveTab('saves');
              synth.playClick();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 transition-all cursor-pointer ${activeTab === 'saves' ? 'bg-red-600 text-white shadow' : 'text-stone-400 hover:text-stone-200'}`}
          >
            <FileText className="w-3.5 h-3.5" /> Mod Save/Sync
          </button>

          <div className="w-px h-5 bg-stone-800" />

          {/* Toggle hud visibilities */}
          <button 
            onClick={() => setUiVisible(prev => !prev)}
            className="p-1 px-2.5 text-stone-500 hover:text-stone-300 rounded cursor-pointer transition"
            title="Toggle Complete Dashboard HUD Overlay (Shortcut: H)"
          >
            {uiVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 6. EXPANDED POPUP INTERACTIVE MENUS OR SIDEBARS */}
      {activeTab !== 'drive' && (
        <div className="absolute left-6 top-20 bottom-24 z-50 w-[440px] bg-stone-900/95 backdrop-blur-2xl border border-stone-800/90 rounded-3xl shadow-[0_30px_70px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-250">
          
          {/* POPUP CONTAINER HEADER */}
          <div className="p-4 bg-stone-950/70 border-b border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {activeTab === 'routes' ? '🛣️' : activeTab === 'livery' ? '🎨' : activeTab === 'mods' ? '🔧' : activeTab === 'leaderboard' ? '🏆' : '📂'}
              </span>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-white">
                  {activeTab === 'routes' ? 'Route Dispatch Depot' : activeTab === 'livery' ? 'Bus Livery Customizer' : activeTab === 'mods' ? 'Chassis Mod Spec Engine' : activeTab === 'leaderboard' ? 'RTO Hall Of Fame Leaderboard' : 'Career Save & Mod Sync'}
                </h2>
                <p className="text-[9px] text-stone-400 tracking-tight font-medium">BUSSIN Core Management Deck</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('drive')}
              className="text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-800 font-bold transition text-xs"
            >
              ✕ Close
            </button>
          </div>

          {/* TAB CONTENT VIEWPAL */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin text-left space-y-4">
            
            {/* 6A. ROUTE DISPATCH DEPOT */}
            {activeTab === 'routes' && (
              <div className="space-y-3">
                <p className="text-[11px] text-stone-400 leading-relaxed font-medium">
                  Dispatch a real Indian transport route. Stop at designated terminals inside the gold glowing boundaries to welcome chaotic passengers on board. Safely steer along the highways to unlock maximum Rupees!
                </p>

                {isCurrentlyTouring && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex flex-col gap-2 relative">
                    <span className="text-[9px] text-amber-500 block uppercase font-mono font-bold">🛣️ Current Active Route</span>
                    <h3 className="text-xs font-bold text-stone-200">{activeRoute.name}</h3>
                    <p className="text-[10px] text-stone-400">Milestone objective: drive to stop <span className="text-amber-400 font-bold">#{currentGoalStopIndex + 1} ({goalStopName})</span></p>
                    <button 
                      onClick={() => {
                        setIsCurrentlyTouring(false);
                        setHudMessage('🛣️ Dispatched route cancelled. Now in free-exploration driving.');
                        synth.playCheatFailure();
                      }}
                      className="mt-1 px-3 py-1.5 bg-red-600 text-stone-100 rounded-lg text-[10px] font-bold w-max active:scale-95 transition cursor-pointer"
                    >
                      Abort Active Run
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  <span className="text-[9px] text-stone-500 block uppercase font-mono tracking-widest font-bold">Select and launch a run:</span>
                  {BUS_ROUTES.map((route) => (
                    <div 
                      key={route.id} 
                      className={`border rounded-xl p-3.5 transition-all shadow-md relative ${
                        activeRoute?.id === route.id && isCurrentlyTouring 
                          ? 'bg-amber-500/5 border-amber-500/60' 
                          : 'bg-stone-950/70 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-extrabold text-stone-100">{route.name}</h4>
                            <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded font-mono ${route.difficulty === 'Easy' ? 'bg-green-500/10 text-green-400' : route.difficulty === 'Medium' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>
                              {route.difficulty}
                            </span>
                          </div>
                          <p className="text-[10px] text-stone-400 mt-1 leading-relaxed">{route.description}</p>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-stone-850/60 flex items-center justify-between text-[10px] text-stone-400">
                        <div className="flex gap-4">
                          <span>Route Payout: <strong className="text-emerald-400 font-mono font-bold">₹{route.payout}</strong></span>
                          <span>stops: <strong className="text-stone-300 font-mono">{route.stops.length}</strong></span>
                        </div>
                        
                        <button 
                          onClick={() => handleLaunchRoute(route)}
                          className="px-3 py-1 bg-gradient-to-r from-red-600 to-orange-600 text-white font-extrabold rounded-lg hover:from-red-500 transition active:scale-95 text-[10px] flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-white" /> Dispatch Tour
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6B. LIVERY CUSTOMIZER */}
            {activeTab === 'livery' && (
              <div className="space-y-4">
                <p className="text-[11px] text-stone-400 leading-relaxed font-medium">
                  Style your Indian coach, specify RTO bumper slogans, front decals, and glowing neon underbellys. Your customized livery wraps immediately around the 3D model in real time!
                </p>

                {/* Vehicle category switcher */}
                <div className="space-y-3 p-3 bg-stone-950/40 rounded-2xl border border-stone-850">
                  <span className="text-[10px] text-stone-500 uppercase tracking-widest font-mono font-bold block">1. Select Ride Category:</span>
                  <div className="grid grid-cols-5 gap-1 bg-stone-950 p-1 rounded-xl border border-stone-850">
                    {(['bus', 'heavy', 'car', 'bike', 'aerial'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setGarageCategory(cat);
                          synth.playClick();
                        }}
                        className={`py-1 text-[9px] uppercase tracking-wider font-extrabold font-mono rounded-lg transition-all text-center cursor-pointer ${
                          garageCategory === cat
                            ? 'bg-red-650 text-white shadow-sm'
                            : 'text-stone-400 hover:text-stone-100 hover:bg-stone-900/40'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <span className="text-[10px] text-stone-500 uppercase tracking-widest font-mono font-bold block">2. Choose Mod Ride Model:</span>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {Object.values(VEHICLE_DATABASE).filter(v => v.type === garageCategory).map((bus) => (
                      <button
                        key={bus.code}
                        onClick={() => {
                          setActiveVehicle(bus);
                          setPaintColor(bus.color);
                          synth.playClick();
                          setHudMessage(`Spawned vehicle model: ${bus.name}`);
                        }}
                        className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                          activeVehicle.code === bus.code 
                            ? 'bg-red-650/10 border-red-500 text-red-400' 
                            : 'bg-stone-950/80 border-stone-850 hover:border-stone-750 text-stone-300'
                        }`}
                      >
                        <span className="text-[10px] font-black tracking-tight truncate leading-tight">{bus.name.split(' (')[0]}</span>
                        <span className="text-[8px] text-stone-400 block truncate leading-tight">{bus.description.slice(0, 48)}...</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Paint */}
                <div className="p-3 bg-stone-950/50 rounded-2xl border border-stone-800 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono font-bold block">1. Primary Body Paint:</span>
                    <input 
                      type="color" 
                      value={paintColor}
                      onChange={(e) => setPaintColor(e.target.value)}
                      className="w-5.5 h-5.5 rounded border border-stone-700 bg-transparent cursor-pointer shrink-0"
                    />
                  </div>
                  
                  <div className="flex gap-2 justify-between">
                    {[
                      { hex: '#b91c1c', label: 'Cherry Red' },
                      { hex: '#1d4ed8', label: 'Royal Blue' },
                      { hex: '#ca8a04', label: 'Golden' },
                      { hex: '#15803d', label: 'Forest' },
                      { hex: '#0f172a', label: 'Sleek Black' },
                      { hex: '#ec4899', label: 'Hot Pink' }
                    ].map(preset => (
                      <button
                        key={preset.hex}
                        onClick={() => {
                          setPaintColor(preset.hex);
                          synth.playClick();
                        }}
                        className="w-6 h-6 rounded-full border-2 border-stone-800 cursor-pointer active:scale-90 transition-all shadow"
                        style={{ backgroundColor: preset.hex }}
                        title={preset.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Secondary Stripes */}
                <div className="p-3 bg-stone-950/50 rounded-2xl border border-stone-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono font-bold block">2. Decal Side Stripes Color:</span>
                    <input 
                      type="color" 
                      value={stripeColor}
                      onChange={(e) => setStripeColor(e.target.value)}
                      className="w-5.5 h-5.5 rounded border border-stone-700 bg-transparent cursor-pointer shrink-0"
                    />
                  </div>
                  <div className="flex gap-2 justify-between">
                    {['#fbbf24', '#ffffff', '#ef4444', '#10b981', '#a855f7', '#64748b'].map(stripe => (
                      <button
                        key={stripe}
                        onClick={() => {
                          setStripeColor(stripe);
                          synth.playClick();
                        }}
                        className="w-6 h-6 rounded-full border-2 border-stone-800 cursor-pointer active:scale-90 transition-all shadow"
                        style={{ backgroundColor: stripe }}
                      />
                    ))}
                  </div>
                </div>

                {/* Windshield stickers & Decals */}
                <div className="p-3 bg-stone-950/50 rounded-2xl border border-stone-800 space-y-2">
                  <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono font-bold block">3. Windshield Decal Sticker:</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'none', label: 'No Sticker' },
                      { id: 'flag', label: 'Tricolor 🇮🇳' },
                      { id: 'om', label: 'Om 🕉️' },
                      { id: 'ganesha', label: 'Ganesha 🕉️' },
                      { id: 'stars', label: 'Stars ⭐' },
                      { id: 'lightning', label: 'Lightning ⚡' }
                    ].map((badge) => (
                      <button
                        key={badge.id}
                        onClick={() => {
                          setStickerId(badge.id as any);
                          synth.playClick();
                        }}
                        className={`text-[10px] py-2 px-1 border rounded-lg text-center transition cursor-pointer ${
                          stickerId === badge.id 
                            ? 'bg-amber-500 text-stone-950 border-amber-400 font-mono font-bold' 
                            : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-300'
                        }`}
                      >
                        {badge.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slogans & LED route customizer */}
                <div className="p-3 bg-stone-950/50 rounded-2xl border border-stone-800 space-y-3">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono font-bold block">4. LED Front Destination Plate:</span>
                    <input 
                      type="text" 
                      value={ledText}
                      onChange={(e) => setLedText(e.target.value.toUpperCase())}
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs font-mono text-amber-500 uppercase tracking-tight focus:outline-none focus:border-amber-400 shadow-inner"
                      placeholder="e.g. DELHI EXPRES"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono font-bold block">5. Bumper Mud-flap Custom Slogan:</span>
                    <input 
                      type="text" 
                      value={quoteText}
                      onChange={(e) => setQuoteText(e.target.value.toUpperCase())}
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs font-mono text-stone-300 focus:outline-none focus:border-stone-700 shadow-inner"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['HORN OK PLEASE', 'MAA KI DUA', 'KING OF THE ROAD', 'DEVI PRASAD TRAVELS', 'BURA MAT DEKHO', 'DHEERE CHALO'].map((phrase) => (
                        <button
                          key={phrase}
                          onClick={() => {
                            setQuoteText(phrase);
                            synth.playClick();
                          }}
                          className="bg-stone-900 border border-stone-850 hover:border-stone-750 text-[9px] text-stone-400 px-2 py-0.5 rounded cursor-pointer"
                        >
                          {phrase}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mirror tassels & Neon glow toggle */}
                <div className="p-3 bg-stone-950/50 rounded-2xl border border-stone-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-300">Dangling Mirror Tassels</span>
                    <input 
                      type="checkbox" 
                      checked={tasselsEnabled}
                      onChange={(e) => {
                        setTasselsEnabled(e.target.checked);
                        synth.playClick();
                      }}
                      className="w-4 h-4 accent-red-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono font-bold block">Neon Chassis Underglow:</span>
                    <div className="flex gap-2 justify-between">
                      {[
                        { color: 'none', hex: '#000000', label: 'None' },
                        { color: '#00ffea', hex: '#00ffea', label: 'Cyan' },
                        { color: '#10b981', hex: '#10b981', label: 'Green' },
                        { color: '#ec4899', hex: '#ec4899', label: 'Pink' },
                        { color: '#fbbf24', hex: '#fbbf24', label: 'Gold' }
                      ].map(neon => (
                        <button
                          key={neon.label}
                          onClick={() => {
                            setUnderglowColor(neon.color);
                            synth.playClick();
                          }}
                          className={`text-[9.5px] py-1 px-2 border rounded-md font-medium cursor-pointer transition-all ${
                            underglowColor === neon.color 
                              ? 'bg-stone-900 text-teal-400 border-teal-500' 
                              : 'bg-stone-950 border-stone-850 text-stone-400'
                          }`}
                        >
                          {neon.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>


                {/* 6C. MUD MOD & ROUGH HANDLING CONFIGURATION */}
                <div className="p-3 border border-stone-850 rounded-2xl bg-stone-950/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono font-bold block flex items-center gap-1">
                      🟫 Real-Time Mud Mod:
                    </span>
                    <button
                      onClick={() => {
                        setMudIntensity(0);
                        synth.playClick();
                        setHudMessage("🚿 Vehicle washed clean of all mud!");
                      }}
                      className="px-2.5 py-1 text-[9px] font-mono font-bold bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-lg cursor-pointer transition"
                    >
                      🚿 WASH VEHICLE
                    </button>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-stone-400">
                      <span>Accumulated Splatters</span>
                      <span className="text-amber-500 font-bold">{(mudIntensity * 100).toFixed(0)}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={mudIntensity}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setMudIntensity(val);
                        if (val > 0) {
                          setHudMessage(`Mud splattered to ${(val * 100).toFixed(0)}%! Heavy off-road friction applied.`);
                        } else {
                          setHudMessage("Vehicle is pristine and clean.");
                        }
                      }}
                      className="w-full accent-amber-500 h-1 bg-stone-800 rounded-lg cursor-pointer"
                    />
                    <p className="text-[8.5px] text-stone-400 leading-normal">
                      Drive deep inside the dynamic off-road mud pit to naturally soil your tyres, or slide this lever to apply immediate drag coefficients, reduced steer bite, and dark tire mud textures!
                    </p>
                  </div>
                </div>

                {/* Quick Save Livery to Local DB */}
                <div className="pt-2 bg-stone-950/50 p-3 rounded-2xl border border-stone-800 space-y-2">
                  <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono font-bold block">Save Livery Setup:</span>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={customLiveryName}
                      onChange={(e) => setCustomLiveryName(e.target.value)}
                      className="flex-1 bg-stone-950 border border-stone-850 text-xs text-stone-200 rounded-xl p-2 focus:outline-none"
                    />
                    <button 
                      onClick={handleSaveLivery}
                      className="px-4 py-2 bg-gradient-to-r from-red-650 to-red-550 text-white font-extrabold text-xs rounded-xl active:scale-95 transition cursor-pointer"
                    >
                      Save Configuration
                    </button>
                  </div>
                </div>

                {savedLiveries && savedLiveries.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[9px] text-stone-500 uppercase tracking-widest font-mono font-bold block">Saved Presets:</span>
                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto scrollbar-none">
                      {savedLiveries.map((liv) => (
                        <div key={liv.id} className="p-2 bg-stone-950 border border-stone-850 rounded-xl flex items-center justify-between text-xs transition hover:border-stone-750">
                          <div>
                            <p className="font-bold text-stone-200">{liv.name}</p>
                            <span className="text-[8px] text-stone-500 font-mono">Decal: {liv.stickerId.toUpperCase()} • Quote: {liv.quoteText}</span>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                setPaintColor(liv.paintColor);
                                setStripeColor(liv.stripeColor);
                                setStickerId(liv.stickerId);
                                setLedText(liv.ledText);
                                setQuoteText(liv.quoteText);
                                setTasselsEnabled(liv.tasselsEnabled);
                                setUnderglowColor(liv.underglowColor);
                                setCustomLiveryName(liv.name);
                                synth.playCheatSuccess();
                                setHudMessage(`🎨 Loaded custom preset: ${liv.name}`);
                              }}
                              className="px-2 py-1 bg-stone-900 border border-stone-750 hover:bg-stone-800 rounded text-[9px] font-bold text-stone-300 cursor-pointer"
                            >
                              Load
                            </button>
                            <button
                              onClick={async () => {
                                await db.liveries.delete(liv.id!);
                                synth.playClick();
                              }}
                              className="p-1 px-2 text-stone-600 hover:text-red-400 transition cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* 6C. CHASSIS MOD TUNER */}
            {activeTab === 'mods' && (
              <div className="space-y-4">
                <p className="text-[11px] text-stone-400 leading-relaxed font-medium">
                  Modify the mechanical core specifications of your passenger bus. Our mod vehicle engine allows structural modifications to the frame (width, length), horsepower, and spring suspensions.
                </p>

                {activeVehicle.code !== '8400' && (
                  <div className="p-3 bg-red-950/10 border border-red-950/30 text-[10px] text-red-400 rounded-xl">
                    ⚠️ Custom Sliders are active solely for the <strong className="text-red-300">BUSSIN Custom Chassis (Model: 8400)</strong>. Change your Bus Model on the <strong>LIVERY</strong> tab first to tweak sliders!
                  </div>
                )}

                <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-2xl gap-3 flex flex-col">
                  {/* Slider Length */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-stone-300">Bus Body Length (Meters):</span>
                      <span className="font-mono text-amber-500 font-extrabold">{customLength}m</span>
                    </div>
                    <input 
                      type="range"
                      min="8.5"
                      max="14.5"
                      step="0.5"
                      disabled={activeVehicle.code !== '8400'}
                      value={customLength}
                      onChange={(e) => {
                        setCustomLength(Number(e.target.value));
                        synth.playClick();
                      }}
                      className="w-full h-1 bg-stone-950 accent-amber-500 rounded-lg cursor-pointer disabled:opacity-40"
                    />
                  </div>

                  {/* Slider Width */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-stone-300">Bus Body Width (Meters):</span>
                      <span className="font-mono text-amber-500 font-extrabold">{customWidth}m</span>
                    </div>
                    <input 
                      type="range"
                      min="2.2"
                      max="2.8"
                      step="0.05"
                      disabled={activeVehicle.code !== '8400'}
                      value={customWidth}
                      onChange={(e) => {
                        setCustomWidth(Number(e.target.value));
                        synth.playClick();
                      }}
                      className="w-full h-1 bg-stone-950 accent-amber-500 rounded-lg cursor-pointer disabled:opacity-40"
                    />
                  </div>

                  {/* Engine HP Torque */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-stone-300">Turbo Diesel Horsepower (HP):</span>
                      <span className="font-mono text-emerald-400 font-extrabold">{horsePower} hp</span>
                    </div>
                    <input 
                      type="range"
                      min="200"
                      max="600"
                      step="20"
                      disabled={activeVehicle.code !== '8400'}
                      value={horsePower}
                      onChange={(e) => {
                        setHorsePower(Number(e.target.value));
                        synth.playClick();
                      }}
                      className="w-full h-1 bg-stone-950 accent-emerald-500 rounded-lg cursor-pointer disabled:opacity-40"
                    />
                  </div>

                  {/* Brakes Strength */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-stone-300">Air Brakes Force Factor:</span>
                      <span className="font-mono text-emerald-400 font-extrabold">{Math.round(brakeStrength*100)}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0.30"
                      max="1.00"
                      step="0.05"
                      disabled={activeVehicle.code !== '8400'}
                      value={brakeStrength}
                      onChange={(e) => {
                        setBrakeStrength(Number(e.target.value));
                        synth.playClick();
                      }}
                      className="w-full h-1 bg-stone-950 accent-emerald-500 rounded-lg cursor-pointer disabled:opacity-40"
                    />
                  </div>

                  {/* Leaf suspension elasticity */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-stone-300">Leaf Spring Suspension Elasticity:</span>
                      <span className="font-mono text-teal-400 font-extrabold">{Math.round(suspensionBounciness*100)}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0.10"
                      max="0.80"
                      step="0.05"
                      disabled={activeVehicle.code !== '8400'}
                      value={suspensionBounciness}
                      onChange={(e) => {
                        setSuspensionBounciness(Number(e.target.value));
                        synth.playClick();
                      }}
                      className="w-full h-1 bg-stone-950 accent-teal-500 rounded-lg cursor-pointer disabled:opacity-40"
                    />
                  </div>
                </div>

                {/* Alloy Wheel type specs */}
                <div className="p-3 bg-stone-950/50 rounded-2xl border border-stone-800 space-y-2">
                  <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono font-bold block">Custom Wheel Rims:</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'steel', label: 'Heavy Steel Black' },
                      { id: 'alloy', label: 'Brushed Alloy' },
                      { id: 'chrome', label: 'Royal Chrome Rim' }
                    ].map(rim => (
                      <button
                        key={rim.id}
                        onClick={() => {
                          setWheelType(rim.id as any);
                          synth.playClick();
                        }}
                        className={`text-[9.5px] py-2 px-1 border rounded-lg text-center transition cursor-pointer ${
                          wheelType === rim.id 
                            ? 'bg-amber-500 text-stone-950 border-amber-400 font-bold' 
                            : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-300'
                        }`}
                      >
                        {rim.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mod Setup naming */}
                <div className="bg-stone-950/50 p-3 rounded-2xl border border-stone-800 space-y-2">
                  <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono font-bold block">Custom Mod Setup File Tag Name:</span>
                  <input 
                    type="text" 
                    value={modSetupName}
                    onChange={(e) => setModSetupName(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-850 text-xs text-stone-200 rounded-xl p-2.5 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* 6D. LEADERBOARDS Local & Online RTO Records */}
            {activeTab === 'leaderboard' && (
              <div className="space-y-4">
                <p className="text-[11px] text-stone-400 leading-relaxed font-medium">
                  The local RTO Leaderboard registers historical career passenger runs. Earn maximum ticket money (₹) and hold high safety ratings stars to top the list of regional drivers!
                </p>

                {/* Simulated multiplayer players list preset */}
                <div className="space-y-2">
                  <span className="text-[9px] text-stone-500 uppercase tracking-widest font-mono font-bold block">🏆 Regional RTO High Scores (All-Time)</span>
                  <div className="space-y-1.5 max-h-[340px] overflow-y-auto scrollbar-thin rounded-xl">
                    
                    {/* Active player DB logs first */}
                    {runs && runs.length > 0 ? (
                      runs.map((run, idx) => (
                        <div key={run.id || idx} className="p-3 bg-gradient-to-r from-emerald-950/10 via-stone-950 to-stone-950 border border-emerald-500/20 rounded-xl flex flex-col gap-1 shadow-sm">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-extrabold text-white flex items-center gap-1">🎖️ {run.pilotName} <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1 py-0.2 rounded font-normal font-mono uppercase">You</span></span>
                            <span className="font-mono text-emerald-400 font-extrabold">₹{run.earnings.toLocaleString('en-IN')}</span>
                          </div>
                          
                          <div className="flex justify-between text-[10px] text-stone-450 border-t border-stone-900/60 pt-1.5 mt-1">
                            <span>Route: <strong className="text-stone-300 font-sans">{run.routeName.replace(' Express', '')}</strong></span>
                            <span>Passengers: <strong className="text-stone-300">{run.passengersCarried}</strong></span>
                            <span className="text-amber-400">{'★'.repeat(Math.round(run.safetyStars))}</span>
                          </div>
                        </div>
                      ))
                    ) : null}

                    {/* AI Simulated drivers preset rankings */}
                    {[
                      { pilotName: 'Harpreet Singh 📿', routeName: 'Western Ghats Hairpin Pass', busName: 'Tata Starbus', passengersCarried: 17, earnings: 6750, safetyStars: 4.8 },
                      { pilotName: 'Rajesh Sharma 🦁', routeName: 'NH-2 GT Highway Express', busName: 'Lal Dabba', passengersCarried: 12, earnings: 4300, safetyStars: 4.2 },
                      { pilotName: 'Commander Roy 🚁', routeName: 'All-India Grand Convoy', busName: 'Sleeper Express', passengersCarried: 24, earnings: 11100, safetyStars: 4.9 },
                      { pilotName: 'Dinesh Cruiser ⚡', routeName: 'NH-2 GT Highway Express', busName: 'Ashok Deluxe', passengersCarried: 10, earnings: 3950, safetyStars: 3.5 }
                    ].map((entry, idx) => (
                      <div key={idx} className="p-3 bg-stone-950/80 border border-stone-850 rounded-xl flex flex-col gap-1 transition hover:border-stone-750">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-stone-300 font-sans">{idx + (runs?.length || 0) + 1}. {entry.pilotName}</span>
                          <span className="font-mono text-emerald-500 font-bold">₹{entry.earnings.toLocaleString('en-IN')}</span>
                        </div>
                        
                        <div className="flex justify-between text-[10px] text-stone-500 border-t border-stone-900/45 pt-1 mt-1">
                          <span>Route: <strong className="text-stone-400">{entry.routeName.replace(' Express', '')}</strong></span>
                          <span>Passengers: <strong className="text-stone-400">{entry.passengersCarried}</strong></span>
                          <span className="text-amber-500">{'★'.repeat(Math.round(entry.safetyStars))}</span>
                        </div>
                      </div>
                    ))}

                  </div>
                </div>

                {runs && runs.length > 0 && (
                  <button 
                    onClick={async () => {
                      await db.runs.clear();
                      synth.playCheatFailure();
                      setHudMessage('🏆 Leaderboard records cleared successfully!');
                    }}
                    className="px-3 py-1 bg-stone-950 border border-stone-850 hover:text-red-400 hover:border-red-500/20 rounded-lg text-[9px] font-bold w-max cursor-pointer transition active:scale-95"
                  >
                    Clear Leaderboard History
                  </button>
                )}
              </div>
            )}

            {/* 6E. MOD SYNC / SAVEFILES */}
            {activeTab === 'saves' && (
              <div className="space-y-4">
                <p className="text-[11px] text-stone-400 leading-relaxed font-medium">
                  Connect and backup your BUSSIN career setups. Download your customized Bus Livery & Mods and RTO accomplishments instantly as a virtual JSON save file, or drop your file to restore a previous career game!
                </p>

                {/* Import / Export actions */}
                <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 flex flex-col gap-3">
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase tracking-widest font-mono font-bold block">Change Pilot Profile Slogan:</span>
                    <input 
                      type="text" 
                      value={pilotName} 
                      onChange={(e) => setPilotName(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-850 text-xs text-stone-200 mt-1 p-2 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="w-full h-px bg-stone-900 my-1" />

                  <div className="space-y-2">
                    <span className="text-[10px] text-stone-500 uppercase tracking-widest font-mono font-bold block">1. Export Virtual Mod Backup:</span>
                    <button 
                      onClick={exportModSetup}
                      className="w-full py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-stone-950 hover:opacity-90 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow"
                    >
                      <Download className="w-4 h-4" /> Export Config Mod File
                    </button>
                    <p className="text-[9px] text-stone-500 text-center leading-normal mt-0.5">Saves current livery design & chassis measurements as JSON.</p>
                  </div>

                  <div className="w-full h-px bg-stone-900 my-1" />

                  <div className="space-y-2">
                    <span className="text-[10px] text-stone-500 uppercase tracking-widest font-mono font-bold block">2. Import Virtual Config File:</span>
                    <label className="w-full py-2 bg-stone-900 border border-stone-800 hover:border-amber-500 text-stone-300 text-center text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition">
                      <Upload className="w-4 h-4 text-amber-500" />
                      <span>Select `.json` Backup File</span>
                      <input 
                        type="file" 
                        accept=".json"
                        onChange={handleImportMod}
                        className="hidden" 
                      />
                    </label>
                    <p className="text-[9px] text-stone-500 text-center leading-normal mt-0.5">Restores vehicle mod specifications, RTO specs, and livery color codes.</p>
                  </div>
                </div>

                <div className="p-3 bg-stone-950/30 border border-stone-850 rounded-xl text-[10px] text-stone-450 leading-relaxed font-mono">
                  🔑 Session Cloud ID: <span className="text-stone-300">IND-910816415-{pilotName.toUpperCase()}</span>
                  <br />
                  🚀 Client status: <span className="text-emerald-400">READY</span>
                </div>

                {/* 🚨 DANGER ZONE - DELETE GAME */}
                <div className="p-4 bg-red-950/20 rounded-2xl border border-red-500/25 flex flex-col gap-2">
                  <span className="text-[10px] text-red-500 uppercase tracking-widest font-mono font-bold block">🚨 Danger Zone:</span>
                  <p className="text-[9px] text-stone-400 leading-normal font-sans">
                    Warning! This permanently erases all active career statistics, custom livery designs, chassis upgrades, RTO leaderboard runs, and resets your bank cash balance back to flat zero (₹0).
                  </p>
                  <button
                    onClick={() => {
                      if (window.confirm("Are you absolutely sure you want to delete all game progress, custom livery configurations, and reset everything? This action cannot be undone.")) {
                        handleDeleteGame();
                      }
                    }}
                    className="w-full py-2 bg-red-900/40 hover:bg-red-800/50 hover:text-white border border-red-500/30 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                    <span>Delete Game & Reset Profile</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 7. WALKIE-TALIE CHATTER FEED OVERLAY (Simulating regional convey banter) */}
      {uiVisible && (
        <div className="absolute left-4 top-[84px] bottom-28 z-30 max-w-[280px] hidden md:flex flex-col gap-2 pointer-events-none">
          <div className="flex items-center gap-1.5 text-stone-500 bg-stone-950/50 p-1 px-2.5 rounded-full border border-stone-900 w-max">
            <Radio className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span className="text-[8.5px] uppercase font-mono tracking-widest font-bold">Walkie Walkie Ch. 12</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-none flex flex-col justify-end">
            {walkieMessages.map((msg) => (
              <div 
                key={msg.id} 
                className="bg-stone-950/80 backdrop-blur-md border border-stone-900 rounded-2xl p-2.5 space-y-1 text-left anim-feed"
              >
                <div className="flex justify-between items-center text-[9px]">
                  <span className="font-extrabold text-stone-300 font-sans flex items-center gap-1">📻 {msg.pilot}</span>
                  <span className="text-stone-500 font-mono text-[8px]">{msg.time}</span>
                </div>
                <p className="text-[10px] text-stone-400 leading-normal">{msg.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. MINI-MAP INTEGRATION FOR GPS CHECKS */}
      {uiVisible && (
        <div className="absolute bottom-[108px] right-4 z-40 bg-stone-900/90 backdrop-blur-xl border border-stone-800 rounded-3xl p-3 shadow-2xl overflow-hidden w-[156px] h-[190px] flex flex-col justify-between items-center">
          <MiniMap 
            playerPositionRef={playerPositionRef}
            vehiclePositionRef={vehiclePositionRef}
            isDriving={isDriving}
            activeVehicleName={activeVehicle.name}
            viewMode="third"
            onChangeViewMode={() => {}}
            onTeleport={(pos, name) => {
              setTeleportRequest({ pos, label: name, timestamp: Date.now() });
              setHudMessage(`📍 GPS Teleported instantly to: ${name}`);
              synth.playCheatSuccess();
            }}
          />
          <div className="text-[9px] text-stone-500 font-mono font-bold uppercase truncate max-w-full text-center mt-1">
            📍 Next Station: {gpsDistance}m
          </div>
        </div>
      )}

      {/* 9. THE THREEJS 3D CANVAS WORLD AREA */}
      <KeyboardControls
        map={[
          { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
          { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
          { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
          { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
          { name: 'jump', keys: [' '] },
        ]}
      >
        <Canvas 
          shadows
          camera={{ position: [0, 6, 12], fov: 50 }}
          className="w-full h-full"
        >
          {/* Custom Ambient Sky cycle linked to DayNight clock */}
          <Sky 
            sunPosition={[
              100 * Math.cos((dayNightProgress * Math.PI) / 12), 
              100 * Math.sin((dayNightProgress * Math.PI) / 12), 
              10
            ]} 
          />
          <Stars radius={100} depth={50} count={2500} factor={4} saturation={0.5} fade speed={1} />
          
          <ambientLight intensity={dayNightProgress < 6 || dayNightProgress > 18 ? 0.35 : 0.85} />
          
          <directionalLight 
            castShadow
            position={[10, 20, 10]} 
            intensity={dayNightProgress < 6 || dayNightProgress > 18 ? 0.15 : 1.3} 
            shadow-mapSize={[1024, 1024]}
          />

          <Physics gravity={[0, -9.8, 0]}>
            {/* Standard flat tarmac ground plane */}
            <GroundPlane />

            {/* Simulated AI traffic system */}
            <AITrafficSystem dayNightProgress={dayNightProgress} />

            {/* Solid Indian world objects - Kirana Shop, Tea stalls, Himalayan background props */}
            <VillageEnvironment dayNightProgress={dayNightProgress} />

            {/* Glowing check portals representing Bus terminals */}
            <InteractiveBusStopPortals goalStopName={goalStopName} />

            {/* The primary playable customized Indian Bus */}
            <PlayableBusPhysicVehicle 
              paintColor={paintColor}
              stripeColor={stripeColor}
              stickerId={stickerId}
              ledText={ledText}
              quoteText={quoteText}
              tasselsEnabled={tasselsEnabled}
              underglowColor={underglowColor}
              doorsOpen={doorsOpen}
              headlightsEnabled={headlightsEnabled}
              gear={gear}
              speed={speed}
              setSpeed={setSpeed}
              vehiclePositionRef={vehiclePositionRef}
              teleportRequest={teleportRequest}
              payoutBonus={activeRoute.payout}
              currentRouteStars={currentRouteStars}
              setCurrentRouteStars={setCurrentRouteStars}
              vehicleHealth={vehicleHealth}
              setVehicleHealth={setVehicleHealth}
              isInsideStopZone={isInsideStopZone}
              isBoarding={isBoarding}
              fuel={fuel}
              setFuel={setFuel}
              dynamicSpecs={dynamicSpecs}
              dayNightProgress={dayNightProgress}
              wheelType={wheelType}
              activeVehicle={activeVehicle}
              mudIntensity={mudIntensity}
              setMudIntensity={setMudIntensity}
              setHudMessage={setHudMessage}
            />
          </Physics>

          <OrbitControls 
            enablePan={false} 
            maxPolarAngle={Math.PI / 2.1} 
            minDistance={4} 
            maxDistance={35} 
            enableDamping
          />
        </Canvas>
      </KeyboardControls>

      {/* 10. APP NOTIFICATION OVERLAY PANEL FOR PASSSENGER FARES */}
      {isBoarding && (
        <div className="absolute inset-0 bg-stone-950/25 backdrop-blur-[1px] flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-[0_20px_40px_rgba(0,0,0,0.5)] max-w-sm w-full space-y-3 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="text-sm font-black tracking-wide text-white uppercase font-mono">BUSSIN Passenger Check-in</h3>
            </div>
            <p className="text-[11px] text-stone-400">Travelers stepping in through door. Printing travel tickets...</p>
            <div className="w-full h-2 bg-stone-950 rounded-full overflow-hidden border border-stone-800">
              <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-300" style={{ width: `${boardingPercentage}%` }} />
            </div>
            <p className="text-[10px] text-stone-300 font-mono text-right">{boardingPercentage}% complete</p>
          </div>
        </div>
      )}

    </div>
  );
}

// -------------------------------------------------------------
// PHYSICS COMPONENT FOR PORTING FLOORS
// -------------------------------------------------------------
function GroundPlane() {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0]
  }));

  return (
    <mesh ref={ref as any} receiveShadow>
      <planeGeometry args={[160, 220]} />
      {/* Tarmac textured dark slate color */}
      <meshStandardMaterial color="#1c1917" roughness={0.96} />
    </mesh>
  );
}

// -------------------------------------------------------------
// BUS STOPS LIGHT PORTALS MESH
// -------------------------------------------------------------
function InteractiveBusStopPortals({ goalStopName }: { goalStopName: string }) {
  return (
    <group>
      {Object.values(BUS_STOPS).map((stop) => {
        const isGoal = stop.name === goalStopName;
        const color = isGoal ? '#fbbf24' : '#292524';
        const opacity = isGoal ? 0.35 : 0.08;
        const scaleHeight = isGoal ? 6.5 : 2.5;

        return (
          <group key={stop.name} position={stop.pos}>
            {/* Visual Cylinder Ring */}
            <mesh position={[0, scaleHeight / 2, 0]}>
              <cylinderGeometry args={[5.2, 5.2, scaleHeight, 32]} />
              <meshStandardMaterial 
                color={color} 
                transparent 
                opacity={opacity} 
                wireframe={!isGoal}
              />
            </mesh>
            
            {/* Core center target peg */}
            <mesh position={[0, 0.1, 0]}>
              <cylinderGeometry args={[2.0, 2.0, 0.15, 16]} />
              <meshStandardMaterial color={color} roughness={0.3} emissive={color} emissiveIntensity={isGoal ? 0.6 : 0} />
            </mesh>

            {/* Glowing top label */}
            {isGoal && (
              <pointLight position={[0, 3, 0]} color="#fbbf24" intensity={2.5} distance={15} />
            )}
          </group>
        );
      })}
    </group>
  );
}

// ----------------------------------------------------------------------
// THE PRIMARY DYNAMIC PLAYABLE INDIAN BUS PHYSIC VEHICLE
// ----------------------------------------------------------------------
interface PlayableBusProps {
  paintColor: string;
  stripeColor: string;
  stickerId: 'none' | 'flag' | 'om' | 'ganesha' | 'stars' | 'lightning';
  ledText: string;
  quoteText: string;
  tasselsEnabled: boolean;
  underglowColor: string;
  doorsOpen: boolean;
  headlightsEnabled: boolean;
  gear: 'D' | 'N' | 'R';
  speed: number;
  setSpeed: (s: number) => void;
  vehiclePositionRef: React.MutableRefObject<[number, number, number]>;
  teleportRequest: { pos: [number, number, number]; label: string; timestamp: number } | null;
  payoutBonus: number;
  currentRouteStars: number;
  setCurrentRouteStars: React.Dispatch<React.SetStateAction<number>>;
  vehicleHealth: number;
  setVehicleHealth: React.Dispatch<React.SetStateAction<number>>;
  isInsideStopZone: boolean;
  isBoarding: boolean;
  fuel: number;
  setFuel: React.Dispatch<React.SetStateAction<number>>;
  dynamicSpecs: {
    length: number;
    width: number;
    height: number;
    mass: number;
    horsePower: number;
    brakeStrength: number;
    suspensionBounciness: number;
  };
  dayNightProgress: number;
  wheelType: 'steel' | 'alloy' | 'chrome';
  activeVehicle: VehicleSettings;
  mudIntensity: number;
  setMudIntensity: React.Dispatch<React.SetStateAction<number>>;
  setHudMessage: React.Dispatch<React.SetStateAction<string>>;
}

function PlayableBusPhysicVehicle({
  paintColor,
  stripeColor,
  stickerId,
  ledText,
  quoteText,
  tasselsEnabled,
  underglowColor,
  doorsOpen,
  headlightsEnabled,
  gear,
  speed,
  setSpeed,
  vehiclePositionRef,
  teleportRequest,
  payoutBonus,
  currentRouteStars,
  setCurrentRouteStars,
  vehicleHealth,
  setVehicleHealth,
  isInsideStopZone,
  isBoarding,
  fuel,
  setFuel,
  dynamicSpecs,
  dayNightProgress,
  wheelType,
  activeVehicle,
  mudIntensity,
  setMudIntensity,
  setHudMessage
}: PlayableBusProps) {

  const [keyboardControls, getKeys] = useKeyboardControls();

  // Create standard box collider for our massive bus based on customized length
  const [ref, api] = useBox(() => ({
    mass: dynamicSpecs.mass,
    position: [0, 1.5, 0],
    args: [dynamicSpecs.width, 3.2, dynamicSpecs.length],
    linearDamping: 0.35,
    angularDamping: 0.85,
    allowSleep: false,
    onCollide: (e) => {
      // Dynamic crash mechanics!
      const elapsed = Date.now() - lastCrashTimeRef.current;
      if (elapsed > 1100 && Math.abs(speedRef.current) > 1.5) {
        lastCrashTimeRef.current = Date.now();
        synth.playCrash();
        
        // Deduct stars and fuel health
        setVehicleHealth(prev => Math.max(0, prev - 12));
        setCurrentRouteStars(prev => Math.max(1.0, Number((prev - 0.5).toFixed(1))));
      }
    }
  }));

  const lastCrashTimeRef = useRef<number>(0);
  const positionRef = useRef<[number, number, number]>([0, 0, 0]);
  const rotationRef = useRef<[number, number, number]>([0, 0, 0]);
  const velocityRef = useRef<[number, number, number]>([0, 0, 0]);
  const speedRef = useRef<number>(0);

  // Subscribe to changes
  useEffect(() => {
    const unsubPos = api.position.subscribe(v => {
      positionRef.current = v;
      vehiclePositionRef.current = v;
    });

    const unsubRot = api.rotation.subscribe(v => {
      rotationRef.current = v;
    });

    const unsubVel = api.velocity.subscribe(v => {
      velocityRef.current = v;
      const scalarSpeed = Math.sqrt(v[0] * v[0] + v[2] * v[2]) * (v[2] < 0 ? -1 : 1);
      speedRef.current = scalarSpeed;
      setSpeed(scalarSpeed);
    });

    return () => {
      unsubPos();
      unsubRot();
      unsubVel();
    };
  }, [api]);

  // Handle immediate teleportation alerts from navigation lookup mini-map
  useEffect(() => {
    if (teleportRequest) {
      api.position.set(teleportRequest.pos[0], teleportRequest.pos[1] + 1.2, teleportRequest.pos[2]);
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);
    }
  }, [teleportRequest]);

  // Steer animations rolling wheel models
  const frontLeftWheelRef = useRef<THREE.Group>(null);
  const frontRightWheelRef = useRef<THREE.Group>(null);
  const backLeftWheelRef1 = useRef<THREE.Mesh>(null);
  const backLeftWheelRef2 = useRef<THREE.Mesh>(null);
  const backRightWheelRef1 = useRef<THREE.Mesh>(null);
  const backRightWheelRef2 = useRef<THREE.Mesh>(null);
  const passengerDoorRef = useRef<THREE.Group>(null);
  const rotorGroupRef = useRef<THREE.Group>(null);

  const steerAngleRef = useRef<number>(0);
  const rollAngleRef = useRef<number>(0);
  const doorRotateRef = useRef<number>(0);

  const visualPitchRef = useRef<number>(0);
  const visualRollRef = useRef<number>(0);
  const localMudRef = useRef<number>(mudIntensity);
  const lastSyncRef = useRef<number>(0);

  useFrame((state, delta) => {
    const keys = getKeys();
    
    // Read keyboard controls
    const isW = keys.forward;
    const isS = keys.backward;
    const isA = keys.left;
    const isD = keys.right;

    // Fuel expenditure
    if (Math.abs(speedRef.current) > 0.1) {
      setFuel(prev => Math.max(0, prev - (delta * 0.15)));
    }

    // Lock controls if boarding or door is open
    const isImmobilized = doorsOpen || isBoarding || fuel <= 0 || vehicleHealth <= 0;

    // 1. Mud pit proximity detection (West Forest trail segment X: -55 to -30, Z: 10 to 45)
    const px = positionRef.current[0];
    const pz = positionRef.current[2];
    const isInMudPit = px >= -55 && px <= -30 && pz >= 10 && pz <= 45;

    if (isInMudPit) {
      localMudRef.current = Math.min(100, localMudRef.current + delta * 30.0);
      if (Math.random() < 0.015) {
        setHudMessage("⚠️ ENTERED MUD PIT: High wheels slip & heavy traction drift activated!");
      }
    } else {
      // Slowly wash mud clean when driving fast on clean tarmac/roads
      const onCleanRoad = Math.abs(px) < 8.0 || Math.abs(pz - 30) < 8.0;
      if (onCleanRoad && Math.abs(speedRef.current) > 1.2) {
        localMudRef.current = Math.max(0, localMudRef.current - delta * 4.0);
      }
    }

    // Throttled sync from local state to UI component to preserve render performance
    if (state.clock.getElapsedTime() - lastSyncRef.current > 0.2) {
      const roundedMud = Math.round(localMudRef.current);
      if (roundedMud !== mudIntensity) {
        setMudIntensity(roundedMud);
      }
      lastSyncRef.current = state.clock.getElapsedTime();
    }

    // Aerial flight vs general land vehicle properties
    const isAerial = activeVehicle.type === 'aerial';
    let targetVy = velocityRef.current[1];
    if (isAerial && !isImmobilized) {
      if (keys.jump) {
        targetVy = 6.8; // Fly ascending upwards
      } else if (isS) {
        targetVy = -4.5; // Descend downwards
      } else {
        // Floating lift hover effect
        targetVy = Math.sin(state.clock.getElapsedTime() * 3.5) * 0.18;
      }
    }

    // Visual leaning & suspension response
    let pitchTarget = 0;
    let rollTarget = 0;
    if (isAerial && !isImmobilized) {
      if (keys.jump) pitchTarget = 0.22;
      else if (isW) pitchTarget = -0.11;
      
      if (isA) rollTarget = 0.35;
      else if (isD) rollTarget = -0.35;
    } else {
      if (isW) pitchTarget = -0.05;
      else if (isS) pitchTarget = 0.05;
      
      if (isA) rollTarget = 0.08;
      else if (isD) rollTarget = -0.08;
    }
    visualPitchRef.current = THREE.MathUtils.lerp(visualPitchRef.current, pitchTarget, 4 * delta);
    visualRollRef.current = THREE.MathUtils.lerp(visualRollRef.current, rollTarget, 4 * delta);

    // Mud-altered handling physics
    const mudSlipRatio = localMudRef.current / 100; // 0 to 1
    const finalBrakeStrength = dynamicSpecs.brakeStrength * (1.0 - mudSlipRatio * 0.6);
    
    // Standard Heavy inertia engine drive forces
    let accelForce = 0;
    if (!isImmobilized) {
      if (gear === 'D' && isW) {
        const hp = activeVehicle.code === '8400' ? dynamicSpecs.horsePower : 320;
        accelForce = 15 + (hp / 25); // Scale force by custom horsepower slides!
      } else if (gear === 'R' && isW) {
        const hp = activeVehicle.code === '8400' ? dynamicSpecs.horsePower : 320;
        accelForce = -15 - (hp / 30); // backwards acceleration
      } else if (isS) {
        // Active air brakes deceleration force
        accelForce = -speedRef.current * (22 * finalBrakeStrength);
      }
    }

    // Steering chasis physics interpolation (slippery steering in mud!)
    let targetSteer = 0;
    if (isA) targetSteer = 0.44; // steer left
    if (isD) targetSteer = -0.44; // steer right
    
    // Smooth dampening rotation with mud slip latency
    const steeringResponsiveness = 9.0 - (mudSlipRatio * 5.0);
    steerAngleRef.current = THREE.MathUtils.lerp(steerAngleRef.current, targetSteer, steeringResponsiveness * delta);

    // Apply relative velocity coordinates
    const headingY = rotationRef.current[1];
    const forwardX = Math.sin(headingY);
    const forwardZ = Math.cos(headingY);

    let drivePower = accelForce * delta * 15;
    if (isAerial && !isImmobilized) {
      // Helicopter vs airplane cruise speed powers
      const propulsionLimit = activeVehicle.code === '5200' ? 60 : 38;
      drivePower = (isW ? propulsionLimit : 0) * delta * 15;
    }

    const vx = forwardX * drivePower;
    const vz = forwardZ * drivePower;

    // Apply Mud friction slips
    const lateralDamping = 0.95 - (mudSlipRatio * 0.12);
    api.velocity.set(
      vx + velocityRef.current[0] * lateralDamping, 
      isAerial ? targetVy : velocityRef.current[1], 
      vz + velocityRef.current[2] * lateralDamping
    );

    // Apply angular torque if moving
    const driveSpeedScalar = Math.sqrt(velocityRef.current[0]**2 + velocityRef.current[2]**2);
    // Aerial vehicles rotate nimbly in space
    const turnSensitivity = isAerial ? 2.5 : activeVehicle.type === 'bike' ? 3.0 : 1.8;
    if (driveSpeedScalar > 0.3 || (isAerial && Math.abs(steerAngleRef.current) > 0.1)) {
      const turnCoef = speedRef.current > 0 ? 1 : -1;
      const aerialSpin = isAerial ? (steerAngleRef.current * 1.5) : (steerAngleRef.current * turnSensitivity * turnCoef * Math.min(1, driveSpeedScalar * 0.35));
      api.angularVelocity.set(0, aerialSpin, 0);
    } else {
      api.angularVelocity.set(0, 0, 0);
    }

    // Roll angles wheels
    rollAngleRef.current += speedRef.current * delta * 3.5;

    // Rotate visual front/rear wheels
    if (frontLeftWheelRef.current) {
      frontLeftWheelRef.current.rotation.y = steerAngleRef.current;
    }
    if (frontRightWheelRef.current) {
      frontRightWheelRef.current.rotation.y = steerAngleRef.current;
    }

    // Hydraulic door animations pivot opens Y direction
    const targetDoorAngle = doorsOpen ? Math.PI / 2.2 : 0;
    doorRotateRef.current = THREE.MathUtils.lerp(doorRotateRef.current, targetDoorAngle, 8 * delta);
    if (passengerDoorRef.current) {
      passengerDoorRef.current.rotation.y = doorRotateRef.current;
    }

    // Continuous spinning rotor animations for aircraft or helicopter models
    if (rotorGroupRef.current) {
      const spinSpeed = keys.forward || keys.backward || keys.up || keys.down ? 42.0 : 16.0;
      rotorGroupRef.current.rotation.y += spinSpeed * delta;
    }

    // Reset fallen heavy bodies
    if (positionRef.current[1] < -4) {
      api.position.set(0, 1.5, 0);
      api.velocity.set(0, 0, 0);
      api.rotation.set(0, 0, 0);
    }
  });

  const isNight = dayNightProgress < 6 || dayNightProgress > 18;
  const isBike = activeVehicle.type === 'bike';
  const isTractor = activeVehicle.name.toLowerCase().includes('tractor') || activeVehicle.code === '4100' || activeVehicle.code === '4200';
  const isAerial = activeVehicle.type === 'aerial';

  // Mud-coated tire coloring
  const tireColor = mudIntensity > 60 ? '#5a3d24' : mudIntensity > 20 ? '#38281a' : '#171717';

  // Apply visual pitch/roll group tilting inside model structure
  return (
    <group ref={ref as any}>
      {/* 1. MODEL COMPOSITION GROUP WITH PHYSICAL PITCH AND ROLL TILTING */}
      <group rotation={[visualPitchRef.current, 0, visualRollRef.current]}>

        {/* Dynamic muddy underspray coating */}
        {mudIntensity > 0 && (
          <mesh position={[0, -0.28, 0]}>
            <boxGeometry args={[dynamicSpecs.width * 1.05, 0.1, dynamicSpecs.length * 1.05]} />
            <meshStandardMaterial color="#553010" roughness={0.99} opacity={mudIntensity / 100} transparent />
          </mesh>
        )}

        {/* ============================================================== */}
        {/* CATEGORY A: TRADITIONAL INDIAN PASSENGER BUS MESHES              */}
        {/* ============================================================== */}
        {activeVehicle.type === 'bus' && (
          <group>
            {/* Chassis base */}
            <mesh castShadow receiveShadow position={[0, -0.3, 0]}>
              <boxGeometry args={[dynamicSpecs.width * 0.95, 0.22, dynamicSpecs.length * 0.96]} />
              <meshStandardMaterial color="#09090b" roughness={0.9} />
            </mesh>

            {/* Main Cab body */}
            <mesh castShadow position={[0, 1.25, 0]}>
              <boxGeometry args={[dynamicSpecs.width, 2.4, dynamicSpecs.length]} />
              <meshStandardMaterial color={paintColor} roughness={0.15} metalness={0.7} />
            </mesh>

            {/* Side Stripes */}
            <mesh position={[-dynamicSpecs.width / 2 - 0.01, 1.15, 0]}>
              <boxGeometry args={[0.02, 0.15, dynamicSpecs.length * 0.9]} />
              <meshStandardMaterial color={stripeColor} roughness={0.1} emissive={stripeColor} emissiveIntensity={0.2} />
            </mesh>
            <mesh position={[dynamicSpecs.width / 2 + 0.01, 1.15, 0]}>
              <boxGeometry args={[0.02, 0.15, dynamicSpecs.length * 0.9]} />
              <meshStandardMaterial color={stripeColor} roughness={0.1} emissive={stripeColor} emissiveIntensity={0.2} />
            </mesh>

            {/* Windows side bank */}
            <mesh position={[-dynamicSpecs.width / 2 - 0.005, 1.85, 0.4]}>
              <boxGeometry args={[0.015, 0.64, dynamicSpecs.length * 0.72]} />
              <meshStandardMaterial color="#020617" roughness={0.05} transparent opacity={0.65} />
            </mesh>
            <mesh position={[dynamicSpecs.width / 2 + 0.005, 1.85, 0.4]}>
              <boxGeometry args={[0.015, 0.64, dynamicSpecs.length * 0.72]} />
              <meshStandardMaterial color="#020617" roughness={0.05} transparent opacity={0.65} />
            </mesh>

            {/* Front glass pane */}
            <mesh position={[0, 1.9, -dynamicSpecs.length / 2 + 0.02]} rotation={[-0.1, 0, 0]}>
              <boxGeometry args={[dynamicSpecs.width * 0.92, 0.9, 0.02]} />
              <meshStandardMaterial color="#0ea5e9" transparent opacity={0.6} roughness={0.01} />
            </mesh>

            {/* Roof Rack Cargo cages */}
            <group position={[0, 2.5, 0.5]}>
              <mesh>
                <boxGeometry args={[dynamicSpecs.width * 0.86, 0.2, dynamicSpecs.length * 0.64]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.05} metalness={0.96} wireframe />
              </mesh>
              <mesh position={[-0.4, 0.12, -0.6]} castShadow>
                <boxGeometry args={[0.8, 0.4, 0.8]} />
                <meshStandardMaterial color="#7c2d12" roughness={0.88} />
              </mesh>
              <mesh position={[0.5, 0.12, 0.4]} castShadow>
                <boxGeometry args={[0.7, 0.35, 1.0]} />
                <meshStandardMaterial color="#0f766e" roughness={0.85} />
              </mesh>
              <mesh position={[-0.2, 0.12, 1.0]} castShadow>
                <boxGeometry args={[0.9, 0.45, 0.75]} />
                <meshStandardMaterial color="#4d1919" roughness={0.92} />
              </mesh>
            </group>

            {/* Passenger hydraulic folding door */}
            <group ref={passengerDoorRef as any} position={[-dynamicSpecs.width / 2, 0.9, -dynamicSpecs.length * 0.35]}>
              <mesh castShadow position={[0.01, 0, 0.4]}>
                <boxGeometry args={[0.05, 1.7, 0.78]} />
                <meshStandardMaterial color={paintColor} roughness={0.2} metalness={0.7} />
              </mesh>
              <mesh position={[0.035, 0, 0.7]}>
                <boxGeometry args={[0.02, 0.32, 0.04]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.98} />
              </mesh>
            </group>

            {/* Orange destination scroll board */}
            <group position={[0, 2.38, -dynamicSpecs.length / 2 - 0.015]}>
              <mesh>
                <boxGeometry args={[dynamicSpecs.width * 0.65, 0.22, 0.02]} />
                <meshStandardMaterial color="#1a1c23" roughness={0.9} />
              </mesh>
              <mesh position={[0, 0, 0.012]}>
                <boxGeometry args={[dynamicSpecs.width * 0.62, 0.16, 0.01]} />
                <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1.3} roughness={0.1} />
              </mesh>
            </group>

            {/* Rear Slogan placard */}
            <group position={[0, 0.0, dynamicSpecs.length / 2 + 0.013]}>
              <mesh receiveShadow>
                <boxGeometry args={[dynamicSpecs.width * 0.85, 0.35, 0.01]} />
                <meshStandardMaterial color="#1c1917" roughness={0.92} />
              </mesh>
              <mesh position={[0, 0.0, 0.02]}>
                <boxGeometry args={[dynamicSpecs.width * 0.72, 0.18, 0.005]} />
                <meshStandardMaterial color="#fbbf24" roughness={0.3} />
              </mesh>
            </group>

            {/* Dangling side tassels */}
            {tasselsEnabled && (
              <group>
                <mesh position={[-dynamicSpecs.width / 2 - 0.22, 1.4, -dynamicSpecs.length / 2 + 0.5]}>
                  <cylinderGeometry args={[0.01, 0.02, 0.44, 4]} />
                  <meshStandardMaterial color="#111827" roughness={0.98} />
                </mesh>
                <mesh position={[dynamicSpecs.width / 2 + 0.22, 1.4, -dynamicSpecs.length / 2 + 0.5]}>
                  <cylinderGeometry args={[0.01, 0.02, 0.44, 4]} />
                  <meshStandardMaterial color="#111827" roughness={0.98} />
                </mesh>
              </group>
            )}
          </group>
        )}

        {/* ============================================================== */}
        {/* CATEGORY B: HEAVY VECHLES (TRACTOR, DJ speaker PICKUP, CARGO) */}
        {/* ============================================================== */}
        {activeVehicle.type === 'heavy' && (
          <group>
            {isTractor ? (
              /* Swaraj/Novo Farm Tractor */
              <group position={[0, 0.35, 0]}>
                {/* Hood colored */}
                <mesh position={[0, 0.4, -0.5]} castShadow>
                  <boxGeometry args={[0.85, 0.9, 1.6]} />
                  <meshStandardMaterial color={paintColor} roughness={0.2} metalness={0.5} />
                </mesh>
                {/* Exhaust pipe smokestack */}
                <mesh position={[0.3, 1.2, -0.9]} castShadow>
                  <cylinderGeometry args={[0.05, 0.04, 1.5, 6]} />
                  <meshStandardMaterial color="#0f172a" roughness={0.9} />
                </mesh>
                {/* Steering wheel column */}
                <mesh position={[0, 0.45, 0.15]} rotation={[0.4, 0, 0]}>
                  <cylinderGeometry args={[0.03, 0.03, 0.65]} />
                  <meshStandardMaterial color="#475569" metalness={0.8} />
                </mesh>
                {/* Big tractor driver seat */}
                <mesh position={[0, 0.42, 0.52]} castShadow>
                  <boxGeometry args={[0.62, 0.45, 0.52]} />
                  <meshStandardMaterial color="#eab308" roughness={0.65} /> {/* yellow vinyl */}
                </mesh>
                {/* Tractor overhead canopy */}
                <mesh position={[0, 1.52, 0.4]} castShadow>
                  <boxGeometry args={[1.25, 0.05, 1.35]} />
                  <meshStandardMaterial color="#1e293b" roughness={0.95} />
                </mesh>
                <mesh position={[-0.55, 0.75, 0.4]}>
                  <cylinderGeometry args={[0.02, 0.02, 1.5]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
                </mesh>
                <mesh position={[0.55, 0.75, 0.4]}>
                  <cylinderGeometry args={[0.02, 0.02, 1.5]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
                </mesh>
              </group>
            ) : activeVehicle.name.includes('DJ') ? (
              /* Heavy DJ Speaker Rig Setup */
              <group position={[0, 0.4, 0]}>
                {/* Pickup Cab nose */}
                <mesh position={[0, 0.35, -1.25]} castShadow>
                  <boxGeometry args={[1.4, 1.0, 1.15]} />
                  <meshStandardMaterial color={paintColor} roughness={0.15} metalness={0.6} />
                </mesh>
                <mesh position={[0, 0.9, -1.05]} rotation={[-0.32, 0, 0]}>
                  <boxGeometry args={[1.28, 0.52, 0.02]} />
                  <meshStandardMaterial color="#0284c7" transparent opacity={0.6} />
                </mesh>
                {/* Flatbed platform holding DJ console */}
                <mesh position={[0, 0.1, 0.48]} castShadow>
                  <boxGeometry args={[1.56, 0.45, 2.25]} />
                  <meshStandardMaterial color="#1c1917" roughness={0.9} />
                </mesh>
                {/* Stacked mega subwoofers stack cabinet */}
                <group position={[0, 1.05, 0.48]}>
                  <mesh castShadow>
                    <boxGeometry args={[1.48, 1.55, 1.95]} />
                    <meshStandardMaterial color="#09090b" roughness={0.98} />
                  </mesh>
                  {/* Color glowing sound system woofer cones */}
                  <mesh position={[-0.42, 0.42, 0.99]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.28, 0.28, 0.02, 8]} />
                    <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.3} />
                  </mesh>
                  <mesh position={[0.42, 0.42, 0.99]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.28, 0.28, 0.02, 8]} />
                    <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.3} />
                  </mesh>
                  <mesh position={[-0.42, -0.42, 0.99]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.28, 0.28, 0.02, 8]} />
                    <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={1.3} />
                  </mesh>
                  <mesh position={[0.42, -0.42, 0.99]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.28, 0.28, 0.02, 8]} />
                    <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={1.3} />
                  </mesh>
                </group>
                {/* Flashy top lighting structures truss */}
                <mesh position={[0, 1.92, 0.48]}>
                  <boxGeometry args={[1.52, 0.12, 2.0]} />
                  <meshStandardMaterial color="#cbd5e1" wireframe />
                </mesh>
                <pointLight position={[0, 1.8, 0.48]} color={paintColor} intensity={2.8} distance={8} />
              </group>
            ) : (
              /* Wooden Ashok Leyland heavy cargo payload truck */
              <group position={[0, 0.4, 0]}>
                <mesh position={[0, 0.65, -0.92]} castShadow>
                  <boxGeometry args={[1.5, 1.4, 1.2]} />
                  <meshStandardMaterial color={paintColor} roughness={0.2} metalness={0.7} />
                </mesh>
                <mesh position={[0, 1.05, -1.55]}>
                  <boxGeometry args={[1.34, 0.6, 0.02]} />
                  <meshStandardMaterial color="#0ea5e9" transparent opacity={0.6} />
                </mesh>
                {/* Back log wooden compartment */}
                <mesh position={[0, 0.42, 0.82]} castShadow>
                  <boxGeometry args={[1.65, 0.95, 2.3]} />
                  <meshStandardMaterial color="#78350f" roughness={0.96} />
                </mesh>
                {/* Loaded package cargo trunks */}
                <mesh position={[-0.32, 1.1, 0.45]} castShadow>
                  <boxGeometry args={[0.8, 0.52, 0.9]} />
                  <meshStandardMaterial color="#a1a1aa" roughness={0.9} />
                </mesh>
                <mesh position={[0.38, 1.05, 1.1]} castShadow>
                  <boxGeometry args={[0.7, 0.6, 0.85]} />
                  <meshStandardMaterial color="#737373" roughness={0.92} />
                </mesh>
              </group>
            )}
          </group>
        )}

        {/* ============================================================== */}
        {/* CATEGORY C: OFFROAD SUV OR SPORTS CAR MESHES                  */}
        {/* ============================================================== */}
        {activeVehicle.type === 'car' && (
          <group position={[0, 0.25, 0]}>
            {/* Scorpio/Thar Lower half */}
            <mesh castShadow position={[0, 0.35, 0]}>
              <boxGeometry args={[1.34, 0.9, 2.45]} />
              <meshStandardMaterial color={paintColor} roughness={0.15} metalness={0.65} />
            </mesh>
            {/* Cabin Top canopy */}
            <mesh castShadow position={[0, 0.96, 0.15]}>
              <boxGeometry args={[1.24, 0.65, 1.58]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.92} />
            </mesh>
            {/* Windshield */}
            <mesh position={[0, 0.8, -0.68]} rotation={[-0.38, 0, 0]}>
              <boxGeometry args={[1.16, 0.5, 0.02]} />
              <meshStandardMaterial color="#0ea5e9" transparent opacity={0.6} />
            </mesh>
            {/* Tailgate mounted extra tire */}
            <mesh position={[0, 0.45, 1.25]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.35, 0.35, 0.18, 10]} />
              <meshStandardMaterial color="#262626" roughness={0.98} />
            </mesh>
          </group>
        )}

        {/* ============================================================== */}
        {/* CATEGORY D: PULSAR / BULLET TWO-WHEELER INDIAN MOTORCYCLES      */}
        {/* ============================================================== */}
        {activeVehicle.type === 'bike' && (
          <group position={[0, 0.02, 0]}>
            {/* Bike main frame and core engine cylinders */}
            <mesh position={[0, 0.15, 0]} castShadow>
              <boxGeometry args={[0.26, 0.45, 0.92]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.95} roughness={0.1} />
            </mesh>
            {/* Paint finished fuel gas tank canister */}
            <mesh position={[0, 0.44, -0.12]} castShadow>
              <sphereGeometry args={[0.22, 10, 10]} />
              <meshStandardMaterial color={paintColor} roughness={0.15} metalness={0.65} />
            </mesh>
            {/* Chrome tailpipe silencer box */}
            <mesh position={[0.18, -0.02, 0.38]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.045, 0.035, 1.0, 6]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.02} metalness={0.99} />
            </mesh>
            {/* Handlebars holding brackets */}
            <group position={[0, 0.62, -0.38]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.015, 0.015, 0.74, 4]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.98} />
              </mesh>
              <mesh position={[-0.35, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <cylinderGeometry args={[0.025, 0.025, 0.12]} />
                <meshStandardMaterial color="#09090b" />
              </mesh>
              <mesh position={[0.35, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <cylinderGeometry args={[0.025, 0.025, 0.12]} />
                <meshStandardMaterial color="#09090b" />
              </mesh>
            </group>
          </group>
        )}

        {/* ============================================================== */}
        {/* CATEGORY E: AERIAL JETLINERS AND ROTATIONAL CHOPPERS           */}
        {/* ============================================================== */}
        {activeVehicle.type === 'aerial' && (
          <group position={[0, 0.4, 0]}>
            {activeVehicle.code === '5200' ? (
              /* Static or flying Airbus airplane */
              <group>
                {/* Fuselage shell tube */}
                <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.66, 0.66, 4.3, 12]} />
                  <meshStandardMaterial color="#f8fafc" roughness={0.12} />
                </mesh>
                {/* Sleek piloting nose head */}
                <mesh position={[0, 0.32, -2.18]} castShadow>
                  <sphereGeometry args={[0.64, 12, 12]} />
                  <meshStandardMaterial color={paintColor} roughness={0.1} />
                </mesh>
                {/* Wide wings spread */}
                <mesh position={[0, 0.12, 0.2]} rotation={[0, 0, 0.06]} castShadow>
                  <boxGeometry args={[7.4, 0.08, 0.8]} />
                  <meshStandardMaterial color={paintColor} roughness={0.1} />
                </mesh>
                {/* Tail stabilisers and high fin stabilizer */}
                <mesh position={[0, 0.32, 1.95]}>
                  <boxGeometry args={[2.2, 0.06, 0.52]} />
                  <meshStandardMaterial color={paintColor} roughness={0.1} />
                </mesh>
                <mesh position={[0, 0.88, 1.88]} rotation={[0.2, 0, 0]} castShadow>
                  <boxGeometry args={[0.08, 0.95, 0.66]} />
                  <meshStandardMaterial color={stripeColor} roughness={0.1} />
                </mesh>
              </group>
            ) : (
              /* Quad chopper / helicopter cockpit */
              <group>
                {/* Bubble cockpit canopy glass */}
                <mesh position={[0, 0.3, -0.38]} castShadow>
                  <sphereGeometry args={[0.88, 14, 14]} />
                  <meshStandardMaterial color="#0284c7" transparent opacity={0.65} roughness={0.01} />
                </mesh>
                {/* Tail rotor boom tube */}
                <mesh position={[0, 0.44, 1.25]} rotation={[-0.1, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.15, 0.05, 2.15, 8]} />
                  <meshStandardMaterial color={paintColor} roughness={0.2} />
                </mesh>
                {/* Overhead rotating central prop hub and blades */}
                <group position={[0, 1.24, -0.2]}>
                  <mesh>
                    <cylinderGeometry args={[0.035, 0.035, 0.35, 6]} />
                    <meshStandardMaterial color="#334155" metalness={0.9} />
                  </mesh>
                  {/* Rotor animation spinning */}
                  <group ref={rotorGroupRef}>
                    <mesh position={[0, 0.18, 0]}>
                      <boxGeometry args={[4.9, 0.02, 0.16]} />
                      <meshStandardMaterial color="#09090b" roughness={0.96} />
                    </mesh>
                  </group>
                </group>
                {/* Skid brackets supports */}
                <mesh position={[-0.55, -0.42, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.03, 0.03, 1.8, 4]} />
                  <meshStandardMaterial color="#334155" metalness={0.9} />
                </mesh>
                <mesh position={[0.55, -0.42, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.03, 0.03, 1.8, 4]} />
                  <meshStandardMaterial color="#334155" metalness={0.9} />
                </mesh>
              </group>
            )}
          </group>
        )}

      </group>

      {/* ============================================================== */}
      {/* 2. SHARED DYNAMIC CHASSIS EMBELLISHMENT: WHEELS AND BULBS       */}
      {/* ============================================================== */}

      {/* High-fidelity responsive Wheel systems */}
      {/* Front Left steering wheel */}
      <group position={[isBike ? 0 : -dynamicSpecs.width / 2, -0.3, isBike ? -0.7 : -dynamicSpecs.length * 0.28]}>
        <group ref={frontLeftWheelRef as any}>
          <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[isTractor ? 0.44 : 0.45, isTractor ? 0.44 : 0.45, isTractor ? 0.32 : 0.35, 12]} />
            <meshStandardMaterial color={tireColor} roughness={0.98} />
          </mesh>
          <mesh position={[-0.18, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.26, 0.26, 0.04, 8]} />
            <meshStandardMaterial color={wheelType === 'chrome' ? '#f1f5f9' : '#475569'} roughness={0.1} metalness={0.95} />
          </mesh>
        </group>
      </group>

      {/* Front Right steering wheel (Omit on Single-Track Bikes) */}
      {!isBike && (
        <group position={[dynamicSpecs.width / 2, -0.3, -dynamicSpecs.length * 0.28]}>
          <group ref={frontRightWheelRef as any}>
            <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[isTractor ? 0.44 : 0.45, isTractor ? 0.44 : 0.45, isTractor ? 0.32 : 0.35, 12]} />
              <meshStandardMaterial color={tireColor} roughness={0.98} />
            </mesh>
            <mesh position={[0.18, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.26, 0.26, 0.04, 8]} />
              <meshStandardMaterial color={wheelType === 'chrome' ? '#f1f5f9' : '#475569'} roughness={0.1} metalness={0.95} />
            </mesh>
          </group>
        </group>
      )}

      {/* Back Left drive wheels. Tractor uses massive oversized deep tread mud-tyres! */}
      <group position={[isBike ? 0 : -dynamicSpecs.width / 2, -0.2, isBike ? 0.7 : dynamicSpecs.length * 0.28]}>
        <mesh ref={backLeftWheelRef1 as any} position={[-0.08, 0, 0]} castShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[isTractor ? 0.72 : 0.48, isTractor ? 0.72 : 0.48, isTractor ? 0.52 : 0.32, 12]} />
          <meshStandardMaterial color={tireColor} roughness={0.99} />
        </mesh>
        {!isBike && !isTractor && (
          <mesh ref={backLeftWheelRef2 as any} position={[0.18, 0, 0]} castShadow rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.48, 0.48, 0.32, 12]} />
            <meshStandardMaterial color={tireColor} roughness={0.98} />
          </mesh>
        )}
      </group>

      {/* Back Right drive wheels (Omit on Single-Track Bikes) */}
      {!isBike && (
        <group position={[dynamicSpecs.width / 2, -0.2, dynamicSpecs.length * 0.28]}>
          <mesh ref={backRightWheelRef1 as any} position={[0.08, 0, 0]} castShadow rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[isTractor ? 0.72 : 0.48, isTractor ? 0.72 : 0.48, isTractor ? 0.52 : 0.32, 12]} />
            <meshStandardMaterial color={tireColor} roughness={0.99} />
          </mesh>
          {!isTractor && (
            <mesh ref={backRightWheelRef2 as any} position={[-0.18, 0, 0]} castShadow rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.48, 0.48, 0.32, 12]} />
              <meshStandardMaterial color={tireColor} roughness={0.98} />
            </mesh>
          )}
        </group>
      )}

      {/* EMBLEM STICKER BADGING (Grille / hood mount) */}
      {stickerId !== 'none' && !isAerial && (
        <mesh position={[0, 0.85, -dynamicSpecs.length / 2 - 0.015]}>
          <boxGeometry args={[0.4, 0.4, 0.02]} />
          <meshStandardMaterial 
            color={stickerId === 'flag' ? '#f97316' : stickerId === 'om' ? '#fbbf24' : '#ec4899'} 
            emissive={stickerId === 'flag' ? '#f97316' : '#ea580c'} 
            emissiveIntensity={0.7} 
          />
        </mesh>
      )}

      {/* High intensity headlight beams */}
      <group position={[0, 0.36, -dynamicSpecs.length / 2 - 0.01]}>
        <mesh position={[-dynamicSpecs.width * (isBike ? 0 : 0.36), 0, 0]}>
          <sphereGeometry args={[isBike ? 0.12 : 0.18, 8, 8]} />
          <meshStandardMaterial 
            color="#ffffff" 
            emissive={headlightsEnabled || isNight ? '#fffae6' : '#000000'} 
            emissiveIntensity={headlightsEnabled || isNight ? 1.8 : 0} 
          />
        </mesh>
        {!isBike && (
          <mesh position={[dynamicSpecs.width * 0.36, 0, 0]}>
            <sphereGeometry args={[0.18, 8, 8]} />
            <meshStandardMaterial 
              color="#ffffff" 
              emissive={headlightsEnabled || isNight ? '#fffae6' : '#000000'} 
              emissiveIntensity={headlightsEnabled || isNight ? 1.8 : 0} 
            />
          </mesh>
        )}
        {(headlightsEnabled || isNight) && (
          <spotLight 
            position={[0, 0, -2]} 
            angle={0.65} 
            penumbra={0.7} 
            color="#ffeed1" 
            intensity={4.5} 
            distance={28}
          />
        )}
      </group>

      {/* Underglow LED panel */}
      {underglowColor !== 'none' && (
        <group>
          <mesh position={[0, -0.38, 0]}>
            <boxGeometry args={[1, 0.05, 2]} />
            <meshStandardMaterial color={underglowColor} emissive={underglowColor} emissiveIntensity={2.5} />
          </mesh>
          <pointLight 
            position={[0, -0.65, 0]} 
            color={underglowColor} 
            intensity={3.2} 
            distance={5.5} 
          />
        </group>
      )}

    </group>
  );
}
