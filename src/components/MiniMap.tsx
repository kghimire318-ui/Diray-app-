import React, { useEffect, useRef } from 'react';
import { Compass, ZoomIn, ZoomOut, MapPin, Eye } from 'lucide-react';

interface MiniMapProps {
  playerPositionRef: React.MutableRefObject<[number, number, number]>;
  vehiclePositionRef: React.MutableRefObject<[number, number, number]>;
  isDriving: boolean;
  activeVehicleName: string;
  viewMode: 'third' | 'first' | 'cinematic';
  onChangeViewMode: (mode: 'third' | 'first' | 'cinematic') => void;
  onTeleport: (pos: [number, number, number], name: string) => void;
}

interface MapLocation {
  name: string;
  x: number;
  z: number;
  color: string;
  icon: string;
}

const MAP_LOCATIONS: MapLocation[] = [
  { name: 'Belbari Bazar', x: 0, z: 0, color: '#f59e0b', icon: '🏪' },
  { name: 'Gas Station', x: 16, z: 16, color: '#ef4444', icon: '⛽' },
  { name: 'Himalayas Lookout', x: -45, z: 30, color: '#3b82f6', icon: '🏔️' },
  { name: 'Forest Pine Trail', x: 43, z: -24, color: '#10b981', icon: '🌲' },
];

