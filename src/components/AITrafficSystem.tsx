import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useBox } from '@react-three/cannon';
import * as THREE from 'three';
import { VEHICLE_DATABASE, VehicleSettings } from '../data/vehicles';

interface AITrafficConfig {
  id: string;
  code: string;
  color: string;
  lane: 'highway-north' | 'highway-south' | 'cross-east' | 'cross-west';
  speed: number;
}

// 5 staggered AI vehicles representing various Nepali road heroes
const TRAFFIC_CONFIGS: AITrafficConfig[] = [
  { id: 'ai-truck-1', code: '2100', color: '#ea580c', lane: 'highway-south', speed: 10 },    // Tata Truck (Orange)
  { id: 'ai-thar-2', code: '1100', color: '#b91c1c', lane: 'highway-north', speed: 15 },     // Mahindra Thar (Red)
  { id: 'ai-tuktuk-3', code: '2300', color: '#ca8a04', lane: 'cross-east', speed: 11 },       // Auto Rickshaw (Yellow/Yellow-green)
  { id: 'ai-swift-4', code: '1300', color: '#1d4ed8', lane: 'cross-west', speed: 14 },       // Suzuki Swift (Blue)
  { id: 'ai-bullet-5', code: '8000', color: '#111827', lane: 'highway-north', speed: 16 }     // Royal Enfield Bullet (Black)
];

interface AITrafficSystemProps {
  dayNightProgress: number;
}

export function AITrafficSystem({ dayNightProgress }: AITrafficSystemProps) {
  return (
    <group>
      {TRAFFIC_CONFIGS.map((config) => (
        <AITrafficVehicle 
          key={config.id} 
          config={config} 
          dayNightProgress={dayNightProgress} 
        />
      ))}
    </group>
  );
}

interface AITrafficVehicleProps {
  config: AITrafficConfig;
  dayNightProgress: number;
}

