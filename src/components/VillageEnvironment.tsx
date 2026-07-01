import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useBox, useCylinder } from '@react-three/cannon';
import * as THREE from 'three';
import { useProceduralAsphalt } from '../utils/proceduralTextures';

// ----------------------------------------------------------------------
// RUSTIC INDIAN VILLAGE ENVIRONMENT SYSTEM
// ----------------------------------------------------------------------

interface VillageEnvironmentProps {
  dayNightProgress: number;
}

// Detailed leafy Bush prop composed of clustered spheres for a rich organic look
export function ScenicBush({ pos, scale = 1 }: { pos: [number, number, number]; scale?: number }) {
  return (
    <group position={pos}>
      {/* Central foliage mass */}
      <mesh castShadow receiveShadow position={[0, 0.3 * scale, 0]}>
        <sphereGeometry args={[0.55 * scale, 12, 12]} />
        <meshStandardMaterial color="#14532d" roughness={0.9} /> {/* Deep forest green */}
      </mesh>
      {/* Left clump */}
      <mesh castShadow position={[-0.3 * scale, 0.22 * scale, 0.1 * scale]}>
        <sphereGeometry args={[0.42 * scale, 8, 8]} />
        <meshStandardMaterial color="#166534" roughness={0.92} />
      </mesh>
      {/* Right clump */}
      <mesh castShadow position={[0.34 * scale, 0.24 * scale, -0.12 * scale]}>
        <sphereGeometry args={[0.45 * scale, 8, 8]} />
        <meshStandardMaterial color="#15803d" roughness={0.88} />
      </mesh>
      {/* Top cap clump */}
      <mesh castShadow position={[0.02 * scale, 0.5 * scale, -0.05 * scale]}>
        <sphereGeometry args={[0.36 * scale, 8, 8]} />
        <meshStandardMaterial color="#22c55e" roughness={0.95} /> {/* Bright lime highlight */}
      </mesh>
    </group>
  );
}

