'use client';

import React, { useRef, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

interface Star {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  baseOpacity: number;
  twinkleSpeed: number;   // radians/sec — kept LOW (0.2–0.8)
  twinklePhase: number;   // random start offset
  twinkleRange: number;   // how much it varies (0.05–0.25)
  isBlue: boolean;
  isLarge: boolean;
  group: 'static' | 'slow' | 'falling';
}

interface ShootingStar {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  angle: number;
}

interface Cloud {
  x: number; y: number;
  width: number; height: number;
  speed: number;
  opacity: number;
  blur: number;
  color: string;
}

interface RainDrop {
  x: number; y: number;
  speed: number;
  length: number;
  opacity: number;
  layer: 'bg' | 'mid' | 'fg';
}

interface Fog {
  x: number; y: number;
  width: number; speed: number;
  opacity: number; blur: number;
}

interface MountainRange {
  points: { x: number; y: number }[];
  fill: string;
  rimColor: string;
  rimAlpha: number;
  speed: number;      // seconds for one slow cycle
  parallax: number;   // mouse sensitivity
  offset: number;     // accumulated drift
}

// ═══════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════

const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function genMountainPoints(count: number, baseY: number, amplitude: number, w: number, seed: number) {
  const pts: { x: number; y: number }[] = [];
  const step = (w + 600) / count;
  for (let i = 0; i <= count; i++) {
    const x = i * step - 300;
    const y = baseY
      - Math.abs(Math.sin(i * 0.7 + seed) * amplitude * 0.55)
      - Math.abs(Math.sin(i * 1.5 + seed * 2.1) * amplitude * 0.3)
      - Math.abs(Math.sin(i * 0.25 + seed * 0.5) * amplitude * 0.25)
      + Math.sin(i * 3.0 + seed * 3.7) * amplitude * 0.08;
    pts.push({ x, y });
  }
  return pts;
}

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════

export default function AtmosphericBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    stars: Star[];
    shootingStars: ShootingStar[];
    clouds: Cloud[];
    rain: RainDrop[];
    fog: Fog[];
    mountains: MountainRange[];
    glowPhase: number;
    stormPhase: number;
    stormFlash: number;
    stormFlashTimer: number;
    mouse: { x: number; y: number };
    scrollY: number;
    reducedMotion: boolean;
    time: number;
    lastTime: number;
    animFrame: number;
    initialized: boolean;
    w: number;
    h: number;
  } | null>(null);

  // ─── INIT ──────────────────────────────────────────
  const init = useCallback((w: number, h: number) => {
    const isMobile = w < 768;
    const rm = typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const starCount = rm ? 0 : (isMobile ? 50 : 90);
    const cloudCount = rm ? 0 : (isMobile ? 4 : 6);
    const fogCount = rm ? 0 : (isMobile ? 3 : 5);

    // ── Stars: 3 groups ──
    const staticCount = Math.floor(starCount * 0.55);
    const slowCount = Math.floor(starCount * 0.30);
    const fallingCount = starCount - staticCount - slowCount;

    const stars: Star[] = [];

    // Group A: Static — barely twinkle, high base opacity
    for (let i = 0; i < staticCount; i++) {
      const isLarge = i < staticCount * 0.08;
      const isBlue = i > staticCount * 0.90;
      stars.push({
        x: rand(0, w), y: rand(0, h * 0.52),
        vx: rand(-0.01, 0.01), vy: rand(0, 0.03),
        size: isLarge ? rand(2.5, 4) : isBlue ? rand(1.5, 2.2) : rand(0.8, 1.8),
        baseOpacity: isLarge ? rand(0.7, 1) : rand(0.35, 0.85),
        twinkleSpeed: rand(0.15, 0.5),    // VERY slow — one cycle every 12–40s
        twinklePhase: rand(0, Math.PI * 2),
        twinkleRange: rand(0.03, 0.1),     // barely noticeable
        isBlue, isLarge, group: 'static',
      });
    }

    // Group B: Slow-moving — gentle drift, subtle twinkle
    for (let i = 0; i < slowCount; i++) {
      const isBlue = i > slowCount * 0.85;
      stars.push({
        x: rand(0, w), y: rand(0, h * 0.52),
        vx: rand(-0.15, 0.15), vy: rand(0.05, 0.2),
        size: rand(1, 2.5),
        baseOpacity: rand(0.3, 0.7),
        twinkleSpeed: rand(0.3, 0.8),      // one cycle every 8–20s
        twinklePhase: rand(0, Math.PI * 2),
        twinkleRange: rand(0.08, 0.18),
        isBlue, isLarge: false, group: 'slow',
      });
    }

    // Group C: Falling particles — move downward, fade in/out
    for (let i = 0; i < fallingCount; i++) {
      stars.push({
        x: rand(0, w), y: rand(-h * 0.1, h * 0.55),
        vx: rand(-0.3, 0.3), vy: rand(0.3, 0.8),
        size: rand(0.8, 2),
        baseOpacity: rand(0.2, 0.5),
        twinkleSpeed: 0,                    // no twinkle — pure movement
        twinklePhase: 0,
        twinkleRange: 0,
        isBlue: Math.random() < 0.3,
        isLarge: false, group: 'falling',
      });
    }

    // ── Clouds ──
    const clouds: Cloud[] = Array.from({ length: cloudCount }, (_, i) => ({
      x: rand(-0.5, 1.5) * w,
      y: h * rand(0.15, 0.45),
      width: rand(w * 0.35, w * 1.0),
      height: rand(h * 0.08, h * 0.2),
      speed: (i % 2 === 0 ? 1 : -1) * rand(0.08, 0.22),  // pixels per frame at 60fps equivalent
      opacity: rand(0.12, 0.3),
      blur: rand(30, 60),
      color: ['#1A2844', '#1E3050', '#22345A', '#182640', '#1C2C4A', '#203050'][i % 6],
    }));

    // ── Rain: 3 depth layers ──
    const rain: RainDrop[] = [];
    // Background rain: small, thin, dim, slow
    const bgRainCount = isMobile ? 10 : 25;
    for (let i = 0; i < bgRainCount; i++) {
      rain.push({
        x: rand(0, w), y: rand(-h, h),
        speed: rand(1.5, 3), length: rand(10, 20),
        opacity: rand(0.04, 0.1),
        layer: 'bg',
      });
    }
    // Midground rain: medium
    const midRainCount = isMobile ? 12 : 30;
    for (let i = 0; i < midRainCount; i++) {
      rain.push({
        x: rand(0, w), y: rand(-h, h),
        speed: rand(2.5, 4.5), length: rand(18, 35),
        opacity: rand(0.08, 0.18),
        layer: 'mid',
      });
    }
    // Foreground rain: longer, brighter, faster
    const fgRainCount = isMobile ? 8 : 20;
    for (let i = 0; i < fgRainCount; i++) {
      rain.push({
        x: rand(0, w), y: rand(-h, h),
        speed: rand(3.5, 6), length: rand(25, 50),
        opacity: rand(0.12, 0.25),
        layer: 'fg',
      });
    }

    // ── Fog ──
    const fog: Fog[] = Array.from({ length: fogCount }, (_, i) => ({
      x: rand(-0.4, 1.4) * w,
      y: h * rand(0.52, 0.72),
      width: rand(w * 0.4, w * 1.0),
      speed: (i % 2 === 0 ? 1 : -1) * rand(0.05, 0.15),
      opacity: rand(0.06, 0.14),
      blur: rand(35, 65),
    }));

    // ── Mountains: 4 layers with pre-computed points ──
    const mountainDefs = [
      { count: 22, baseY: h * 0.56, amp: h * 0.22, fill: '#1A2438', rim: 'rgba(45, 80, 140, 0.22)', speed: 90, parallax: 3 },
      { count: 18, baseY: h * 0.64, amp: h * 0.17, fill: '#111A2B', rim: 'rgba(38, 65, 115, 0.18)', speed: 120, parallax: 5 },
      { count: 14, baseY: h * 0.73, amp: h * 0.12, fill: '#0D1220', rim: 'rgba(30, 55, 100, 0.14)', speed: 160, parallax: 7 },
      { count: 10, baseY: h * 0.83, amp: h * 0.06, fill: '#090D17', rim: 'rgba(22, 40, 75, 0.1)', speed: 200, parallax: 9 },
    ];

    const mountains: MountainRange[] = mountainDefs.map(md => ({
      points: genMountainPoints(md.count, md.baseY, md.amp, w, rand(1, 10)),
      fill: md.fill,
      rimColor: md.rim,
      rimAlpha: 1,
      speed: md.speed,
      parallax: md.parallax,
      offset: 0,
    }));

    stateRef.current = {
      stars, shootingStars: [], clouds, rain, fog, mountains,
      glowPhase: 0, stormPhase: 0, stormFlash: 0,
      stormFlashTimer: rand(25, 55),
      mouse: { x: 0.5, y: 0.5 }, scrollY: 0, reducedMotion: rm,
      time: 0, lastTime: performance.now(), animFrame: 0,
      initialized: true, w, h,
    };
  }, []);

  // ─── DRAW ──────────────────────────────────────────
  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    /* eslint-disable react-hooks/immutability */
    const s = stateRef.current;
    if (!s || !s.initialized) return;

    const now = performance.now();
    const rawDt = (now - s.lastTime) / 1000;
    const dt = Math.min(rawDt, 0.05);  // cap at 50ms to avoid jumps
    s.lastTime = now;
    s.time += dt;

    const mx = (s.mouse.x - 0.5) * 2;
    const my = (s.mouse.y - 0.5) * 2;
    const scrollFrac = s.scrollY / Math.max(1, h);

    ctx.clearRect(0, 0, w, h);

    // ══════════════════════════════════════════════
    // 1. SKY GRADIENT — visible dark navy, NOT black
    // ══════════════════════════════════════════════
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0C0E1C');
    sky.addColorStop(0.12, '#0F1225');
    sky.addColorStop(0.3, '#11162C');
    sky.addColorStop(0.5, '#0E1226');
    sky.addColorStop(0.65, '#0B0F1E');
    sky.addColorStop(1, '#090C18');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // ══════════════════════════════════════════════
    // 2. WIDE ATMOSPHERIC HAZE — blue wash
    // ══════════════════════════════════════════════
    const haze = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, w * 0.85);
    haze.addColorStop(0, 'rgba(28, 55, 110, 0.16)');
    haze.addColorStop(0.5, 'rgba(20, 40, 85, 0.08)');
    haze.addColorStop(1, 'rgba(15, 30, 65, 0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, w, h);

    // ══════════════════════════════════════════════
    // 3. STORM CLOUD LAYER — large, slow-pulsing
    // ══════════════════════════════════════════════
    s.stormPhase += dt;
    // Very slow breathing: 10–20 second cycle
    const stormPulse = Math.sin(s.stormPhase * 0.25) * 0.12 + 0.88;
    const stormX = mx * 4;
    const stormY = h * 0.28 + my * 4 - scrollFrac * 5;

    ctx.save();
    // Cloud mass 1
    ctx.globalAlpha = 0.22 * stormPulse;
    const sg1 = ctx.createRadialGradient(w * 0.4 + stormX, stormY, 0, w * 0.4 + stormX, stormY, w * 0.48);
    sg1.addColorStop(0, '#1A2844');
    sg1.addColorStop(0.5, '#1A2844');
    sg1.addColorStop(1, 'transparent');
    ctx.fillStyle = sg1;
    ctx.beginPath();
    ctx.ellipse(w * 0.4 + stormX, stormY, w * 0.48, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    // Cloud mass 2
    ctx.globalAlpha = 0.16 * stormPulse;
    const sg2 = ctx.createRadialGradient(w * 0.68 + stormX * 0.7, stormY + 25, 0, w * 0.68 + stormX * 0.7, stormY + 25, w * 0.38);
    sg2.addColorStop(0, '#1E3050');
    sg2.addColorStop(0.5, '#1E3050');
    sg2.addColorStop(1, 'transparent');
    ctx.fillStyle = sg2;
    ctx.beginPath();
    ctx.ellipse(w * 0.68 + stormX * 0.7, stormY + 25, w * 0.38, h * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    // Cloud mass 3
    ctx.globalAlpha = 0.13 * stormPulse;
    const sg3 = ctx.createRadialGradient(w * 0.28 + stormX * 0.5, stormY + 50, 0, w * 0.28 + stormX * 0.5, stormY + 50, w * 0.32);
    sg3.addColorStop(0, '#15203A');
    sg3.addColorStop(0.5, '#15203A');
    sg3.addColorStop(1, 'transparent');
    ctx.fillStyle = sg3;
    ctx.beginPath();
    ctx.ellipse(w * 0.28 + stormX * 0.5, stormY + 50, w * 0.32, h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    // Cloud mass 4 — upper wispy
    ctx.globalAlpha = 0.08 * stormPulse;
    const sg4 = ctx.createRadialGradient(w * 0.55 + stormX * 0.3, stormY - 30, 0, w * 0.55 + stormX * 0.3, stormY - 30, w * 0.55);
    sg4.addColorStop(0, '#1E2E50');
    sg4.addColorStop(0.5, '#1E2E50');
    sg4.addColorStop(1, 'transparent');
    ctx.fillStyle = sg4;
    ctx.beginPath();
    ctx.ellipse(w * 0.55 + stormX * 0.3, stormY - 30, w * 0.55, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ══════════════════════════════════════════════
    // 4. STARS — grouped by behavior
    // ══════════════════════════════════════════════
    const starPX = mx * 2.5;
    const starPY = my * 1.5 + scrollFrac * 2;

    for (const star of s.stars) {
      // Movement
      star.x += star.vx * dt * 18;
      star.y += star.vy * dt * 18;

      // Wrap
      if (star.group === 'falling') {
        if (star.y > h * 0.65) { star.y = rand(-20, -5); star.x = rand(0, w); }
      } else {
        if (star.y > h * 0.55) { star.y = rand(-5, -1); star.x = rand(0, w); }
      }
      if (star.x < -10) star.x = w + 10;
      if (star.x > w + 10) star.x = -10;

      // Twinkle — VERY subtle, never goes below 55% of base opacity
      let alpha = star.baseOpacity;
      if (star.twinkleSpeed > 0) {
        const twinkle = Math.sin(s.time * star.twinkleSpeed + star.twinklePhase);
        alpha = star.baseOpacity * (1 - star.twinkleRange + twinkle * star.twinkleRange);
        // Clamp: never drop below 55% of base, never exceed 100%
        alpha = clamp(alpha, star.baseOpacity * 0.55, star.baseOpacity);
      }

      // Falling stars fade in at top, fade out at bottom
      if (star.group === 'falling') {
        const yFrac = star.y / (h * 0.65);
        if (yFrac < 0.1) alpha *= yFrac / 0.1;
        if (yFrac > 0.85) alpha *= (1 - yFrac) / 0.15;
        alpha = clamp(alpha, 0, star.baseOpacity);
      }

      const sx = star.x + starPX * 0.25;
      const sy = star.y - starPY * 0.2;

      if (alpha < 0.01) continue;

      if (star.isBlue) {
        // Blue glow halo
        ctx.beginPath();
        ctx.arc(sx, sy, star.size * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(70, 130, 240, ${alpha * 0.08})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx, sy, star.size * 1.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 160, 255, ${alpha * 0.25})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(140, 185, 255, ${alpha})`;
        ctx.fill();
      } else if (star.isLarge) {
        // Large white star with soft glow
        ctx.beginPath();
        ctx.arc(sx, sy, star.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.04})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx, sy, star.size * 1.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.15})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      } else {
        // Small dot star
        ctx.beginPath();
        ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      }
    }

    // ══════════════════════════════════════════════
    // 5. SHOOTING STARS — very rare, smooth
    // ══════════════════════════════════════════════
    s.stormFlashTimer -= dt;
    if (s.stormFlashTimer <= 0 && s.shootingStars.length < 1) {
      s.shootingStars.push({
        x: rand(w * 0.2, w * 0.8), y: rand(h * 0.02, h * 0.25),
        vx: rand(-2.5, -1.2), vy: rand(1.0, 2.0),
        life: 0, maxLife: rand(0.8, 1.8), size: rand(1, 1.8),
        angle: 0,
      });
      s.stormFlashTimer = rand(18, 40);  // 18–40 seconds between
    }

    for (let i = s.shootingStars.length - 1; i >= 0; i--) {
      const ss = s.shootingStars[i];
      ss.life += dt;
      if (ss.life >= ss.maxLife) { s.shootingStars.splice(i, 1); continue; }

      ss.x += ss.vx * dt * 280;
      ss.y += ss.vy * dt * 280;

      const p = ss.life / ss.maxLife;
      // Smooth fade: ease in (first 20%), hold, ease out (last 40%)
      const a = p < 0.2
        ? p / 0.2
        : p < 0.6
          ? 1
          : 1 - (p - 0.6) / 0.4;
      const clampedA = clamp(a, 0, 1);

      // Trail
      const tailLen = 50;
      const grad = ctx.createLinearGradient(
        ss.x, ss.y,
        ss.x - ss.vx * tailLen, ss.y - ss.vy * tailLen
      );
      grad.addColorStop(0, `rgba(200, 220, 255, ${clampedA * 0.85})`);
      grad.addColorStop(0.4, `rgba(180, 200, 240, ${clampedA * 0.3})`);
      grad.addColorStop(1, 'rgba(180, 200, 240, 0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = ss.size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(ss.x - ss.vx * tailLen, ss.y - ss.vy * tailLen);
      ctx.stroke();

      // Head glow
      ctx.beginPath();
      ctx.arc(ss.x, ss.y, ss.size * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 240, 255, ${clampedA * 0.4})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ss.x, ss.y, ss.size * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${clampedA * 0.9})`;
      ctx.fill();
    }

    // ══════════════════════════════════════════════
    // 6. BLUE ATMOSPHERIC GLOW — behind mountains
    // ══════════════════════════════════════════════
    s.glowPhase += dt;
    // Very slow breathing: 12–18 second cycle
    const gp = Math.sin(s.glowPhase * 0.22) * 0.08 + 0.92;
    const gp2 = Math.sin(s.glowPhase * 0.17 + 1.8) * 0.07 + 0.93;
    const gx = w * 0.5 + mx * 12;
    const gy = h * 0.5 + my * 6 - scrollFrac * 4;

    // Main glow
    const g1 = ctx.createRadialGradient(gx - w * 0.1, gy, 0, gx - w * 0.1, gy, w * 0.48);
    g1.addColorStop(0, `rgba(25, 70, 160, ${0.2 * gp})`);
    g1.addColorStop(0.35, `rgba(30, 80, 170, ${0.1 * gp})`);
    g1.addColorStop(0.7, `rgba(20, 60, 140, ${0.03 * gp})`);
    g1.addColorStop(1, 'rgba(20, 60, 140, 0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);

    // Secondary
    const g2 = ctx.createRadialGradient(gx + w * 0.22, gy + 20, 0, gx + w * 0.22, gy + 20, w * 0.38);
    g2.addColorStop(0, `rgba(40, 100, 190, ${0.13 * gp2})`);
    g2.addColorStop(0.5, `rgba(30, 80, 160, ${0.04 * gp2})`);
    g2.addColorStop(1, 'rgba(30, 80, 160, 0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);

    // Horizon glow
    const hg = ctx.createRadialGradient(w * 0.5, h * 0.53, 0, w * 0.5, h * 0.53, w * 0.52);
    hg.addColorStop(0, `rgba(22, 55, 130, ${0.16 * gp})`);
    hg.addColorStop(0.5, `rgba(15, 40, 100, ${0.05 * gp})`);
    hg.addColorStop(1, 'rgba(15, 40, 100, 0)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, w, h);

    // ══════════════════════════════════════════════
    // 7. DISTANT STORM FLASH — very rare, very slow
    // ══════════════════════════════════════════════
    // Slow decay: 0.97 per frame at 60fps ≈ 2 second fade
    s.stormFlash *= 0.97;
    if (Math.random() < 0.0003) s.stormFlash = rand(0.06, 0.15);  // ~every 55s
    if (s.stormFlash > 0.002) {
      const flX = w * rand(0.25, 0.75);
      const fl = ctx.createRadialGradient(flX, h * 0.46, 0, flX, h * 0.46, w * 0.42);
      fl.addColorStop(0, `rgba(160, 200, 255, ${s.stormFlash})`);
      fl.addColorStop(0.3, `rgba(130, 180, 245, ${s.stormFlash * 0.5})`);
      fl.addColorStop(0.7, `rgba(100, 150, 220, ${s.stormFlash * 0.1})`);
      fl.addColorStop(1, 'rgba(100, 150, 220, 0)');
      ctx.fillStyle = fl;
      ctx.fillRect(0, 0, w, h);
    }

    // ══════════════════════════════════════════════
    // 8. CLOUDS — 3+ layers, visible, slowly drifting
    // ══════════════════════════════════════════════
    const cpx = mx * 6;
    const cso = scrollFrac * 3;

    for (const c of s.clouds) {
      c.x += c.speed * dt * 18;  // slow horizontal drift
      if (c.speed > 0 && c.x > w + c.width * 0.5) c.x = -c.width * 0.8;
      if (c.speed < 0 && c.x < -c.width * 0.8) c.x = w + c.width * 0.5;

      const cx = c.x + cpx + cso;
      const cy = c.y + my * 3;

      ctx.save();
      ctx.globalAlpha = c.opacity;
      // Multi-shape cloud mass using radial gradients for softness
      const gMain = ctx.createRadialGradient(cx, cy, 0, cx, cy, c.width * 0.5);
      gMain.addColorStop(0, c.color);
      gMain.addColorStop(0.5, c.color);
      gMain.addColorStop(1, 'transparent');
      ctx.fillStyle = gMain;
      ctx.beginPath();
      ctx.ellipse(cx, cy, c.width * 0.5, c.height * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      const gC1 = ctx.createRadialGradient(cx - c.width * 0.2, cy + c.height * 0.12, 0, cx - c.width * 0.2, cy + c.height * 0.12, c.width * 0.38);
      gC1.addColorStop(0, '#1A2844');
      gC1.addColorStop(0.5, '#1A2844');
      gC1.addColorStop(1, 'transparent');
      ctx.fillStyle = gC1;
      ctx.beginPath();
      ctx.ellipse(cx - c.width * 0.2, cy + c.height * 0.12, c.width * 0.38, c.height * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();

      const gC2 = ctx.createRadialGradient(cx + c.width * 0.25, cy - c.height * 0.08, 0, cx + c.width * 0.25, cy - c.height * 0.08, c.width * 0.3);
      gC2.addColorStop(0, '#22345A');
      gC2.addColorStop(0.5, '#22345A');
      gC2.addColorStop(1, 'transparent');
      ctx.fillStyle = gC2;
      ctx.beginPath();
      ctx.ellipse(cx + c.width * 0.25, cy - c.height * 0.08, c.width * 0.3, c.height * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ══════════════════════════════════════════════
    // 9. MOUNTAIN LAYERS — 4 ranges with subtle drift
    // ══════════════════════════════════════════════
    for (const mt of s.mountains) {
      // Subtle horizontal drift using sin(time / speed)
      mt.offset = Math.sin(s.time / mt.speed) * 12;
      const offX = mx * mt.parallax + mt.offset;
      const offY = my * mt.parallax * 0.3 - scrollFrac * mt.parallax * 0.5;

      // Fill
      ctx.fillStyle = mt.fill;
      ctx.beginPath();
      ctx.moveTo(-80 + offX, h + 10);
      for (let i = 0; i < mt.points.length; i++) {
        const px = mt.points[i].x + offX;
        const py = mt.points[i].y + offY;
        if (i === 0) {
          ctx.lineTo(px, py);
        } else {
          const prev = mt.points[i - 1];
          const cpx = (prev.x + offX + px) / 2;
          const cpy = (prev.y + offY + py) / 2;
          ctx.quadraticCurveTo(prev.x + offX, prev.y + offY, cpx, cpy);
        }
      }
      ctx.lineTo(w + 80, h + 10);
      ctx.closePath();
      ctx.fill();

      // Rim lighting — subtle blue highlight on peaks
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = mt.rimColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < mt.points.length; i++) {
        const px = mt.points[i].x + offX;
        const py = mt.points[i].y + offY;
        if (i === 0) ctx.moveTo(px, py);
        else {
          const prev = mt.points[i - 1];
          const cpx = (prev.x + offX + px) / 2;
          const cpy = (prev.y + offY + py) / 2;
          ctx.quadraticCurveTo(prev.x + offX, prev.y + offY, cpx, cpy);
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    // Fill below front mountains — NO pure black
    const bottomGrad = ctx.createLinearGradient(0, h * 0.84, 0, h);
    bottomGrad.addColorStop(0, '#090D17');
    bottomGrad.addColorStop(0.5, '#080B14');
    bottomGrad.addColorStop(1, '#070A12');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, h * 0.88, w, h * 0.12);

    // ══════════════════════════════════════════════
    // 10. FOG — slow horizontal drift across mountains
    // ══════════════════════════════════════════════
    for (const f of s.fog) {
      f.x += f.speed * dt * 15;
      if (f.speed > 0 && f.x > w + f.width) f.x = -f.width;
      if (f.speed < 0 && f.x < -f.width) f.x = w + f.width;

      const fx = f.x + mx * 5;
      ctx.save();
      ctx.globalAlpha = f.opacity;
      const gFog = ctx.createRadialGradient(fx, f.y + my * 2, 0, fx, f.y + my * 2, f.width * 0.5);
      gFog.addColorStop(0, '#1A2844');
      gFog.addColorStop(0.5, '#1A2844');
      gFog.addColorStop(1, 'transparent');
      ctx.fillStyle = gFog;
      ctx.beginPath();
      ctx.ellipse(fx, f.y + my * 2, f.width * 0.5, h * 0.035, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ══════════════════════════════════════════════
    // 11. RAIN — 3 depth layers, smooth continuous fall
    // ══════════════════════════════════════════════
    ctx.lineCap = 'round';
    for (const drop of s.rain) {
      // Smooth continuous fall
      drop.y += drop.speed * dt * 260;
      drop.x -= drop.speed * dt * 6;

      // Reset at bottom — spread across full width
      if (drop.y > h + 30) {
        drop.y = rand(-60, -10);
        drop.x = rand(-20, w + 20);
      }

      // Layer-specific styling
      const lw = drop.layer === 'fg' ? 1.2 : drop.layer === 'mid' ? 0.9 : 0.6;
      const colorBase = drop.layer === 'fg' ? 180 : drop.layer === 'mid' ? 160 : 140;

      ctx.strokeStyle = `rgba(${colorBase}, ${colorBase + 20}, ${colorBase + 55}, ${drop.opacity})`;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - drop.speed * 0.7, drop.y + drop.length);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    /* eslint-enable react-hooks/immutability */
  }, []);

  // ─── EFFECT ────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      init(w, h);
    };
    resize();
    window.addEventListener('resize', resize);

    const onMouse = (e: MouseEvent) => {
      if (stateRef.current) {
        stateRef.current.mouse.x = e.clientX / window.innerWidth;
        stateRef.current.mouse.y = e.clientY / window.innerHeight;
      }
    };
    window.addEventListener('mousemove', onMouse);

    const onScroll = () => {
      if (stateRef.current) stateRef.current.scrollY = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const loop = () => {
      const s = stateRef.current;
      if (s && s.initialized && !s.reducedMotion) {
        draw(ctx, window.innerWidth, window.innerHeight);
      }
      if (stateRef.current) {
        stateRef.current.animFrame = requestAnimationFrame(loop);
      }
    };
    stateRef.current!.animFrame = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('scroll', onScroll);
      if (stateRef.current) cancelAnimationFrame(stateRef.current.animFrame);
    };
  }, [init, draw]);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="fixed inset-0 z-0"
        style={{ pointerEvents: 'none' }}
      />
      {/* Subtle vignette overlay — adds depth to edges */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(0,0,0,0.25) 100%)',
        }}
      />
    </>
  );
}