export function MiniMap({
  playerPositionRef,
  vehiclePositionRef,
  isDriving,
  activeVehicleName,
  viewMode,
  onChangeViewMode,
  onTeleport
}: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotationRef = useRef<number>(0);

  // Poll positions at 60 FPS inside requestAnimationFrame
  useEffect(() => {
    let animationId: number;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const drawMap = () => {
      // 1. CLEAR CANVAS
      ctx.fillStyle = '#0c0a09'; // stone-950 background
      ctx.fillRect(0, 0, width, height);

      // Extract current active target coordinate (Player or active Vehicle)
      const targetPos = isDriving ? vehiclePositionRef.current : playerPositionRef.current;
      const targetX = targetPos ? targetPos[0] : 0;
      const targetZ = targetPos ? targetPos[2] : 0;

      // Map scale conversion factor (defines zoom level)
      // Map limits: X (-60 to 60), Z (-95 to 95)
      // Visual MiniMap diameter of radar: 130px. Offset from center.
      const mapScale = 0.85; 

      // 2. DRAW RADAR BACKGROUND RINGS (Military HUD aesthetic)
      ctx.strokeStyle = '#292524'; // stone-800
      ctx.lineWidth = 1;
      
      // Outer border circle ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, centerX - 1.5, 0, Math.PI * 2);
      ctx.stroke();

      // Radar Concentric concentric grids
      ctx.strokeStyle = 'rgba(120, 113, 108, 0.1)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, centerX * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(centerX, centerY, centerX * 0.7, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshairs axes
      ctx.strokeStyle = 'rgba(120, 113, 108, 0.08)';
      ctx.beginPath();
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, height);
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      // 3. DRAW VISUAL ROADS SYSTEM
      // Main Highway Segment (Z direction: Z = -90 to +90, X = 0)
      ctx.save();
      ctx.translate(centerX, centerY);

      // Transform world offset (X, Z) to mini-map coordinates
      // X maps horizontally, Z maps vertically
      const worldToLocalX = (wx: number) => (wx - targetX) * mapScale;
      const worldToLocalY = (wz: number) => (wz - targetZ) * mapScale;

      // Draw Main Highway Strip (Z direction)
      ctx.fillStyle = 'rgba(68, 64, 60, 0.85)'; // stone-700
      const hLocalX = worldToLocalX(0);
      const hLocalW = 7.2 * mapScale; // Width 7.2 meters
      ctx.fillRect(hLocalX - hLocalW / 2, -centerY, hLocalW, height);

      // Highway dashes center guidance lines
      ctx.fillStyle = 'rgba(251, 191, 36, 0.5)'; // Yellow boundaries
      ctx.fillRect(hLocalX - hLocalW / 2 - 1, -centerY, 1.5, height);
      ctx.fillRect(hLocalX + hLocalW / 2 - 1, -centerY, 1.5, height);

      // Dash white dots
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let z = -90; z <= 90; z += 12) {
        if (z > 23 && z < 37) continue; //skip center intersection
        const dashY = worldToLocalY(z);
        if (dashY >= -centerY && dashY <= centerY) {
          ctx.fillRect(hLocalX - 0.5, dashY, 1, 3);
        }
      }

      // Draw Crossroad Intersecting Path (X direction: X = -55 to +55, Z = 30)
      ctx.fillStyle = 'rgba(68, 64, 60, 0.85)';
      const cLocalY = worldToLocalY(30);
      const cLocalH = 7.2 * mapScale;
      ctx.fillRect(-centerX, cLocalY - cLocalH / 2, width, cLocalH);

      // Crossroad dotted dashes
      ctx.fillStyle = 'rgba(251, 191, 36, 0.5)'; // Yellow safety boundaries
      ctx.fillRect(-centerX, cLocalY - cLocalH / 2 - 1, width, 1.5);
      ctx.fillRect(-centerX, cLocalY + cLocalH / 2 - 1, width, 1.5);

      // 4. DRAW DIRT TRAILS (Forest paths)
      ctx.strokeStyle = 'rgba(124, 45, 18, 0.65)'; // Mud/orange brown
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(worldToLocalX(30), worldToLocalY(30));
      ctx.quadraticCurveTo(
        worldToLocalX(40), worldToLocalY(20),
        worldToLocalX(42), worldToLocalY(4)
      );
      ctx.lineTo(worldToLocalX(43), worldToLocalY(-24));
      ctx.stroke();

      // 5. DRAW LANDMARK MARKERS (Establishments, viewpoint)
      MAP_LOCATIONS.forEach((loc) => {
        const lx = worldToLocalX(loc.x);
        const lz = worldToLocalY(loc.z);

        // Keep labels clamped inside minimap boundary for safety
        const dist = Math.sqrt(lx * lx + lz * lz);
        let drawX = lx;
        let drawY = lz;

        if (dist > centerX - 10) {
          // Clamp to boundary edge as off-screen radar indicators
          const angle = Math.atan2(lz, lx);
          drawX = Math.cos(angle) * (centerX - 12);
          drawY = Math.sin(angle) * (centerY - 12);

          // Draw a small radar pointer
          ctx.beginPath();
          ctx.arc(drawX, drawY, 3, 0, Math.PI * 2);
          ctx.fillStyle = loc.color;
          ctx.fill();
        } else {
          // Draw standard localized dot
          ctx.beginPath();
          ctx.arc(drawX, drawY, 5, 0, Math.PI * 2);
          ctx.fillStyle = loc.color;
          ctx.fill();

          ctx.fillStyle = '#f5f5f4'; // stone-100
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(loc.name.split(' ')[0], drawX, drawY - 8);
        }
      });

      // 6. DRAW REALTIME SIMULATED OTHER VEHICLES
      // Spawning 5 live radar echoes based on active direction files
      const timeMs = Date.now() * 0.001;
      const simulatedVehicles = [
        { x: -1.8, z: (timeMs * 10) % 170 - 85, color: '#ef4444' }, // Highway South flow
        { x: 1.8, z: -((timeMs * 14) % 170) + 85, color: '#22c55e' }, // Highway North flow
        { x: (timeMs * 11) % 110 - 55, z: 28.2, color: '#facc15' },  // Crossroad East flow
        { x: -((timeMs * 13) % 110) + 55, z: 31.8, color: '#3b82f6' }  // Crossroad West flow
      ];

      simulatedVehicles.forEach((sim, idx) => {
        const sx = worldToLocalX(sim.x);
        const sz = worldToLocalY(sim.z);
        if (Math.sqrt(sx * sx + sz * sz) < centerX - 4) {
          ctx.beginPath();
          ctx.arc(sx, sz, 3, 0, Math.PI * 2);
          ctx.fillStyle = sim.color;
          ctx.fill();
          // Draw radar lock overlay
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.arc(sx, sz, 5, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // 7. DRAW PLAYER POINTER AT CENTER
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#06b6d4'; // Glowing cyan
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Outer search sweep glow (flashing radar sonar)
      const radarSweepAngle = (Date.now() * 0.002) % (Math.PI * 2);
      ctx.save();
      const sweepGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, centerX);
      sweepGlow.addColorStop(0, 'rgba(6, 182, 212, 0.15)');
      sweepGlow.addColorStop(0.3, 'rgba(6, 182, 212, 0.04)');
      sweepGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = sweepGlow;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, centerX, radarSweepAngle - 0.4, radarSweepAngle + 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.restore();

      // 8. GRAPHICS HUD DECAL LINES Overlay
      ctx.strokeStyle = '#ca8a04'; // Yellow-gold boundary ticks
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, centerX - 1, -Math.PI / 6, Math.PI / 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(centerX, centerY, centerX - 1, Math.PI - Math.PI / 6, Math.PI + Math.PI / 6);
      ctx.stroke();

      // Heading Text
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NEPAL COORDS', centerX, 15);

      animationId = requestAnimationFrame(drawMap);
    };

    drawMap();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [playerPositionRef, vehiclePositionRef, isDriving]);

  return (
    <div id="radar-minimap-card" className="bg-stone-950/95 border border-stone-855 rounded-2xl p-3 shadow-2xl flex flex-col gap-2.5 w-[165px] backdrop-blur-md">
      <div className="flex items-center gap-1.5 justify-between">
        <div className="flex items-center gap-1">
          <Compass className="w-3.5 h-3.5 text-yellow-500 animate-spin-slow" />
          <span className="text-[10px] font-bold text-stone-300 font-mono tracking-widest uppercase">GPS HUD</span>
        </div>
        <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1 rounded font-mono font-bold uppercase tracking-widest animate-pulse">
          LOCK
        </span>
      </div>

      <div className="relative w-[140px] h-[140px] mx-auto rounded-full overflow-hidden border border-stone-880">
        <canvas 
          ref={canvasRef} 
          width={140} 
          height={140} 
          className="w-full h-full cursor-help"
          title="Tactical GPS Highway Map Radar"
        />
      </div>

      {/* Quick GPS Teleport shortcuts to easily travel */}
      <div className="border-t border-stone-900 pt-2 flex flex-col gap-1.5">
        <p className="text-[9px] text-stone-500 font-mono uppercase tracking-widest font-bold">Teleport Waypoints</p>
        <div className="grid grid-cols-2 gap-1 bg-stone-900/40 p-1 rounded-lg">
          {MAP_LOCATIONS.map((loc) => (
            <button
              key={loc.name}
              onClick={() => onTeleport([loc.x, 2.0, loc.z], loc.name)}
              className="px-1 text-[9px] py-1 bg-stone-900 hover:bg-yellow-500 hover:text-stone-950 text-stone-300 font-semibold rounded font-mono text-left truncate flex items-center gap-1 transition-all duration-150 border border-stone-850 cursor-pointer"
              title={`Jump instant GPS teleport to: ${loc.name}`}
            >
              <span>{loc.icon}</span>
              <span className="truncate">{loc.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Embedded Camera View Modes control right inside GPS HUD */}
      <div className="border-t border-stone-900 pt-2 flex flex-col gap-1.5">
        <p className="text-[9px] text-stone-500 font-mono uppercase tracking-widest font-bold">Cam View Decals</p>
        <div className="flex flex-col gap-1">
          {/* Third Person Cam */}
          <button
            onClick={() => onChangeViewMode('third')}
            className={`w-full flex items-center justify-between px-2 py-1 rounded text-[10px] font-bold transition-all duration-150 cursor-pointer ${
              viewMode === 'third' 
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                : 'bg-stone-900 hover:bg-stone-850 text-stone-400 border border-transparent'
            }`}
          >
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3 text-emerald-500" /> Standard 3rd Person
            </span>
            <span className="font-mono text-[9px] opacity-60">CAM1</span>
          </button>

          {/* First Person Cam */}
          <button
            onClick={() => onChangeViewMode('first')}
            className={`w-full flex items-center justify-between px-2 py-1 rounded text-[10px] font-bold transition-all duration-150 cursor-pointer ${
              viewMode === 'first' 
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                : 'bg-stone-900 hover:bg-stone-850 text-stone-400 border border-transparent'
            }`}
          >
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3 text-emerald-500" /> Cabin First Person
            </span>
            <span className="font-mono text-[9px] opacity-60">CAM2</span>
          </button>

          {/* Cinematic Cinematic Cam Trail Mode */}
          <button
            onClick={() => onChangeViewMode('cinematic')}
            className={`w-full flex items-center justify-between px-2 py-1 rounded text-[10px] font-bold transition-all duration-150 cursor-pointer ${
              viewMode === 'cinematic' 
                ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-500' 
                : 'bg-stone-900 hover:bg-stone-850 text-stone-400 border border-transparent animate-pulse'
            }`}
          >
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3 text-yellow-500" /> Cinematic Trailer Shot
            </span>
            <span className="font-mono text-[9px] bg-yellow-500/10 text-yellow-500 px-1 rounded">CINEMA</span>
          </button>
        </div>
      </div>
    </div>
  );
}