// 3D elevated curb stones (yellow/black alternating blocks) along the main highway boundaries
function HighwayCurbStones() {
  const curbLength = 2.0;
  const numCurbs = Math.floor(170 / curbLength); // 85 pairs
  
  const curbs = [];
  for (let i = 0; i < numCurbs; i++) {
    const zPos = -85 + i * curbLength + curbLength / 2;
    // Skip curb stones on the intersection area (Z from 24.5 to 35.5)
    if (zPos > 24.5 && zPos < 35.5) continue;
    
    // Alternating color: Yellow and Black (highly characteristic of South Asian state highways)
    const color = i % 2 === 0 ? '#fbbf24' : '#1e1b4b'; // amber & dark indigo black
    
    // Left edge (X = -3.61)
    curbs.push(
      <mesh key={`curb-l-${i}`} position={[-3.61, 0.08, zPos]} castShadow receiveShadow>
        <boxGeometry args={[0.12, 0.16, curbLength - 0.02]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    );
    
    // Right edge (X = 3.61)
    curbs.push(
      <mesh key={`curb-r-${i}`} position={[3.61, 0.08, zPos]} castShadow receiveShadow>
        <boxGeometry args={[0.12, 0.16, curbLength - 0.02]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    );
  }
  return <group>{curbs}</group>;
}

// 3D elevated curb stones along the secondary crossroad
function CrossroadCurbStones() {
  const curbLength = 2.0;
  const numCurbs = Math.floor(110 / curbLength);
  
  const curbs = [];
  for (let i = 0; i < numCurbs; i++) {
    const xPos = -55 + i * curbLength + curbLength / 2;
    // Skip center overlap
    if (xPos > -4.5 && xPos < 4.5) continue;
    
    const color = i % 2 === 0 ? '#fbbf24' : '#1e1b4b';
    
    // Bottom edge (Z = 26.39)
    curbs.push(
      <mesh key={`curb-b-${i}`} position={[xPos, 0.08, 26.39]} castShadow receiveShadow>
        <boxGeometry args={[curbLength - 0.02, 0.16, 0.12]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    );
    
    // Top edge (Z = 33.61)
    curbs.push(
      <mesh key={`curb-t-${i}`} position={[xPos, 0.08, 33.61]} castShadow receiveShadow>
        <boxGeometry args={[curbLength - 0.02, 0.16, 0.12]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    );
  }
  return <group>{curbs}</group>;
}

export function VillageEnvironment({ dayNightProgress }: VillageEnvironmentProps) {
  const isNight = dayNightProgress < 6 || dayNightProgress > 18;

  return (
    <group>
      {/* 1. VISUAL ROAD NETWORK WITH 3D ELEVATED CURBS */}
      <VillageRoadSystem />
      <HighwayCurbStones />
      <CrossroadCurbStones />

      {/* BACKGROUND SCENIC SPECTACLE: THE HIMALAYAS */}
      <FarHimalayas />

      {/* 2. GLOWING STREETLIGHTS ALONG THE ROADSIDE */}
      <Streetlight pos={[-4.5, 0, -45]} isNight={isNight} />
      <Streetlight pos={[4.5, 0, -15]} isNight={isNight} />
      <Streetlight pos={[-4.5, 0, 15]} isNight={isNight} />
      <Streetlight pos={[4.5, 0, 45]} isNight={isNight} />
      <Streetlight pos={[-25, 0, 30]} isNight={isNight} />
      <Streetlight pos={[25, 0, 30]} isNight={isNight} />

      {/* 3. COLLIDABLE VILLAGE BUILDINGS & ARCHITECTURE */}
      <VillageHouse pos={[-12, 0, -2]} rot={0.15} color="#cbd5fa" label="Ram's Cottage" />
      <VillageHouse pos={[12, 0, -10]} rot={-0.2} color="#fca5a5" label="Punjab Sweets" />
      <Dhaba pos={[-12, 0, 20]} rot={0.08} />
      <VillageHouse pos={[-15, 0, 45]} rot={0.3} color="#fef08a" label="Farmer Niwas" />
      <VillageHouse pos={[14, 0, 38]} rot={-0.45} color="#fed7aa" label="Post Office" />
      <ModernFlat pos={[15, 0, 12]} rot={-0.1} />

      {/* ROAD-SIDE NEPALI COMMERCIAL CHANNELS */}
      <KiranaPasal pos={[11.5, 0, 20]} rot={-Math.PI / 2} />
      <ChiyaGhar pos={[-11.5, 0, -18]} rot={Math.PI / 2} />

      {/* 4. RUSTIC SCENIC FARM ASSETS (Haystacks, milestones, fences) */}
      <Haystack pos={[-16, 0, 52]} scale={[1.4, 2.2, 1.4]} />
      <Haystack pos={[-19, 0, 48]} scale={[1.1, 1.8, 1.1]} />
      <RtoMilestone pos={[-3.8, 0, -10]} text="Delhi 45 KM" />
      <RtoMilestone pos={[3.8, 0, 32]} text="RTO Toll Ahead" />

      {/* REAL 3D HIGHWAY DIRECTION BANNERS */}
      <RoadSignPost pos={[-3.8, 0, 22]} rot={0} destination="Belbari Bazar" direction="straight" />
      <RoadSignPost pos={[3.8, 0, 25.5]} rot={Math.PI} destination="Kanchenjunga Scenic Viewpoint" direction="left" />
      <RoadSignPost pos={[25, 0, 27.5]} rot={-Math.PI / 2} destination="Forest Pine Trail" direction="right" />

      {/* DIRT TRAILS & SCENIC OVERLOOK SYSTEM */}
      <ForestTrailVisuals />
      <ForestTrailViewpointSpot />
      <ScenicMountainPlatform pos={[-45, 0.3, 30]} />

      {/* ROAD CITIZENS & LOCAL PEDESTRIANS */}
      <PedestrianNPC pos={[-10.2, 0, -16.5]} outfitColor="#dc2626" wearingDhaka={true} /> {/* Tea talker */}
      <PedestrianNPC pos={[-11.8, 0, -15.8]} outfitColor="#2563eb" wearingDhaka={false} />
      <PedestrianNPC pos={[10.6, 0, 18.2]} outfitColor="#16a34a" wearingDhaka={true} /> {/* Shop owner */}
      <PedestrianNPC pos={[-44.2, 0.6, 29.5]} outfitColor="#9333ea" wearingDhaka={true} /> {/* Viewpoint observer */}

      {/* Border Wooden Fence rails bordering the farm */}
      <Fence pos={[-11, 0, 425]} rot={0.2} />
      <Fence pos={[-18, 0, 425]} rot={0.2} />

      {/* 5. COLLIDABLE INDIAN ROAD VEHICLES & TRAFFIC */}
      <MahindraTractor pos={[-12, 0.65, 48]} rot={0.4} />
      <TukTukAutoRickshaw pos={[-10, 0.5, 25]} rot={0.12} />
      <BarricadeObstacle pos={[-3, 0.4, -30]} rot={0.05} />
      <BarricadeObstacle pos={[3, 0.4, -30]} rot={-0.05} />

      {/* 6. LUSH BROAD-LEAF TREES & WOODS */}
      <SaplingTree pos={[-8, 0, -25]} scale={1.2} />
      <SaplingTree pos={[9, 0, -20]} scale={1.4} />
      <SaplingTree pos={[-11, 0, 5]} scale={1.0} />
      <SaplingTree pos={[14, 0, 2]} scale={1.5} />
      <SaplingTree pos={[-15, 0, 32]} scale={1.3} />
      <SaplingTree pos={[16, 0, 52]} scale={1.6} />
      
      {/* Additional Scattered Trees to build a dense Nepalese forest feel */}
      <SaplingTree pos={[-18, 0, -55]} scale={1.6} />
      <SaplingTree pos={[18, 0, -60]} scale={1.8} />
      <SaplingTree pos={[-25, 0, -15]} scale={1.4} />
      <SaplingTree pos={[22, 0, 5]} scale={1.3} />
      <SaplingTree pos={[-20, 0, 28]} scale={1.6} />
      <SaplingTree pos={[28, 0, 22]} scale={1.5} />
      <SaplingTree pos={[-30, 0, 60]} scale={2.0} />
      <SaplingTree pos={[25, 0, -35]} scale={1.5} />

      {/* 7. LUSH BERRY BUSHES (Multi-sphere clustered dense foliage) */}
      <ScenicBush pos={[-4.6, 0, -38]} scale={1.1} />
      <ScenicBush pos={[-4.6, 0, -10]} scale={0.95} />
      <ScenicBush pos={[4.6, 0, -8]} scale={1.25} />
      <ScenicBush pos={[4.6, 0, 18]} scale={1.05} />
      <ScenicBush pos={[-4.6, 0, 8]} scale={1.3} />
      <ScenicBush pos={[-4.6, 0, 40]} scale={1.15} />
      <ScenicBush pos={[4.6, 0, 50]} scale={1.1} />
      
      {/* Bushes clustered around houses & farm structures */}
      <ScenicBush pos={[-14.5, 0, -5]} scale={1.4} />
      <ScenicBush pos={[-9.5, 0, 1]} scale={1.0} />
      <ScenicBush pos={[14.5, 0, -8]} scale={1.2} />
      <ScenicBush pos={[-14.5, 0, 16]} scale={1.5} />
      <ScenicBush pos={[-9.2, 0, 23]} scale={1.1} />
      <ScenicBush pos={[-17.5, 0, 42]} scale={1.35} />
      <ScenicBush pos={[11.5, 0, 42]} scale={1.2} />
      <ScenicBush pos={[-19, 0, 56]} scale={1.45} />
      <ScenicBush pos={[18, 0, 16]} scale={1.3} />
    </group>
  );
}

// ------------------------------------------------------------
// ROAD GRAPHICS AND LAYOUT
// ------------------------------------------------------------
function VillageRoadSystem() {
  const asphaltTexture = useProceduralAsphalt();
  
  const highwayTexture = useMemo(() => {
    if (!asphaltTexture) return null;
    const t = asphaltTexture.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1.5, 34); // tiled perfectly down the long highway strip
    t.needsUpdate = true;
    return t;
  }, [asphaltTexture]);

  const crossroadTexture = useMemo(() => {
    if (!asphaltTexture) return null;
    const t = asphaltTexture.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(22, 1.5); // tiled perfectly across the crossing village road
    t.needsUpdate = true;
    return t;
  }, [asphaltTexture]);

  return (
    <group position={[0, 0.015, 0]}>
      {/* Principal Highway Segment (Z direction - Long Stretch) */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7.2, 170]} />
        <meshStandardMaterial 
          map={highwayTexture || undefined} 
          color={highwayTexture ? '#ffffff' : '#212124'} 
          roughness={0.92} 
          metalness={0.06} 
        />
      </mesh>

      {/* Intersecting Village Road (X direction) */}
      <mesh receiveShadow position={[0, 0.002, 30]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[110, 7.2]} />
        <meshStandardMaterial 
          map={crossroadTexture || undefined} 
          color={crossroadTexture ? '#ffffff' : '#212124'} 
          roughness={0.92} 
          metalness={0.06} 
        />
      </mesh>

      {/* White Centre Dashes on Main Highway (Z Axis) */}
      {Array.from({ length: 24 }).map((_, i) => {
        const zPos = -80 + i * 7.5;
        // Skip dash overlapping the intersection
        if (zPos > 26 && zPos < 34) return null;
        return (
          <mesh key={`dash-z-${i}`} position={[0, 0.005, zPos]}>
            <boxGeometry args={[0.18, 0.001, 1.8]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.9} emissive="#475569" emissiveIntensity={0.1} />
          </mesh>
        );
      })}

      {/* Dotted White Dash Lines on Side Road (X Axis) */}
      {Array.from({ length: 16 }).map((_, i) => {
        const xPos = -50 + i * 6.5;
        // Skip center overlap
        if (xPos > -4 && xPos < 4) return null;
        return (
          <mesh key={`dash-x-${i}`} position={[xPos, 0.005, 30]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[0.18, 0.001, 1.5]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.9} />
          </mesh>
        );
      })}

      {/* Yellow Margin Safety Lines - Main Highway */}
      <mesh position={[-3.5, 0.004, 0]}>
        <boxGeometry args={[0.08, 0.001, 170]} />
        <meshStandardMaterial color="#fbbf24" opacity={0.8} transparent />
      </mesh>
      <mesh position={[3.5, 0.004, 0]}>
        <boxGeometry args={[0.08, 0.001, 170]} />
        <meshStandardMaterial color="#fbbf24" opacity={0.8} transparent />
      </mesh>

      {/* Yellow Margin Safety Lines - Intersecting Road */}
      <mesh position={[0, 0.004, 26.5]}>
        <boxGeometry args={[110, 0.001, 0.08]} />
        <meshStandardMaterial color="#fbbf24" opacity={0.8} transparent />
      </mesh>
      <mesh position={[0, 0.004, 33.5]}>
        <boxGeometry args={[110, 0.001, 0.08]} />
        <meshStandardMaterial color="#fbbf24" opacity={0.8} transparent />
      </mesh>
    </group>
  );
}

// ------------------------------------------------------------
// VILLAGE HOMES (COLLIDABLE WITH PHYSICAL BOUNDS)
// ------------------------------------------------------------
function VillageHouse({ 
  pos, rot, color, label 
}: { 
  pos: [number, number, number]; rot: number; color: string; label: string 
}) {
  const [ref] = useBox(() => ({
    type: 'Static',
    position: pos,
    rotation: [0, rot, 0],
    args: [5, 3.2, 4.5]
  }));

  return (
    <group ref={ref as any}>
      {/* Ground Concrete Plinth Base */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[5.2, 0.25, 4.7]} />
        <meshStandardMaterial color="#78716c" roughness={0.9} />
      </mesh>

      {/* Main Structural Mud / Plaster Walls */}
      <mesh castShadow receiveShadow position={[0, 1.6, 0]}>
        <boxGeometry args={[5, 2.8, 4.5]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>

      {/* Tilted Clay Terracotta Roof (Hut-style) */}
      <group position={[0, 3.1, 0]}>
        {/* Left sloping panel */}
        <mesh castShadow position={[-1.35, 0.5, 0]} rotation={[0, 0, 0.38]}>
          <boxGeometry args={[3.1, 0.16, 5.0]} />
          <meshStandardMaterial color="#b45309" roughness={0.82} /> {/* Red clay orange tiles */}
        </mesh>
        {/* Right sloping panel */}
        <mesh castShadow position={[1.35, 0.5, 0]} rotation={[0, 0, -0.38]}>
          <boxGeometry args={[3.1, 0.16, 5.0]} />
          <meshStandardMaterial color="#b45309" roughness={0.82} />
        </mesh>
        {/* Ridge Cap on roof peak */}
        <mesh position={[0, 1.1, 0]}>
          <boxGeometry args={[0.3, 0.18, 5.05]} />
          <meshStandardMaterial color="#78350f" />
        </mesh>
      </group>

      {/* Wooden Front Entrance Door */}
      <mesh position={[0, 0.9, 2.26]}>
        <boxGeometry args={[1.0, 1.8, 0.08]} />
        <meshStandardMaterial color="#451a03" roughness={0.9} />
      </mesh>

      {/* Window cutouts and brass trim bar */}
      <mesh position={[-1.6, 1.4, 2.26]}>
        <boxGeometry args={[0.8, 0.8, 0.04]} />
        <meshStandardMaterial color="#1e3a5f" emissive="#111827" />
      </mesh>
      <mesh position={[1.6, 1.4, 2.26]}>
        <boxGeometry args={[0.8, 0.8, 0.04]} />
        <meshStandardMaterial color="#1e3a5f" emissive="#111827" />
      </mesh>

      {/* Small veranda posts */}
      <mesh position={[-2.3, 1.2, 2.45]}>
        <cylinderGeometry args={[0.08, 0.08, 2.4]} />
        <meshStandardMaterial color="#e7e5e4" roughness={0.9} />
      </mesh>
      <mesh position={[2.3, 1.2, 2.45]}>
        <cylinderGeometry args={[0.08, 0.08, 2.4]} />
        <meshStandardMaterial color="#e7e5e4" roughness={0.9} />
      </mesh>
    </group>
  );
}

// DUAL-STOREY MODERN VILLAGE FLAAT
function ModernFlat({ pos, rot }: { pos: [number, number, number]; rot: number }) {
  const [ref] = useBox(() => ({
    type: 'Static',
    position: pos,
    rotation: [0, rot, 0],
    args: [6, 5.8, 5.5]
  }));

  return (
    <group ref={ref as any}>
      {/* Floor 1 Concrete block */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <boxGeometry args={[6, 2.8, 5.5]} />
        <meshStandardMaterial color="#f0fdf4" roughness={0.8} /> {/* Bright light-green cement */}
      </mesh>

      {/* Balcony Platform separating floors */}
      <mesh position={[0, 2.9, 0.4]}>
        <boxGeometry args={[6.4, 0.18, 6.2]} />
        <meshStandardMaterial color="#dc2626" /> {/* Contrasting red band */}
      </mesh>

      {/* Floor 2 Modern structure */}
      <mesh position={[0, 4.4, 0]} castShadow>
        <boxGeometry args={[5.8, 2.8, 5.1]} />
        <meshStandardMaterial color="#fef2f2" roughness={0.8} />
      </mesh>

      {/* Balcony railings */}
      <mesh position={[0, 3.4, 3.3]}>
        <boxGeometry args={[5.4, 0.8, 0.08]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
      </mesh>

      {/* Blue glass windows */}
      <mesh position={[-1.5, 4.4, 2.56]}>
        <boxGeometry args={[1.2, 1.4, 0.05]} />
        <meshStandardMaterial color="#0ea5e9" opacity={0.6} transparent roughness={0.1} />
      </mesh>
      <mesh position={[1.5, 4.4, 2.56]}>
        <boxGeometry args={[1.2, 1.4, 0.05]} />
        <meshStandardMaterial color="#0ea5e9" opacity={0.6} transparent roughness={0.1} />
      </mesh>
    </group>
  );
}

// ------------------------------------------------------------
// INDIAN HIGHWAY DHABA (CHAI STALL)
// ------------------------------------------------------------
function Dhaba({ pos, rot }: { pos: [number, number, number]; rot: number }) {
  const [ref] = useBox(() => ({
    type: 'Static',
    position: pos,
    rotation: [0, rot, 0],
    args: [6.5, 2.8, 5.0]
  }));

  return (
    <group ref={ref as any}>
      {/* Dirt Courtyard base */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[6.8, 0.1, 5.2]} />
        <meshStandardMaterial color="#a16207" roughness={0.96} /> {/* Sandy dirt soil */}
      </mesh>

      {/* Rustic Brick wall backboard */}
      <mesh position={[0, 1.4, -2.4]} castShadow>
        <boxGeometry args={[6.4, 2.8, 0.4]} />
        <meshStandardMaterial color="#f97316" roughness={0.9} />
      </mesh>

      {/* Bamboo/Straw thatched awning overhead */}
      <group position={[0, 2.5, 0.4]}>
        <mesh position={[0, 0, 0]} rotation={[0.12, 0, 0]} castShadow>
          <boxGeometry args={[6.6, 0.12, 5.2]} />
          <meshStandardMaterial color="#713f12" roughness={0.95} /> {/* Golden-brown straw */}
        </mesh>
        
        {/* Support columns */}
        <mesh position={[-3.1, -1.25, 2.4]}>
          <cylinderGeometry args={[0.06, 0.06, 2.5]} />
          <meshStandardMaterial color="#78350f" />
        </mesh>
        <mesh position={[3.1, -1.25, 2.4]}>
          <cylinderGeometry args={[0.06, 0.06, 2.5]} />
          <meshStandardMaterial color="#78350f" />
        </mesh>
      </group>

      {/* RAJU'S CHAI COUNTER STATION */}
      <mesh position={[-1.8, 0.55, 1.0]} castShadow>
        <boxGeometry args={[2.0, 1.1, 0.8]} />
        <meshStandardMaterial color="#eab308" roughness={0.4} /> {/* Yellow metal kiosk counter */}
      </mesh>
      
      {/* Huge brass boiling tea kettle */}
      <mesh position={[-1.8, 1.25, 1.0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.4]} />
        <meshStandardMaterial color="#f3f4f6" metalness={0.94} roughness={0.12} />
      </mesh>

      {/* Wooden customer benches (Khatiyas / Charpais) */}
      <group position={[1.8, 0.35, 1.2]} rotation={[0, -0.15, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1.8, 0.12, 0.8]} />
          <meshStandardMaterial color="#854d0e" roughness={0.9} />
        </mesh>
        {/* Stand legs */}
        <mesh position={[-0.8, -0.15, -0.3]}>
          <boxGeometry args={[0.1, 0.3, 0.1]} />
          <meshStandardMaterial color="#1c1917" />
        </mesh>
        <mesh position={[0.8, -0.15, -0.3]}>
          <boxGeometry args={[0.1, 0.3, 0.1]} />
          <meshStandardMaterial color="#1c1917" />
        </mesh>
        <mesh position={[-0.8, -0.15, 0.3]}>
          <boxGeometry args={[0.1, 0.3, 0.1]} />
          <meshStandardMaterial color="#1c1917" />
        </mesh>
        <mesh position={[0.8, -0.15, 0.3]}>
          <boxGeometry args={[0.1, 0.3, 0.1]} />
          <meshStandardMaterial color="#1c1917" />
        </mesh>
      </group>

      {/* Glowing Lantern bulb ornament */}
      <mesh position={[-1.8, 2.0, 1.0]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="#ffffff" emissive="#fbbf24" emissiveIntensity={3} />
      </mesh>
    </group>
  );
}

// ------------------------------------------------------------
// INTERACTIVE GLOWING STREETLIGHT WITH REAL SPOTLIGHT
// ------------------------------------------------------------
function Streetlight({ pos, isNight }: { pos: [number, number, number]; isNight: boolean }) {
  return (
    <group position={pos}>
      {/* Main tall metal pillar pole */}
      <mesh castShadow position={[0, 3.2, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 6.4]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Horizontal extension tube arm */}
      <mesh position={[0.45, 6.2, 0]} rotation={[0, 0, Math.PI / 6]}>
        <cylinderGeometry args={[0.05, 0.05, 1.2]} />
        <meshStandardMaterial color="#475569" metalness={0.8} />
      </mesh>

      {/* Lamp Head fixture */}
      <mesh position={[0.9, 6.4, 0]} castShadow>
        <boxGeometry args={[0.5, 0.18, 0.3]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} />
      </mesh>

      {/* Dynamic Glowing Yellow Bulb */}
      <mesh position={[0.9, 6.28, 0]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial 
          color="#ffffff" 
          emissive={isNight ? "#fcd34d" : "#4b5563"} 
          emissiveIntensity={isNight ? 5 : 0} 
        />
      </mesh>

      {/* Night spotlight flare pointing straight onto the tarmac */}
      {isNight && (
        <spotLight
          position={[0.9, 6.1, 0]}
          angle={0.78}
          penumbra={0.6}
          intensity={12.0}
          distance={16}
          color="#fef08a"
          castShadow
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
          target-position={[0.9, 0, 0]}
        />
      )}
    </group>
  );
}

// ------------------------------------------------------------
// RUSTIC SCENIC PROPS (HAYSTACKS, MILESTONES, FENCES)
// ------------------------------------------------------------
function Haystack({ pos, scale }: { pos: [number, number, number]; scale: [number, number, number] }) {
  const [ref] = useCylinder(() => ({
    type: 'Static',
    position: pos,
    args: [scale[0], scale[0] * 1.1, scale[1] * 0.7, 12]
  }));

  return (
    <group ref={ref as any}>
      {/* Cylinder lower straw bundle */}
      <mesh castShadow>
        <cylinderGeometry args={[scale[0], scale[0], scale[1] * 0.7, 12]} />
        <meshStandardMaterial color="#ca8a04" roughness={0.96} /> {/* Golden Yellow wheat stalk color */}
      </mesh>
      {/* Conical peak cover straw */}
      <mesh position={[0, scale[1] * 0.65, 0]} castShadow>
        <coneGeometry args={[scale[0] * 1.12, scale[1] * 0.6, 12]} />
        <meshStandardMaterial color="#ca8a04" roughness={0.96} />
      </mesh>
    </group>
  );
}

function RtoMilestone({ pos, text }: { pos: [number, number, number]; text: string }) {
  const [ref] = useBox(() => ({
    type: 'Static',
    position: pos,
    args: [0.6, 1.2, 0.4]
  }));

  return (
    <group ref={ref as any}>
      {/* Milestone concrete pillar */}
      <mesh castShadow position={[0, 0.35, 0]}>
        <boxGeometry args={[0.58, 0.8, 0.38]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.8} /> {/* White base paint */}
      </mesh>

      {/* Indian Highway RTO Yellow dome topper */}
      <mesh position={[0, 0.85, 0]}>
        <sphereGeometry args={[0.29, 12, 12]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.5} /> {/* Yellow Highway Topper */}
      </mesh>

      {/* Decorative text block lines (Highway indicator decals) */}
      <mesh position={[0, 0.4, 0.2]}>
        <boxGeometry args={[0.42, 0.1, 0.02]} />
        <meshStandardMaterial color="#111827" /> {/* black ink code line */}
      </mesh>
      <mesh position={[0, 0.2, 0.2]}>
        <boxGeometry args={[0.3, 0.05, 0.02]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
    </group>
  );
}

function Fence({ pos, rot }: { pos: [number, number, number]; rot: number }) {
  const [ref] = useBox(() => ({
    type: 'Static',
    position: pos,
    rotation: [0, rot, 0],
    args: [4.8, 1.2, 0.2]
  }));

  return (
    <group ref={ref as any}>
      {/* Main horizontal wood barrier rail */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[4.6, 0.12, 0.1]} />
        <meshStandardMaterial color="#a16224" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[4.6, 0.12, 0.1]} />
        <meshStandardMaterial color="#a16224" roughness={0.9} />
      </mesh>

      {/* Vertical pillars */}
      <mesh position={[-2.1, 0.48, 0]}>
        <boxGeometry args={[0.18, 1.1, 0.18]} />
        <meshStandardMaterial color="#78350f" />
      </mesh>
      <mesh position={[0, 0.48, 0]}>
        <boxGeometry args={[0.18, 1.1, 0.18]} />
        <meshStandardMaterial color="#78350f" />
      </mesh>
      <mesh position={[2.1, 0.48, 0]}>
        <boxGeometry args={[0.18, 1.1, 0.18]} />
        <meshStandardMaterial color="#78350f" />
      </mesh>
    </group>
  );
}

// ------------------------------------------------------------
// HIGH-FIDELITY COLLIDABLE REGULATORY BARRICADES
// ------------------------------------------------------------
function BarricadeObstacle({ pos, rot }: { pos: [number, number, number]; rot: number }) {
  const [ref] = useBox(() => ({
    type: 'Static',
    position: pos,
    rotation: [0, rot, 0],
    args: [3.2, 0.9, 0.4]
  }));

  return (
    <group ref={ref as any}>
      {/* Base feet support blocks */}
      <mesh position={[-1.3, -0.32, 0]}>
        <boxGeometry args={[0.3, 0.18, 0.8]} />
        <meshStandardMaterial color="#374151" roughness={0.9} />
      </mesh>
      <mesh position={[1.3, -0.32, 0]}>
        <boxGeometry args={[0.3, 0.18, 0.8]} />
        <meshStandardMaterial color="#374151" roughness={0.9} />
      </mesh>

      {/* Warning Barrier central plate */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[2.9, 0.6, 0.1]} />
        <meshStandardMaterial color="#dc2626" roughness={0.4} /> {/* Bright Signal Orange Red */}
      </mesh>

      {/* Yellow/White reflective panel trim strips */}
      <mesh position={[-0.8, 0.15, 0.055]}>
        <boxGeometry args={[0.4, 0.5, 0.01]} />
        <meshStandardMaterial color="#fbbf24" emissive="#ca8a04" emissiveIntensity={0.1} />
      </mesh>
      <mesh position={[0.8, 0.15, 0.055]}>
        <boxGeometry args={[0.4, 0.5, 0.01]} />
        <meshStandardMaterial color="#fbbf24" emissive="#ca8a04" emissiveIntensity={0.1} />
      </mesh>
      
      {/* Reflective center stripe */}
      <mesh position={[0, 0.15, 0.055]}>
        <boxGeometry args={[0.7, 0.15, 0.012]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Frame posts holding the sign board */}
      <mesh position={[-1.3, 0.15, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.9]} />
        <meshStandardMaterial color="#475569" metalness={0.9} />
      </mesh>
      <mesh position={[1.3, 0.15, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.9]} />
        <meshStandardMaterial color="#475569" metalness={0.9} />
      </mesh>
    </group>
  );
}

// ------------------------------------------------------------
// LEGENDARY INDIAN VEHICLES (COLLIDABLE SCENE MODELS)
// ------------------------------------------------------------

function MahindraTractor({ pos, rot }: { pos: [number, number, number]; rot: number }) {
  const [ref] = useBox(() => ({
    type: 'Static',
    position: pos,
    rotation: [0, rot, 0],
    args: [2.0, 1.3, 3.2]
  }));

  return (
    <group ref={ref as any}>
      {/* 1. Main Mahindra red engine body block */}
      <mesh castShadow position={[0, 0.28, -0.2]}>
        <boxGeometry args={[0.82, 0.72, 1.8]} />
        <meshStandardMaterial color="#dc2626" roughness={0.15} metalness={0.7} /> {/* Indian Red */}
      </mesh>

      {/* Main black front grille lining block */}
      <mesh position={[0, 0.24, -1.13]}>
        <boxGeometry args={[0.76, 0.62, 0.08]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>

      {/* Glowing headlights */}
      <mesh position={[-0.26, 0.24, -1.18]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.4} />
      </mesh>
      <mesh position={[0.26, 0.24, -1.18]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.4} />
      </mesh>

      {/* 2. Driver cockpit and high fender mudguards */}
      <mesh castShadow position={[0, 0.44, 0.9]}>
        <boxGeometry args={[1.54, 0.38, 1.1]} />
        <meshStandardMaterial color="#dc2626" roughness={0.18} />
      </mesh>
      
      {/* Driver seat cushion */}
      <mesh position={[0, 0.74, 0.78]}>
        <boxGeometry args={[0.48, 0.26, 0.42]} />
        <meshStandardMaterial color="#2d2d2d" roughness={0.8} />
      </mesh>

      {/* Exhaust silencer vertical pipe stack (A staple detail!) */}
      <group position={[0.26, 0.94, -0.6]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.04, 0.04, 1.4]} />
          <meshStandardMaterial color="#2d2d30" metalness={0.9} />
        </mesh>
        {/* Curved cap */}
        <mesh position={[0.04, 0.7, 0]} rotation={[0, 0, Math.PI / 4]}>
          <cylinderGeometry args={[0.04, 0.04, 0.15]} />
          <meshStandardMaterial color="#2d2d30" />
        </mesh>
      </group>

      {/* Vertical steering linkage bar wheel */}
      <group position={[0, 0.88, 0.35]} rotation={[Math.PI / 6, 0, 0]}>
        <mesh position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.6]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.24, 0.24, 0.04]} />
          <meshStandardMaterial color="#111827" roughness={0.8} />
        </mesh>
      </group>

      {/* 3. WHEELS (HUGE REAR RUBBERS, SMALL FRONT WHEELS) */}
      {/* Rear Left (Huge) */}
      <mesh castShadow position={[-0.88, 0.16, 0.9]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.62, 0.62, 0.42]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.95} />
      </mesh>
      {/* Rear Right (Huge) */}
      <mesh castShadow position={[0.88, 0.16, 0.9]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.62, 0.62, 0.42]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.95} />
      </mesh>

      {/* Front Left (Small) */}
      <mesh castShadow position={[-0.52, -0.16, -0.7]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.36, 0.36, 0.22]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.95} />
      </mesh>
      {/* Front Right (Small) */}
      <mesh castShadow position={[0.52, -0.16, -0.7]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.36, 0.36, 0.22]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.95} />
      </mesh>
    </group>
  );
}