function AITrafficVehicle({ config, dayNightProgress }: AITrafficVehicleProps) {
  const vehicleSettings: VehicleSettings = VEHICLE_DATABASE[config.code];
  
  // Calculate initial position based on lane configurations
  const getInitialPosition = (): [number, number, number] => {
    switch (config.lane) {
      case 'highway-north':
        return [1.8, 1.2, -80 + Math.random() * 30];
      case 'highway-south':
        return [-1.8, 1.5, 80 - Math.random() * 30];
      case 'cross-east':
        return [-50 + Math.random() * 20, 1.2, 28.2];
      case 'cross-west':
        return [50 - Math.random() * 20, 1.2, 31.8];
    }
  };

  const initialPos = getInitialPosition();
  const mass = vehicleSettings.mass;
  const args = vehicleSettings.args;

  // Set up the box physical collider
  const [ref, api] = useBox(() => ({
    mass: mass,
    position: initialPos,
    args: args,
    linearDamping: 0.15,
    angularDamping: 0.85,
    allowSleep: false
  }));

  const isNight = dayNightProgress < 6 || dayNightProgress > 18;

  // Keep track of actual current state to reset if stuck or fallen
  const positionRef = useRef<[number, number, number]>([0, 0, 0]);
  const velocityRef = useRef<[number, number, number]>([0, 0, 0]);
  const rotationRef = useRef<[number, number, number]>([0, 0, 0]);
  const stuckTimerRef = useRef<number>(0);

  // Subscribing to physics changes
  useEffect(() => {
    const unsubPos = api.position.subscribe((v) => (positionRef.current = v));
    const unsubVel = api.velocity.subscribe((v) => (velocityRef.current = v));
    const unsubRot = api.rotation.subscribe((v) => (rotationRef.current = v));
    return () => {
      unsubPos();
      unsubVel();
      unsubRot();
    };
  }, [api]);

  // Handle resetting physical bodies to proper lane vectors
  const resetToLane = () => {
    let rx = 0, ry = 1.2, rz = 0;
    let turnY = 0;

    switch (config.lane) {
      case 'highway-north':
        rx = 1.8;
        rz = -82;
        turnY = 0;
        break;
      case 'highway-south':
        rx = -1.8;
        rz = 82;
        turnY = Math.PI;
        break;
      case 'cross-east':
        rx = -52;
        rz = 28.2;
        turnY = Math.PI / 2;
        break;
      case 'cross-west':
        rx = 52;
        rz = 31.8;
        turnY = -Math.PI / 2;
        break;
    }

    api.position.set(rx, ry + 0.3, rz);
    api.rotation.set(0, turnY, 0);
    api.velocity.set(0, 0, 0);
    api.angularVelocity.set(0, 0, 0);
    stuckTimerRef.current = 0;
  };

  // Run AI drive calculations inside state frames
  useFrame((state, delta) => {
    const pos = positionRef.current;
    const vel = velocityRef.current;
    const rot = rotationRef.current;

    // 1. BOUNDARDS WRAP-AROUND CONTROL
    let hasCrossedLimit = false;
    if (config.lane === 'highway-north' && pos[2] > 85) hasCrossedLimit = true;
    if (config.lane === 'highway-south' && pos[2] < -85) hasCrossedLimit = true;
    if (config.lane === 'cross-east' && pos[0] > 55) hasCrossedLimit = true;
    if (config.lane === 'cross-west' && pos[0] < -55) hasCrossedLimit = true;

    // Fall triggers
    if (pos[1] < -4) hasCrossedLimit = true;

    if (hasCrossedLimit) {
      resetToLane();
      return;
    }

    // 2. HEALTHY ACTIVE AUTO-CORRECT STUCK PROTOCOL (No permanent traffic jams)
    const scalarVel = Math.sqrt(vel[0] ** 2 + vel[2] ** 2);
    if (scalarVel < 0.6) {
      stuckTimerRef.current += delta;
      if (stuckTimerRef.current > 4.5) {
        // AI is stuck or flipped over, reset cleanly
        resetToLane();
        return;
      }
    } else {
      stuckTimerRef.current = 0;
    }

    // 3. APPLY ROTATIONAL STABILIZER (Keeps AI vehicles mostly pointing forward)
    let desiredAngle = 0;
    if (config.lane === 'highway-north') desiredAngle = 0;
    if (config.lane === 'highway-south') desiredAngle = Math.PI;
    if (config.lane === 'cross-east') desiredAngle = Math.PI / 2;
    if (config.lane === 'cross-west') desiredAngle = -Math.PI / 2;

    // Smoothly nudge any rolled (tumbled) vehicles to steer back onto target directions
    if (Math.abs(rot[0]) > 0.3 || Math.abs(rot[2]) > 0.3) {
      // Vehicle flipped or rolled!
      api.rotation.set(0, desiredAngle, 0);
    }

    // Set driving forces/velocities based on forward lanes
    const targetSpeed = config.speed;
    switch (config.lane) {
      case 'highway-north':
        api.velocity.set(0, vel[1], targetSpeed);
        break;
      case 'highway-south':
        api.velocity.set(0, vel[1], -targetSpeed);
        break;
      case 'cross-east':
        api.velocity.set(targetSpeed, vel[1], 0);
        break;
      case 'cross-west':
        api.velocity.set(-targetSpeed, vel[1], 0);
        break;
    }
  });

  // Decide model visualization category
  const isBike = vehicleSettings.type === 'bike';
  const isHeavyTruck = vehicleSettings.type === 'heavy' && config.code === '2100';
  const isTukTuk = vehicleSettings.type === 'heavy' && config.code === '2300';

  return (
    <group ref={ref as any}>
      {/* 1. BIKE RENDER BLOCK */}
      {isBike ? (
        <group>
          {/* Main frame */}
          <mesh castShadow position={[0, 0.05, 0]}>
            <boxGeometry args={[0.08, 0.25, 0.9]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
          </mesh>
          {/* Tank */}
          <mesh castShadow position={[0, 0.22, -0.06]}>
            <boxGeometry args={[0.2, 0.22, 0.36]} />
            <meshStandardMaterial color={config.color} roughness={0.2} metalness={0.7} />
          </mesh>
          {/* Seat */}
          <mesh castShadow position={[0, 0.18, 0.24]}>
            <boxGeometry args={[0.16, 0.08, 0.32]} />
            <meshStandardMaterial color="#2d2d30" roughness={0.9} />
          </mesh>
          {/* Handlebar cross block */}
          <mesh position={[0, 0.35, -0.3]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.015, 0.015, 0.55]} />
            <meshStandardMaterial color="#d4d4d8" metalness={0.9} />
          </mesh>
          {/* Wheel Hub assemblies */}
          <mesh position={[0, -0.22, -0.42]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.25, 0.25, 0.1]} />
            <meshStandardMaterial color="#171717" roughness={0.9} />
          </mesh>
          <mesh position={[0, -0.22, 0.42]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.25, 0.25, 0.12]} />
            <meshStandardMaterial color="#171717" roughness={0.9} />
          </mesh>
          {/* Simple Headlight */}
          <mesh position={[0, 0.28, -0.38]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial 
              color="#ffffff" 
              emissive={isNight ? '#fef08a' : '#000000'} 
              emissiveIntensity={isNight ? 1.5 : 0} 
            />
          </mesh>
        </group>

      ) : isHeavyTruck ? (
        // 2. TRUCK RENDER BLOCK (Tata-style decorated visual model)
        <group>
          {/* Cabin Base */}
          <mesh castShadow position={[0, 0.4, -0.8]}>
            <boxGeometry args={[2.0, 1.4, 1.6]} />
            <meshStandardMaterial color={config.color} roughness={0.3} metalness={0.6} />
          </mesh>
          {/* Windshield */}
          <mesh position={[0, 0.85, -1.55]}>
            <boxGeometry args={[1.8, 0.5, 0.05]} />
            <meshStandardMaterial color="#38bdf8" transparent opacity={0.6} />
          </mesh>
          {/* Indian Truck Canopy Crown (Overhead ornament) */}
          <mesh position={[0, 1.25, -0.8]}>
            <boxGeometry args={[2.1, 0.3, 1.55]} />
            <meshStandardMaterial color="#fbbf24" roughness={0.4} /> {/* Bright Yellow topper */}
          </mesh>
          {/* Cargo Body (Wooden Planks texturing/styling) */}
          <group position={[0, 0.4, 0.8]}>
            <mesh castShadow>
              <boxGeometry args={[2.2, 1.4, 3.2]} />
              <meshStandardMaterial color="#854d0e" roughness={0.9} /> {/* Wooden Brown */}
            </mesh>
            {/* Cargo Stripes banner representing vibrant Nepal trucks */}
            <mesh position={[0, 0.0, -1.51]}>
              <boxGeometry args={[2.18, 0.2, 0.02]} />
              <meshStandardMaterial color="#dc2626" /> {/* Red band */}
            </mesh>
            <mesh position={[0, 0.3, -1.51]}>
              <boxGeometry args={[2.18, 0.15, 0.02]} />
              <meshStandardMaterial color="#16a34a" /> {/* Green band */}
            </mesh>
          </group>

          {/* Under-wheels (Tires) */}
          <mesh position={[-0.95, -0.5, -1.1]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.42, 0.42, 0.3]} />
            <meshStandardMaterial color="#18181b" roughness={0.96} />
          </mesh>
          <mesh position={[0.95, -0.5, -1.1]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.42, 0.42, 0.3]} />
            <meshStandardMaterial color="#18181b" roughness={0.96} />
          </mesh>
          <mesh position={[-0.95, -0.5, 0.8]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.42, 0.42, 0.4]} />
            <meshStandardMaterial color="#18181b" roughness={0.96} />
          </mesh>
          <mesh position={[0.95, -0.5, 0.8]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.42, 0.42, 0.4]} />
            <meshStandardMaterial color="#18181b" roughness={0.96} />
          </mesh>

          {/* Dual headlights for Night support */}
          <group position={[0, 0.0, -1.65]}>
            <mesh position={[-0.75, 0, 0]}>
              <sphereGeometry args={[0.16, 8, 8]} />
              <meshStandardMaterial 
                color="#ffffff" 
                emissive={isNight ? '#ffffff' : '#000000'} 
                emissiveIntensity={isNight ? 1.6 : 0} 
              />
            </mesh>
            <mesh position={[0.75, 0, 0]}>
              <sphereGeometry args={[0.16, 8, 8]} />
              <meshStandardMaterial 
                color="#ffffff" 
                emissive={isNight ? '#ffffff' : '#000000'} 
                emissiveIntensity={isNight ? 1.6 : 0} 
              />
            </mesh>
          </group>
        </group>

      ) : isTukTuk ? (
        // 3. AUTO RICKSHAW TUK-TUK BLOCK
        <group>
          {/* Cabin Roof canopy (Iconic Yellow Top) */}
          <mesh castShadow position={[0, 0.42, 0.0]}>
            <boxGeometry args={[1.15, 0.9, 1.8]} />
            <meshStandardMaterial color="#ca8a04" roughness={0.3} />
          </mesh>
          {/* Lower Engine/Chassis Guard (Iconic Green Bottom) */}
          <mesh castShadow position={[0, -0.22, 0.0]}>
            <boxGeometry args={[1.18, 0.45, 1.86]} />
            <meshStandardMaterial color="#15803d" roughness={0.5} />
          </mesh>
          {/* Windshield pane */}
          <mesh position={[0, 0.35, -0.925]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[1.0, 0.52, 0.03]} />
            <meshStandardMaterial color="#a5f3fc" transparent opacity={0.62} />
          </mesh>

          {/* 3-WHEELS ASSEMBLY */}
          {/* Front wheel */}
          <mesh position={[0, -0.55, -0.7]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.26, 0.26, 0.16]} />
            <meshStandardMaterial color="#1c1917" roughness={0.9} />
          </mesh>
          {/* Left back wheel */}
          <mesh position={[-0.55, -0.55, 0.5]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.26, 0.26, 0.2]} />
            <meshStandardMaterial color="#1c1917" roughness={0.9} />
          </mesh>
          {/* Right back wheel */}
          <mesh position={[0.55, -0.55, 0.5]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.26, 0.26, 0.2]} />
            <meshStandardMaterial color="#1c1917" roughness={0.9} />
          </mesh>

          {/* Central front headlight */}
          <mesh position={[0, -0.05, -0.96]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial 
              color="#ffffff" 
              emissive={isNight ? '#fbbf24' : '#000000'} 
              emissiveIntensity={isNight ? 1.4 : 0} 
            />
          </mesh>
        </group>

      ) : (
        // 4. STANDARD AI CAR / SUV MODEL BLOCK
        <group>
          {/* Base Chassis */}
          <mesh castShadow position={[0, -0.1, 0]}>
            <boxGeometry args={[args[0] * 0.98, 0.28, args[2] * 0.98]} />
            <meshStandardMaterial color="#1a1a1c" roughness={0.9} />
          </mesh>
          {/* Main Cabin Body */}
          <mesh castShadow position={[0, 0.34, -0.06]}>
            <boxGeometry args={[args[0] * 0.92, args[1] * 0.62, args[2] * 0.76]} />
            <meshStandardMaterial color={config.color} roughness={0.2} metalness={0.7} />
          </mesh>
          {/* Top Cabin Cap */}
          <mesh castShadow position={[0, 0.72, 0.08]}>
            <boxGeometry args={[args[0] * 0.84, args[1] * 0.36, args[2] * 0.52]} />
            <meshStandardMaterial color="#1c1917" roughness={0.5} />
          </mesh>

          {/* Glass panels (front tilted glass look) */}
          <mesh position={[0, 0.64, -args[2] * 0.24]} rotation={[-0.45, 0, 0]}>
            <boxGeometry args={[args[0] * 0.8, 0.42, 0.02]} />
            <meshStandardMaterial color="#a5f3fc" transparent opacity={0.65} />
          </mesh>

          {/* Tires */}
          <group position={[0, -0.38, 0]}>
            <mesh position={[-args[0] * 0.46, 0, -args[2] * 0.28]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.34, 0.34, 0.24]} />
              <meshStandardMaterial color="#222222" roughness={0.95} />
            </mesh>
            <mesh position={[args[0] * 0.46, 0, -args[2] * 0.28]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.34, 0.34, 0.24]} />
              <meshStandardMaterial color="#222222" roughness={0.95} />
            </mesh>
            <mesh position={[-args[0] * 0.46, 0, args[2] * 0.28]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.34, 0.34, 0.24]} />
              <meshStandardMaterial color="#222222" roughness={0.95} />
            </mesh>
            <mesh position={[args[0] * 0.46, 0, args[2] * 0.28]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.34, 0.34, 0.24]} />
              <meshStandardMaterial color="#222222" roughness={0.95} />
            </mesh>
          </group>

          {/* Duel headlamps */}
          <group position={[0, 0.06, -args[2] * 0.46]}>
            <mesh position={[-args[0] * 0.34, 0, 0]}>
              <sphereGeometry args={[0.13, 8, 8]} />
              <meshStandardMaterial 
                color="#ffffff" 
                emissive={isNight ? '#ffffff' : '#000000'} 
                emissiveIntensity={isNight ? 1.5 : 0} 
              />
            </mesh>
            <mesh position={[args[0] * 0.34, 0, 0]}>
              <sphereGeometry args={[0.13, 8, 8]} />
              <meshStandardMaterial 
                color="#ffffff" 
                emissive={isNight ? '#ffffff' : '#000000'} 
                emissiveIntensity={isNight ? 1.5 : 0} 
              />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
}
