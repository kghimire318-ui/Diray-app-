import * as THREE from 'three';
import { useMemo } from 'react';

/**
 * Procedural texture generators for highly detailed asphalt and lush green grass
 */

export function useProceduralAsphalt() {
  return useMemo(() => {
    // Return a dummy canvas if executed outside the browser
    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Base asphalt gray color (rich dark slate)
    ctx.fillStyle = '#1e1e21';
    ctx.fillRect(0, 0, 512, 512);

    // 1. Gravel/Grain Simulation (High-frequency noise)
    for (let i = 0; i < 45000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = Math.random() * 1.6;
      const opacity = Math.random() * 0.22;
      const shade = Math.floor(Math.random() * 120) + 90;
      ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${opacity})`;
      ctx.fillRect(x, y, size, size);
    }

    // 2. Add realistic tire wear tracks (Two parallel darker paths running vertically)
    // First track path around 20-35% of the width
    const trackGrad1 = ctx.createLinearGradient(0, 0, 512, 0);
    trackGrad1.addColorStop(0, 'rgba(12, 12, 14, 0)');
    trackGrad1.addColorStop(0.25, 'rgba(12, 12, 14, 0.42)');
    trackGrad1.addColorStop(0.40, 'rgba(12, 12, 14, 0)');
    ctx.fillStyle = trackGrad1;
    ctx.fillRect(0, 0, 512, 512);

    // Second track path around 65-80% of the width
    const trackGrad2 = ctx.createLinearGradient(0, 0, 512, 0);
    trackGrad2.addColorStop(0.60, 'rgba(12, 12, 14, 0)');
    trackGrad2.addColorStop(0.75, 'rgba(12, 12, 14, 0.42)');
    trackGrad2.addColorStop(0.90, 'rgba(12, 12, 14, 0)');
    ctx.fillStyle = trackGrad2;
    ctx.fillRect(0, 0, 512, 512);

    // 3. Fine cracks and wear weathering
    ctx.strokeStyle = 'rgba(8, 8, 10, 0.25)';
    ctx.lineWidth = 1.2;
    for (let j = 0; j < 3; j++) {
      ctx.beginPath();
      let cx = Math.random() * 512;
      let cy = 0;
      ctx.moveTo(cx, cy);
      while (cy < 512) {
        cx += (Math.random() - 0.5) * 16;
        cy += Math.random() * 35 + 12;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    // Lower repeating factor for fine texture grain
    texture.repeat.set(1, 1);
    return texture;
  }, []);
}

export function useProceduralGrass() {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Grass base green color
    ctx.fillStyle = '#224d17'; 
    ctx.fillRect(0, 0, 512, 512);

    // 1. Organic dandelions / dirt speck patterns
    for (let i = 0; i < 25000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = Math.random() * 2 + 0.8;
      const opacity = Math.random() * 0.28;
      
      // Alternate between lighter yellowish-green, pure grass green, and forest moss green
      const randVal = Math.random();
      let r = 26, g = 71, b = 18;
      if (randVal < 0.3) {
        r = 65; g = 117; b = 32; // light spring green
      } else if (randVal < 0.6) {
        r = 15; g = 41; b = 12; // deep shade
      } else if (randVal < 0.8) {
        r = 95; g = 142; b = 43; // bright dandelion moss
      }

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      ctx.fillRect(x, y, size, size);
    }

    // 2. Large radial turf patches (soft clouds for natural visual rhythm)
    for (let j = 0; j < 35; j++) {
      const cx = Math.random() * 512;
      const cy = Math.random() * 512;
      const radius = Math.random() * 90 + 40;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, 'rgba(45, 99, 29, 0.22)');
      grad.addColorStop(1, 'rgba(23, 49, 15, 0)');
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    // Large repeat mapping so grass appears dense on a big ground plane
    texture.repeat.set(30, 30);
    return texture;
  }, []);
}