function TukTukAutoRickshaw({ pos, rot }: { pos: [number, number, number]; rot: number }) {
  const [ref] = useBox(() => ({
    type: 'Static',
    position: pos,
    rotation: [0, rot, 0],
    args: [1.3, 1.4, 2.3]
  }));

  return (
    <group ref={ref as any}>
      {/* Yellow roof canopy */}
      <mesh castShadow position={[0, 0.54, 0.05]}>
        <boxGeometry args={[1.18, 0.58, 2.05]} />
        <meshStandardMaterial color="#facc15" roughness={0.2} metalness={0.7} /> {/* Sunny Yellow */}
      </mesh>

      {/* Green lower body pane */}
      <mesh castShadow position={[0, -0.06, 0.0]}>
        <boxGeometry args={[1.2, 0.66, 2.1]} />
        <meshStandardMaterial color="#15803d" roughness={0.16} metalness={0.8} /> {/* RTO Green */}
      </mesh>

      {/* Open cabin cutout space */}
      <mesh position={[0, 0.22, 0.1]}>
        <boxGeometry args={[1.22, 0.52, 1.3]} />
        <meshStandardMaterial color="#1c1917" roughness={0.9} />
      </mesh>

      {/* Windshield frame panel */}
      <group position={[0, 0.42, -0.85]}>
        <mesh castShadow>
          <boxGeometry args={[1.14, 0.44, 0.06]} />
          <meshStandardMaterial color="#facc15" roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, -0.032]}>
          <boxGeometry args={[1.04, 0.35, 0.02]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.0} opacity={0.6} transparent />
        </mesh>
      </group>

      {/* Round single glowing headlight at front center and license badge */}
      <mesh position={[0, -0.04, -1.08]}>
        <sphereGeometry args={[0.13, 10, 10]} />
        <meshStandardMaterial color="#ffffff" emissive="#fef08a" emissiveIntensity={1.8} />
      </mesh>
      <mesh position={[0, -0.24, -1.08]}>
        <boxGeometry args={[0.3, 0.12, 0.02]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>

      {/* Auto rear double tyres */}
      <mesh castShadow position={[-0.62, -0.42, 0.62]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.28, 0.28, 0.2]} />
        <meshStandardMaterial color="#2d2d30" roughness={0.96} />
      </mesh>
      <mesh castShadow position={[0.62, -0.42, 0.62]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.28, 0.28, 0.2]} />
        <meshStandardMaterial color="#2d2d30" roughness={0.96} />
      </mesh>

      {/* Single front steering wheel */}
      <mesh castShadow position={[0, -0.42, -0.74]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.28, 0.28, 0.18]} />
        <meshStandardMaterial color="#2d2d30" roughness={0.96} />
      </mesh>
    </group>
  );
}

// ------------------------------------------------------------
// SCENIC TREES (TRADITIONAL BROAD-LEAF NEEM / BANYAN STYLINGS)
// ------------------------------------------------------------
function SaplingTree({ pos, scale }: { pos: [number, number, number]; scale: number }) {
  const [ref] = useCylinder(() => ({
    type: 'Static',
    position: pos,
    args: [0.38 * scale, 0.44 * scale, 4.4 * scale]
  }));

  return (
    <group ref={ref as any}>
      {/* Tree wood trunk timber */}
      <mesh castShadow position={[0, 2.2 * scale, 0]}>
        <cylinderGeometry args={[0.28 * scale, 0.42 * scale, 4.4 * scale, 8]} />
        <meshStandardMaterial color="#78350f" roughness={0.95} /> {/* Bark brown */}
      </mesh>

      {/* Branch clusters holding dense leafy boxes */}
      <group position={[0, 4.0 * scale, 0]}>
        {/* Layer 1 (Bottom wide green layer) */}
        <mesh castShadow position={[0, 0.2 * scale, 0]}>
          <boxGeometry args={[3.2 * scale, 1.8 * scale, 3.2 * scale]} />
          <meshStandardMaterial color="#166534" roughness={0.9} /> {/* Deep Neem Green */}
        </mesh>
        
        {/* Layer 2 (Middle tapered layer) */}
        <mesh castShadow position={[0, 1.3 * scale, 0]}>
          <boxGeometry args={[2.4 * scale, 1.5 * scale, 2.4 * scale]} />
          <meshStandardMaterial color="#15803d" roughness={0.9} />
        </mesh>

        {/* Layer 3 (Top dense cap) */}
        <mesh castShadow position={[0, 2.3 * scale, 0]} rotation={[0, Math.PI / 4, 0]}>
          <boxGeometry args={[1.5 * scale, 1.2 * scale, 1.5 * scale]} />
          <meshStandardMaterial color="#22c55e" roughness={0.95} />
        </mesh>
      </group>
    </group>
  );
}

// ------------------------------------------------------------
// NEW OPEN-WORLD NEPALI LOCATIONS, SHOPS, AND PEDESTRIANS
// ------------------------------------------------------------

// 1. Far Snowy Himalayas visible over Belbari plains (North-West Horizon)
export function FarHimalayas() {
  return (
    <group position={[-160, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
      {/* Mountain 1 - Mount Everest Silhouette */}
      <mesh position={[-45, -5, -40]} castShadow>
        <coneGeometry args={[48, 80, 4]} />
        <meshStandardMaterial color="#64748b" roughness={0.9} /> {/* Slate grey base */}
      </mesh>
      <mesh position={[-45, 25.5, -40]}>
        <coneGeometry args={[18.5, 19, 4]} />
        <meshStandardMaterial color="#ffffff" roughness={0.25} emissive="#f8fafc" emissiveIntensity={0.25} /> {/* Snowy Peak */}
      </mesh>

      {/* Mountain 2 - Kanchenjunga Range */}
      <mesh position={[10, -5, -85]} castShadow>
        <coneGeometry args={[55, 90, 4]} />
        <meshStandardMaterial color="#475569" roughness={0.9} />
      </mesh>
      <mesh position={[10, 29.5, -85]}>
        <coneGeometry args={[21.5, 22, 4]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} emissive="#ffffff" emissiveIntensity={0.3} />
      </mesh>

      {/* Mountain 3 - Makalu Ridge */}
      <mesh position={[75, -5, 5]} castShadow>
        <coneGeometry args={[40, 68, 4]} />
        <meshStandardMaterial color="#334155" roughness={0.95} />
      </mesh>
      <mesh position={[75, 20.5, 5]}>
        <coneGeometry args={[15.5, 16, 4]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>

      {/* Mountain 4 - Lower green foothill layer */}
      <mesh position={[-90, -12, 50]} castShadow>
        <coneGeometry args={[35, 50, 4]} />
        <meshStandardMaterial color="#1e293b" roughness={0.98} />
      </mesh>
      {/* Mountain 5 - Far side peak */}
      <mesh position={[130, -5, -35]} castShadow>
        <coneGeometry args={[42, 60, 4]} />
        <meshStandardMaterial color="#1e293b" roughness={0.98} />
      </mesh>
    </group>
  );
}

// 2. Traditional Grocery Store - Kirana Pasal
export function KiranaPasal({ pos, rot }: { pos: [number, number, number]; rot: number }) {
  const [ref] = useBox(() => ({
    type: 'Static',
    position: pos,
    rotation: [0, rot, 0],
    args: [5.2, 3.2, 4.4]
  }));

  return (
    <group ref={ref as any}>
      {/* Cement floor base */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[5.4, 0.22, 4.6]} />
        <meshStandardMaterial color="#374151" roughness={0.9} />
      </mesh>

      {/* Shop Cabin Body */}
      <mesh castShadow position={[0, 1.5, -0.4]}>
        <boxGeometry args={[5.0, 2.8, 3.4]} />
        <meshStandardMaterial color="#d97706" roughness={0.5} /> {/* Warm mud/brick yellow paint */}
      </mesh>

      {/* Wooden open shutter deck */}
      <mesh position={[0, 2.3, 1.3]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[4.8, 0.8, 0.08]} />
        <meshStandardMaterial color="#7c2d12" roughness={0.9} />
      </mesh>

      {/* Kirana Banner sign */}
      <group position={[0, 2.9, 1.4]} rotation={[0.05, 0, 0]}>
        <mesh>
          <boxGeometry args={[4.4, 0.52, 0.08]} />
          <meshStandardMaterial color="#dc2626" /> {/* Red Signboard */}
        </mesh>
        {/* Sign textual accents */}
        <mesh position={[0, 0, 0.045]}>
          <boxGeometry args={[4.0, 0.32, 0.01]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.25} />
        </mesh>
      </group>

      {/* Display Counter with fruits/veggies */}
      <group position={[0, 0.6, 1.3]}>
        <mesh castShadow>
          <boxGeometry args={[4.6, 1.0, 0.8]} />
          <meshStandardMaterial color="#451a03" roughness={0.8} />
        </mesh>
        
        {/* Veg crates */}
        {/* Red Tomatoes */}
        <mesh position={[-1.4, 0.55, 0.1]}>
          <boxGeometry args={[0.8, 0.16, 0.5]} />
          <meshStandardMaterial color="#ea580c" roughness={0.6} />
        </mesh>
        {/* Orange Mangoes */}
        <mesh position={[0, 0.55, 0.1]}>
          <boxGeometry args={[0.8, 0.16, 0.5]} />
          <meshStandardMaterial color="#f97316" roughness={0.6} />
        </mesh>
        {/* Yellow Bananas */}
        <mesh position={[1.4, 0.55, 0.1]}>
          <boxGeometry args={[0.8, 0.16, 0.5]} />
          <meshStandardMaterial color="#eab308" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

// 3. Nepalese Tea Stall - Chiya Ghar
export function ChiyaGhar({ pos, rot }: { pos: [number, number, number]; rot: number }) {
  const [ref] = useBox(() => ({
    type: 'Static',
    position: pos,
    rotation: [0, rot, 0],
    args: [5.0, 3.2, 4.4]
  }));

  return (
    <group ref={ref as any}>
      {/* Ground Plinth */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[5.2, 0.2, 4.6]} />
        <meshStandardMaterial color="#44403c" roughness={0.9} />
      </mesh>

      {/* Back mud wall */}
      <mesh castShadow position={[0, 1.5, -1.8]}>
        <boxGeometry args={[4.8, 2.8, 0.5]} />
        <meshStandardMaterial color="#b45309" roughness={0.96} /> {/* Clay mud brown */}
      </mesh>

      {/* Bamboo supports */}
      <mesh position={[-2.3, 1.5, 1.8]}>
        <cylinderGeometry args={[0.06, 0.06, 3.0]} />
        <meshStandardMaterial color="#a16207" />
      </mesh>
      <mesh position={[2.3, 1.5, 1.8]}>
        <cylinderGeometry args={[0.06, 0.06, 3.0]} />
        <meshStandardMaterial color="#a16207" />
      </mesh>

      {/* Thatched Grass roof */}
      <mesh position={[0, 3.0, 0.1]} rotation={[0.16, 0, 0]}>
        <boxGeometry args={[5.2, 0.15, 4.4]} />
        <meshStandardMaterial color="#ca8a04" roughness={0.98} />
      </mesh>

      {/* Chiya Sign board */}
      <group position={[0, 2.6, 1.9]} rotation={[0.08, 0, 0]}>
        <mesh>
          <boxGeometry args={[3.2, 0.45, 0.06]} />
          <meshStandardMaterial color="#166534" />
        </mesh>
        <mesh position={[0, 0, 0.035]}>
          <boxGeometry args={[2.9, 0.3, 0.01]} />
          <meshStandardMaterial color="#fef08a" emissive="#ca8a04" emissiveIntensity={0.15} />
        </mesh>
      </group>

      {/* Serving Bench inside */}
      <mesh position={[0, 0.55, 0.4]}>
        <boxGeometry args={[4.2, 0.9, 0.8]} />
        <meshStandardMaterial color="#451a03" roughness={0.9} />
      </mesh>

      {/* Brass boiling visual kettle */}
      <group position={[-1.2, 1.1, 0.4]}>
        <mesh>
          <cylinderGeometry args={[0.22, 0.22, 0.45]} />
          <meshStandardMaterial color="#eab308" metalness={0.94} roughness={0.15} />
        </mesh>
        <mesh position={[0.25, 0.15, 0]} rotation={[0, 0, -Math.PI / 6]}>
          <cylinderGeometry args={[0.03, 0.03, 0.18]} />
          <meshStandardMaterial color="#eab308" metalness={0.95} />
        </mesh>
      </group>

      {/* Stools */}
      <mesh position={[-1.5, 0.2, 2.2]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.35]} />
        <meshStandardMaterial color="#1d4ed8" roughness={0.4} /> {/* Blue Plastic Stool */}
      </mesh>
      <mesh position={[1.5, 0.2, 2.2]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.35]} />
        <meshStandardMaterial color="#b91c1c" roughness={0.4} /> {/* Red Plastic Stool */}
      </mesh>
    </group>
  );
}

// 4. Fully Modeled Citizens - Pedestrians with Traditional Dhaka Topis
export function PedestrianNPC({ pos, outfitColor, skinColor = '#f59e0b', wearingDhaka = false }: { pos: [number, number, number]; outfitColor: string; skinColor?: string; wearingDhaka?: boolean }) {
  return (
    <group position={pos}>
      {/* Legs */}
      <mesh position={[-0.14, 0.28, 0]} castShadow>
        <boxGeometry args={[0.12, 0.56, 0.12]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0.14, 0.28, 0]} castShadow>
        <boxGeometry args={[0.12, 0.56, 0.12]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* Torso */}
      <mesh castShadow position={[0, 0.9, 0]}>
        <boxGeometry args={[0.46, 0.72, 0.24]} />
        <meshStandardMaterial color={outfitColor} roughness={0.9} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.42, 0]} castShadow>
        <sphereGeometry args={[0.18, 10, 10]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>

      {/* Dhaka Topi */}
      {wearingDhaka && (
        <group position={[0, 1.58, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.13, 0.14, 0.14, 4]} />
            <meshStandardMaterial color="#b91c1c" /> {/* Dhaka Red Grid */}
          </mesh>
          <mesh position={[0.02, 0.08, 0]}>
            <boxGeometry args={[0.24, 0.04, 0.24]} />
            <meshStandardMaterial color="#1e3a8a" />
          </mesh>
        </group>
      )}

      {/* Arms */}
      <mesh position={[-0.28, 0.9, 0]} castShadow>
        <boxGeometry args={[0.08, 0.44, 0.08]} />
        <meshStandardMaterial color={outfitColor} />
      </mesh>
      <mesh position={[0.28, 0.9, 0]} castShadow>
        <boxGeometry args={[0.08, 0.44, 0.08]} />
        <meshStandardMaterial color={outfitColor} />
      </mesh>
    </group>
  );
}

// 5. Real 3D Directional Signs
export function RoadSignPost({ pos, rot, destination, direction = 'straight' }: { pos: [number, number, number]; rot: number; destination: string; direction: 'straight' | 'left' | 'right' }) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* Sign Pillar */}
      <mesh castShadow position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 2.8]} />
        <meshStandardMaterial color="#475569" metalness={0.8} />
      </mesh>

      {/* Board Layout */}
      <group position={[0, 2.3, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1.7, 0.55, 0.06]} />
          <meshStandardMaterial color="#166534" roughness={0.3} /> {/* Forest Green board */}
        </mesh>
        {/* Inner white marker frame */}
        <mesh position={[0, 0, 0.035]}>
          <boxGeometry args={[1.55, 0.44, 0.01]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        {/* Green Core */}
        <mesh position={[0, 0, 0.04]}>
          <boxGeometry args={[1.5, 0.38, 0.01]} />
          <meshStandardMaterial color="#166534" />
        </mesh>

        {/* Direction indicators */}
        {direction === 'left' && (
          <group position={[-0.45, 0, 0.048]}>
            <mesh position={[-0.1, 0, 0]}>
              <boxGeometry args={[0.22, 0.04, 0.01]} />
              <meshStandardMaterial color="#fbbf24" />
            </mesh>
            <mesh position={[-0.16, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.12, 0.04, 0.01]} />
              <meshStandardMaterial color="#fbbf24" />
            </mesh>
            <mesh position={[-0.16, 0, 0]} rotation={[0, 0, -Math.PI / 4]}>
              <boxGeometry args={[0.12, 0.04, 0.01]} />
              <meshStandardMaterial color="#fbbf24" />
            </mesh>
          </group>
        )}
        {direction === 'right' && (
          <group position={[0.45, 0, 0.048]}>
            <mesh position={[0.1, 0, 0]}>
              <boxGeometry args={[0.22, 0.04, 0.01]} />
              <meshStandardMaterial color="#fbbf24" />
            </mesh>
            <mesh position={[0.16, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.12, 0.04, 0.01]} />
              <meshStandardMaterial color="#fbbf24" />
            </mesh>
            <mesh position={[0.16, 0, 0]} rotation={[0, 0, -Math.PI / 4]}>
              <boxGeometry args={[0.12, 0.04, 0.01]} />
              <meshStandardMaterial color="#fbbf24" />
            </mesh>
          </group>
        )}
        {direction === 'straight' && (
          <group position={[0, 0.12, 0.048]}>
            <mesh position={[0, -0.06, 0]}>
              <boxGeometry args={[0.04, 0.16, 0.01]} />
              <meshStandardMaterial color="#fbbf24" />
            </mesh>
            <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.1, 0.04, 0.01]} />
              <meshStandardMaterial color="#fbbf24" />
            </mesh>
            <mesh position={[0, 0, 0]} rotation={[0, 0, -Math.PI / 4]}>
              <boxGeometry args={[0.1, 0.04, 0.01]} />
              <meshStandardMaterial color="#fbbf24" />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
}

// 6. Scenic view platform overlooking far Himalayas (Kanchenjunga Vista Viewpoint)
export function ScenicMountainPlatform({ pos }: { pos: [number, number, number] }) {
  const [ref] = useBox(() => ({
    type: 'Static',
    position: pos,
    args: [6.5, 0.6, 6.5]
  }));

  return (
    <group ref={ref as any}>
      {/* Slab base */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[6.2, 0.6, 6.2]} />
        <meshStandardMaterial color="#4b5563" roughness={0.95} />
      </mesh>

      {/* Railings */}
      <mesh position={[0, 0.8, -2.95]} castShadow>
        <boxGeometry args={[6.0, 0.8, 0.12]} />
        <meshStandardMaterial color="#7c2d12" />
      </mesh>
      <mesh position={[-2.95, 0.8, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[6.0, 0.8, 0.12]} />
        <meshStandardMaterial color="#7c2d12" />
      </mesh>
      <mesh position={[2.95, 0.8, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[6.0, 0.8, 0.12]} />
        <meshStandardMaterial color="#7c2d12" />
      </mesh>

      {/* Binoculars */}
      <group position={[0, 0.5, -2.5]}>
        <mesh castShadow position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.7]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} />
        </mesh>
        <mesh position={[0, 0.6, 0.05]} rotation={[0.15, 0, 0]} castShadow>
          <boxGeometry args={[0.24, 0.14, 0.38]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </mesh>
      </group>

      {/* Rustic wood resting bar */}
      <group position={[0, 0.3, 1.8]}>
        <mesh castShadow>
          <boxGeometry args={[2.8, 0.1, 0.8]} />
          <meshStandardMaterial color="#7c2d12" />
        </mesh>
        <mesh position={[-1.2, -0.15, 0]} castShadow>
          <boxGeometry args={[0.1, 0.3, 0.6]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[1.2, -0.15, 0]} castShadow>
          <boxGeometry args={[0.1, 0.3, 0.6]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      </group>
    </group>
  );
}

// 7. Mud trail ground geometry lines
export function ForestTrailVisuals() {
  return (
    <group position={[0, 0.02, 0]}>
      {/* Staggered curved planar segments tracking dirt route towards forests */}
      <mesh receiveShadow position={[34, 0, 30]} rotation={[-Math.PI / 2, 0, 0.25]}>
        <planeGeometry args={[14, 2.5]} />
        <meshStandardMaterial color="#7c2d12" roughness={0.99} /> {/* Mud brown */}
      </mesh>
      <mesh receiveShadow position={[40, 0, 20]} rotation={[-Math.PI / 2, 0, 0.65]}>
        <planeGeometry args={[16, 2.3]} />
        <meshStandardMaterial color="#7c2d12" roughness={0.99} />
      </mesh>
      <mesh receiveShadow position={[42, 0, 4]} rotation={[-Math.PI / 2, 0, 1.25]}>
        <planeGeometry args={[22, 2.2]} />
        <meshStandardMaterial color="#7c2d12" roughness={0.99} />
      </mesh>
      <mesh receiveShadow position={[43, 0, -14]} rotation={[-Math.PI / 2, 0, 1.57]}>
        <planeGeometry args={[18, 2.0]} />
        <meshStandardMaterial color="#7c2d12" roughness={0.99} />
      </mesh>
    </group>
  );
}

// 8. Lookout post at forest terminus
export function ForestTrailViewpointSpot() {
  return (
    <group position={[43, 0.35, -24]}>
      {/* Lookout guide board */}
      <mesh castShadow position={[0, 0.6, 0.5]}>
        <cylinderGeometry args={[0.03, 0.03, 1.2]} />
        <meshStandardMaterial color="#451a03" />
      </mesh>
      <mesh position={[0, 1.1, 0.5]} castShadow>
        <boxGeometry args={[1.1, 0.34, 0.04]} />
        <meshStandardMaterial color="#7c2d12" />
      </mesh>

      {/* Cozy resting log */}
      <mesh castShadow rotation={[0, Math.PI / 4, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 2.2]} />
        <meshStandardMaterial color="#4b3525" roughness={0.96} />
      </mesh>
    </group>
  );
}
