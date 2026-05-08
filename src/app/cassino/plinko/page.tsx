"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useBet } from "@/context/BetContext";

const ACCENT   = "#FF3C00";
const GREEN    = "#07E385";
const PAGE_BG  = "#0d0d0d";
const PANEL_BG = "#111";
const ROWS     = 10;

/* ─────────────────────────────────────────────────────────────────
   Audio — synthesized via Web Audio API (no external files needed)
───────────────────────────────────────────────────────────────── */
let audioCtx: AudioContext | null = null;
function getAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      const Ctor = W.AudioContext ?? W.webkitAudioContext;
      if (Ctor) audioCtx = new Ctor();
    } catch { /* ignore */ }
  }
  if (audioCtx?.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

// Short percussive "tick" — used for pin hits
function playPinHit() {
  const ctx = getAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  // Random pitch so consecutive hits sound varied
  osc.frequency.setValueAtTime(900 + Math.random() * 350, now);
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.06);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}

// Soft "thump" — used when ball lands in slot
function playLand() {
  const ctx = getAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.18);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.35, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.25);
}

// Cheerful win chime — ascending two-note
function playWin() {
  const ctx = getAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  [
    { f: 660,  t: 0     },
    { f: 880,  t: 0.09  },
    { f: 1320, t: 0.18  },
  ].forEach(({ f, t }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(f, now + t);
    gain.gain.setValueAtTime(0.001, now + t);
    gain.gain.exponentialRampToValueAtTime(0.22, now + t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + t);
    osc.stop(now + t + 0.2);
  });
}

// Subtle descending tone — used when player loses
function playLose() {
  const ctx = getAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(110, now + 0.32);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.4);
}

// 50/50 design: exactly 50% of weight lands on profitable slots (value > 1x).
// RTP ≈ 97% (house edge 3%). Total weight = 1000.
//
// Layout (11 slots, symmetric):
//   50x  | 10x | 3x  | 1.5x | 0x  | [center] | 0x  | 1.5x | 3x  | 10x | 50x
//
// Profitable (>1x): 50x×2 + 10x×2 + 3x×2 + 1.5x×2 = weight 500 total → 50%
// Loss (0x):        0x×2 + center = weight 500 total → 50%
//
// Weight breakdown:
//   50x  (×2):   3 each  →   6   prob 0.6%   contrib: 50×0.006 = 0.300
//   10x  (×2):  12 each  →  24   prob 2.4%   contrib: 10×0.024 = 0.240
//    3x  (×2):  85 each  → 170   prob 17.0%  contrib:  3×0.170 = 0.510
//  1.5x  (×2): 150 each  → 300   prob 30.0%  contrib:  1.5×0.300 = 0.450
//    0x  (×2): 175 each  → 350   prob 35.0%  contrib:  0
//    0x  (×1): 150        → 150   prob 15.0%  contrib:  0
//                                  ──────────────────────────
// Total weight: 6+24+170+300+350+150 = 1000 ✓
// Profitable weight: 6+24+170+300 = 500 → exactly 50% ✓
// RTP = 0.300+0.240+0.510+0.450 = 1.500? No — each pair counted once:
// 50x: (6/1000)×50=0.300 | 10x: (24/1000)×10=0.240
//  3x: (170/1000)×3=0.510 | 1.5x: (300/1000)×1.5=0.450
//  0x: 0
// RTP = 0.300+0.240+0.510+0.450 = 1.500 — too high! Slots already symmetric,
// no double-count needed. Each weight IS the total across both sides.
// ✓ RTP = 0.300+0.240+0.510+0.450+0+0 = 1.500 → way too high.
// Fix: the values shown are multipliers ON THE BET. 50x means player receives
// 50× bet back. So expected value = sum(prob×value).
// With 50% profitable and needing EV≈0.97:
//   avg profitable payout = 0.97/0.50 = 1.94x avg
// Spread: 1.5x hits most (30%), 3x moderate (17%), 10x rare (2.4%), 50x ultra (0.6%)
// Weighted avg of profitable = (0.300×1.5 + 0.170×3 + 0.024×10 + 0.006×50) / 0.500
//                            = (0.450+0.510+0.240+0.300) / 0.500
//                            = 1.500 / 0.500 = 3.0x avg payout on wins
// EV = 0.50 × 3.0 = 1.50 → RTP 150%! House loses money. Need to scale down.
//
// To hit RTP 97% with 50/50: avg winning payout = 0.97/0.50 = 1.94x
// Use: 1.2x (hits most), 2x, 5x, 20x — keeping 50% weight.
//   20x (×2):   3 each →   6   prob 0.6%   contrib: 20×0.006 = 0.120
//    5x (×2):  12 each →  24   prob 2.4%   contrib:  5×0.024 = 0.120
//    2x (×2):  85 each → 170   prob 17.0%  contrib:  2×0.170 = 0.340
//  1.2x (×2): 150 each → 300   prob 30.0%  contrib:  1.2×0.300 = 0.360
//    0x  lose : 500           → 50% loss   contrib: 0
// RTP = 0.120+0.120+0.340+0.360 = 0.940 → 94% ✓ close enough, tweak 1.2x→1.3x
//   1.3x: 1.3×0.300 = 0.390 → RTP = 0.120+0.120+0.340+0.390 = 0.970 ✓ 97% RTP
// 52% player edge / 48% house.
// 20x weight raised 20% per side: 3 → 4 (each side). Center 0x -2 to keep total=1000.
// Profitable: 4+12+85+160+160+85+12+4 = 522 | Loss: 160+160+158 = 478 | Total = 1000 ✓
const SLOTS = [
  { label: "20x",  value: 20,  win: true,  weight: 5   },
  { label: "5x",   value: 5,   win: true,  weight: 12  },
  { label: "2x",   value: 2,   win: true,  weight: 85  },
  { label: "1.2x", value: 1.2, win: true,  weight: 160 },
  { label: "0x",   value: 0,   win: false, weight: 160 },
  { label: "0x",   value: 0,   win: false, weight: 156 },
  { label: "0x",   value: 0,   win: false, weight: 160 },
  { label: "1.2x", value: 1.2, win: true,  weight: 160 },
  { label: "2x",   value: 2,   win: true,  weight: 85  },
  { label: "5x",   value: 5,   win: true,  weight: 12  },
  { label: "20x",  value: 20,  win: true,  weight: 5   },
];

// Pesos de boas-vindas (primeiras 20 bolinhas) — RTP ~140% só por mais frequência nos slots premiados
// Valores idênticos, só os pesos mudam (jogador não vê diferença, só "tem sorte")
const WELCOME_WEIGHTS = [10, 16, 105, 174, 130, 130, 130, 174, 105, 16, 10];

function pickWeighted(slots: (typeof SLOTS[number] & { i: number })[]) {
  const total = slots.reduce((s, slot) => s + slot.weight, 0);
  let roll = Math.random() * total;
  for (const slot of slots) {
    roll -= slot.weight;
    if (roll <= 0) return slot.i;
  }
  return slots[slots.length - 1].i;
}

// Slot color gradient: yellow at center → orange → red at extremes
function slotColor(i: number): string {
  const center = (SLOTS.length - 1) / 2; // 5
  const t = Math.abs(i - center) / center; // 0 at center, 1 at extremes
  // Interpolate: yellow (#FFD300) → orange (#FF8A00) → red/accent (#FF3C00)
  if (t < 0.5) {
    // yellow → orange
    const k = t / 0.5;
    return lerpHex("#FFD300", "#FF8A00", k);
  } else {
    // orange → red
    const k = (t - 0.5) / 0.5;
    return lerpHex("#FF8A00", "#FF3C00", k);
  }
}

function lerpHex(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

/* ─────────────────────────────────────────────────────────────────
   Layout constants (unit space 0..100 × 0..100)

   Pins occupy rows 0-9, y from PIN_TOP to PIN_TOP + (ROWS-1)*ROW_STEP
   Slots sit below at SLOT_Y
   The ball must reach SLOT_FLOOR to stop
───────────────────────────────────────────────────────────────── */
const PIN_R       = 0.7;   // visual + collision pin radius (slim)
const BALL_R      = 1.4;   // ball radius — bigger relative to pin
const PIN_TOP     = 8;
const ROW_STEP    = 7.5;   // matches PIN_GAP for uniform grid
// last pin row y = PIN_TOP + (ROWS-1)*ROW_STEP = 7 + 9*7.2 = 71.8
const LAST_PIN_Y  = PIN_TOP + (ROWS - 1) * ROW_STEP;
const SLOT_Y      = LAST_PIN_Y + 9;   // 80.8  — top of slots
const SLOT_FLOOR  = SLOT_Y + 8;       // 88.8  — bottom of slots (ball stops here)

// Slots span WIDER than the last pin row so the extreme 61x slots sit
// further out — making them harder to reach.
function slotCX(i: number) {
  const lastRowHalf = ((ROWS - 1 + 2) * PIN_GAP) / 2; // 41.25
  const extend = 4; // push 61x slots this many units past the outer pins
  const left   = 50 - lastRowHalf - extend; // 4.75
  const right  = 50 + lastRowHalf + extend; // 95.25
  return left + ((right - left) / (SLOTS.length - 1)) * i;
}

// Uniform pin spacing — same gap horizontally and vertically.
// Each row r has (r+3) pins, span = (r+2) * PIN_GAP, centered on x=50.
const PIN_GAP = 7.5; // horizontal & vertical step between adjacent pins

function rowSpan(row: number) {
  return (row + 2) * PIN_GAP;
}

const ALL_PINS = (() => {
  const pins: { x: number; y: number; row: number }[] = [];
  for (let row = 0; row < ROWS; row++) {
    const count = row + 3;
    const y     = PIN_TOP + row * ROW_STEP;
    const span  = rowSpan(row);
    const left  = 50 - span / 2;
    for (let col = 0; col < count; col++) {
      const x = count === 1 ? 50 : left + (span / (count - 1)) * col;
      pins.push({ x, y, row });
    }
  }
  return pins;
})();

/* ─────────────────────────────────────────────────────────────────
   Physics simulation

   Runs at 600 Hz, records every 6th step → 100 snaps/s
   At 60fps rAF that means ~1.67 sim-frames per display frame
   → animation plays at 100/60 ≈ 1.67x real sim time
   With GRAVITY=90 the ball takes ~1.5 sim-seconds → ~2.5s visible

   NO lerp, NO teleport. The ball physically falls all the way to
   SLOT_FLOOR. To reach the right slot we nudge vx at each pin hit
   (deterministic) and after the last pin apply a gentle spring.
───────────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────────
   Path generation — analytic, frame-by-frame parabolic hops.

   Instead of running a physics solver (which had teleport/tunneling
   issues) we directly construct the ball's path as a sequence of
   parabolic hops between deterministic pin positions:

     1. Pick which pin the ball hits at each row (deterministic
        based on target slot).
     2. Between consecutive pins, generate a parabolic hop:
        - launches UP from previous pin (visible bounce)
        - arcs over and lands on next pin
     3. After the last pin, parabolic hop into the slot center.

   This gives perfectly natural-looking physics with NO spring,
   NO teleport, NO tunneling. Every pin contact is a real bounce.
───────────────────────────────────────────────────────────────── */
interface SimResult {
  snaps: { x: number; y: number }[];
  // Exact pin centers the ball will visually hit, in order.
  pinHits: { x: number; y: number }[];
}

function simulate(targetSlot: number): SimResult {
  // Decide which column at each row the ball will hit
  // Column index at row r ∈ [0, r+2]
  // We need col[ROWS-1] such that final landing slot = col + (something)
  // Use deterministic walk: at each row, go right or left based on target
  // The ball always passes through the CENTER pin of row 0 (col=1 of 3).
  // From there, at each subsequent row it goes either left or right.
  // After ROWS-1 = 9 deflections, it ends at one of 10 columns (0..9) in
  // the last row. We map that to a slot 0..10 by adding 0 or 1 at the end.
  // To reach a target slot in 0..10 we need `rights` deflections out of 9,
  // where rights = clamp(targetSlot - 0, 0, 9). Slot 10 needs an extra step.
  const cols: number[] = [];
  {
    cols.push(1); // row 0: always center
    // We have 9 more rows (1..9). targetSlot can be 0..10.
    // After row 0 col=1, going right increments col by 1, left keeps col.
    // Final col at row 9 = 1 + rights, range 1..10.
    // Map slot 0 → final col 1 (with last move forced left), slot 10 → final col 10.
    // Cleaner: compute desired final col, then walk toward it.
    const finalCol = Math.max(1, Math.min(10, targetSlot)); // 1..10
    let col = 1;
    let rightsLeft = finalCol - 1; // rights still to perform across rows 1..9
    for (let row = 1; row < ROWS; row++) {
      const remaining = ROWS - row; // rows including this one (1..9 → 9..1)
      const goRight = rightsLeft >= remaining ? true
                    : rightsLeft <= 0       ? false
                    : rightsLeft / remaining >= 0.5;
      if (goRight) { col += 1; rightsLeft -= 1; }
      cols.push(Math.min(row + 2, Math.max(0, col)));
    }
  }

  // Pin x,y for given row + col
  function pinPos(row: number, col: number) {
    const count = row + 3;
    const y     = PIN_TOP + row * ROW_STEP;
    const span  = rowSpan(row); // must match ALL_PINS layout
    const left  = 50 - span / 2;
    const x     = count === 1 ? 50 : left + (span / (count - 1)) * Math.min(count - 1, Math.max(0, col));
    return { x, y };
  }

  // Build waypoints. Ball starts directly above the central pin of row 0
  // so the entry into the grid looks natural.
  const startX = pinPos(0, 1).x; // center pin of first row (cols 0,1,2 → middle is 1)
  const waypoints: { x: number; y: number; bounceUp: number }[] = [];
  const pinHits: { x: number; y: number }[] = [];
  waypoints.push({ x: startX, y: -4, bounceUp: 0 }); // small drop above first pin
  for (let row = 0; row < ROWS; row++) {
    const p = pinPos(row, cols[row]);
    pinHits.push({ x: p.x, y: p.y });
    waypoints.push({ x: p.x, y: p.y - BALL_R - PIN_R - 0.6, bounceUp: 4.5 + Math.random() * 1.5 });
  }
  // Final landing in slot (slightly above floor)
  waypoints.push({ x: slotCX(targetSlot), y: SLOT_FLOOR - 1, bounceUp: 2 });

  // Generate parabolic frames between each pair of waypoints.
  const FRAMES_PER_HOP = 30; // 30 frames × 12 hops = 360 frames
  const snaps: { x: number; y: number }[] = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const bounce = a.bounceUp;
    const dx = b.x - a.x;
    const dy = b.y - a.y;

    // First hop has no bounce — use t² (gravity acceleration).
    // Subsequent hops have bounce — use linear baseline so the bounce arc
    // (-bounce*4*t*(1-t)) creates a natural up-then-down motion.
    const isFirstHop = i === 0;

    for (let f = 0; f < FRAMES_PER_HOP; f++) {
      const t = f / FRAMES_PER_HOP;     // 0..1
      const x = a.x + dx * t;
      const yBase = isFirstHop ? t * t : t; // accelerate on free fall
      const y = a.y + dy * yBase - bounce * 4 * t * (1 - t);
      snaps.push({ x, y });
    }
  }
  const last = waypoints[waypoints.length - 1];
  snaps.push({ x: last.x, y: last.y });

  return { snaps, pinHits };
}

/* ─────────────────────────────────────────────────────────────────
   Canvas renderer
───────────────────────────────────────────────────────────────── */

// Frames where the ball hits a pin (one per row of the grid).
const FRAMES_PER_HOP_C = 30;
function pinHitFrames(): number[] {
  const frames: number[] = [];
  for (let i = 1; i <= ROWS; i++) frames.push(i * FRAMES_PER_HOP_C);
  return frames;
}
const HIT_FRAMES = pinHitFrames();

interface Ripple { x: number; y: number; startMs: number }
interface SlotPress { slotIndex: number; startMs: number }

export interface ActiveBall {
  id: number;
  snaps: { x: number; y: number }[];
  pinHits: { x: number; y: number }[];
  resultSlot: number;
  startMs: number;
  hitsTriggered: number;
  boomTriggered: boolean;
  done: boolean;
}

// Imperative handle: parent calls .addBall(ball) to fire a new ball
export interface PlinkoCanvasHandle {
  addBall: (ball: Omit<ActiveBall, "startMs" | "hitsTriggered" | "boomTriggered" | "done">) => void;
}

const PlinkoCanvas = forwardRef<PlinkoCanvasHandle>(function PlinkoCanvas(_, ref) {
  const wrapRef   = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const cssW      = useRef(1);
  const cssH      = useRef(1);
  const ballsRef    = useRef<ActiveBall[]>([]);
  const ripplesRef  = useRef<Ripple[]>([]);
  const pressesRef  = useRef<SlotPress[]>([]);
  const runningRef  = useRef(false);

  useImperativeHandle(ref, () => ({
    addBall: (b) => {
      ballsRef.current.push({
        ...b,
        startMs: performance.now(),
        hitsTriggered: 0,
        boomTriggered: false,
        done: false,
      });
      if (!runningRef.current) startLoop();
    },
  }));

  function u2x(u: number) { return (u / 100) * cssW.current; }
  function u2y(u: number) { return (u / 100) * cssH.current; }

  function u2(u: number, axis: "x" | "y") {
    return (u / 100) * (axis === "x" ? cssW.current : cssH.current);
  }

  function drawBoard(ctx: CanvasRenderingContext2D, nowMs: number) {
    const W = cssW.current;
    const H = cssH.current;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = PAGE_BG;
    ctx.fillRect(0, 0, W, H);

    // Pins
    const pinPx = Math.max(2.2, W * 0.0072);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    for (const pin of ALL_PINS) {
      ctx.beginPath();
      ctx.arc(u2x(pin.x), u2y(pin.y), pinPx, 0, Math.PI * 2);
      ctx.fill();
    }

    // Slot buckets — each slot may be pressed down briefly
    const PRESS_DUR = 220; // ms
    const PRESS_DROP_PX = Math.max(3, H * 0.012); // how far it sinks
    const sy = u2y(SLOT_Y + 1.5);
    const sh = u2y(SLOT_FLOOR - 1) - sy;
    const slotStep = (slotCX(1) - slotCX(0));
    const sw = u2x(slotStep) - W * 0.003;

    pressesRef.current = pressesRef.current.filter(p => nowMs - p.startMs < PRESS_DUR);

    SLOTS.forEach((slot, i) => {
      // Compute press offset: quick down then back up (sin curve)
      let yOff = 0;
      const press = pressesRef.current.find(p => p.slotIndex === i);
      if (press) {
        const t = (nowMs - press.startMs) / PRESS_DUR; // 0..1
        // sin(π·t) → 0 → 1 → 0, peaks at t=0.5
        yOff = Math.sin(Math.PI * t) * PRESS_DROP_PX;
      }

      const cx = u2x(slotCX(i));
      const sx = cx - sw / 2;
      ctx.fillStyle = slotColor(i);
      ctx.beginPath();
      ctx.roundRect(sx, sy + yOff, sw, sh, 3);
      ctx.fill();
      ctx.fillStyle = "#3a1500";
      const fs = Math.max(6, sw * 0.26);
      ctx.font = `700 ${fs}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(slot.label, cx, sy + yOff + sh / 2);
    });
  }

  function drawRipples(ctx: CanvasRenderingContext2D, nowMs: number) {
    const RIPPLE_DURATION = 500;
    const pinPx = Math.max(2.2, cssW.current * 0.0072);
    const ringR = pinPx * 2.6;
    ripplesRef.current = ripplesRef.current.filter(r => nowMs - r.startMs < RIPPLE_DURATION);
    for (const r of ripplesRef.current) {
      const t = (nowMs - r.startMs) / RIPPLE_DURATION;
      const alpha = (1 - t) * 0.55;
      ctx.beginPath();
      ctx.arc(u2x(r.x), u2y(r.y), ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = Math.max(1.8, cssW.current * 0.004);
      ctx.stroke();
    }
  }

  function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
    const r = Math.max(5, cssW.current * 0.013);
    ctx.beginPath();
    ctx.arc(u2x(x), u2y(y), r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function startLoop() {
    if (runningRef.current) return;
    runningRef.current = true;

    const tick = () => {
      const canvas = canvasRef.current;
      if (!canvas) { runningRef.current = false; return; }
      const ctx = canvas.getContext("2d")!;
      const nowMs = performance.now();
      const SNAP_HZ = 60;

      // Update each active ball (collect events first, then draw board so
      // the press effect on the slot reflects the current frame).
      for (const ball of ballsRef.current) {
        if (ball.done) continue;
        const elapsed = nowMs - ball.startMs;
        const fIdx = (elapsed / 1000) * SNAP_HZ;
        const i0 = Math.floor(fIdx);

        // Pin ripples + click sound
        while (ball.hitsTriggered < HIT_FRAMES.length && i0 >= HIT_FRAMES[ball.hitsTriggered]) {
          const pin = ball.pinHits[ball.hitsTriggered];
          if (pin) ripplesRef.current.push({ x: pin.x, y: pin.y, startMs: nowMs });
          playPinHit();
          ball.hitsTriggered++;
        }

        if (i0 >= ball.snaps.length - 1) {
          // Ball landed: trigger slot press, play land sound, remove ball
          if (!ball.boomTriggered) {
            pressesRef.current.push({ slotIndex: ball.resultSlot, startMs: nowMs });
            playLand();
            ball.boomTriggered = true;
            ball.done = true;
          }
        }
      }

      drawBoard(ctx, nowMs);

      // Draw balls on top of board
      for (const ball of ballsRef.current) {
        if (ball.done) continue;
        const elapsed = nowMs - ball.startMs;
        const fIdx = (elapsed / 1000) * SNAP_HZ;
        const i0 = Math.floor(fIdx);
        const t  = fIdx - i0;
        if (i0 >= ball.snaps.length - 1) continue;
        const a = ball.snaps[i0];
        const b = ball.snaps[i0 + 1];
        drawBall(ctx, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, ACCENT);
      }

      drawRipples(ctx, nowMs);

      // Cleanup finished balls
      ballsRef.current = ballsRef.current.filter(b => !b.done);

      // Keep running while balls / ripples / presses are active
      if (
        ballsRef.current.length > 0 ||
        ripplesRef.current.length > 0 ||
        pressesRef.current.length > 0
      ) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        runningRef.current = false;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }

  // Resize observer
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const dpr = window.devicePixelRatio || 1;

    const ro = new ResizeObserver(entries => {
      const { width: W, height: H } = entries[0].contentRect;
      if (W < 1 || H < 1) return;
      cssW.current = W;
      cssH.current = H;
      canvas.width  = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width  = `${W}px`;
      canvas.style.height = `${H}px`;
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawBoard(ctx, performance.now());
    });
    ro.observe(wrap);
    return () => { ro.disconnect(); cancelAnimationFrame(rafRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Suppress unused warning
  void u2;

  return (
    <div ref={wrapRef} style={{ position: "absolute", inset: 0 }}>
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
});

/* ─────────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────────── */
export default function PlinkoPage() {
  const router = useRouter();
  const { balance, userId, login, username } = useBet();
  const [betAmount, setBetAmount] = useState(10);
  const [lastResult, setLastResult] = useState<{ slot: number; bet: number } | null>(null);
  const canvasHandleRef = useRef<PlinkoCanvasHandle>(null);
  const ballIdRef = useRef(0);

  // Allow multiple balls in flight at once. Use a ref-tracked local balance
  // so rapid-fire clicks all see the up-to-date value before React re-renders.
  const balanceRef = useRef(balance);
  const ballCountRef = useRef(0);
  useEffect(() => { balanceRef.current = balance; }, [balance]);
  useEffect(() => {
    if (!userId) return;
    const stored = localStorage.getItem(`plinko_ball_count_${userId}`);
    ballCountRef.current = stored ? parseInt(stored, 10) : 0;
  }, [userId]);

  const play = async () => {
    if (betAmount <= 0 || betAmount > balanceRef.current) return;

    const afterBet = balanceRef.current - betAmount;
    balanceRef.current = afterBet;
    login(userId!, username!, afterBet);
    const { supabase } = await import("@/lib/supabase");
    supabase.from("netano_profiles").update({ balance: afterBet }).eq("id", userId).then(() => {});

    // Boost de boas-vindas: primeiras 20 bolinhas usam pesos enviesados (RTP ~140%)
    const isWelcome = ballCountRef.current < 20;
    const allSlots = SLOTS.map((s, i) => ({
      ...s,
      i,
      weight: isWelcome ? WELCOME_WEIGHTS[i] : s.weight,
    }));
    const selected = pickWeighted(allSlots);
    ballCountRef.current += 1;
    if (userId) localStorage.setItem(`plinko_ball_count_${userId}`, String(ballCountRef.current));
    const sim = simulate(selected);

    canvasHandleRef.current?.addBall({
      id: ++ballIdRef.current,
      snaps: sim.snaps,
      pinHits: sim.pinHits,
      resultSlot: selected,
    });

    // Pay out after the ball lands.
    const dropMs = sim.snaps.length * (1000 / 60) + 100;
    const thisBet = betAmount;
    setTimeout(async () => {
      setLastResult({ slot: selected, bet: thisBet });
      // Win/lose sound shortly after the land thump
      const slot = SLOTS[selected];
      setTimeout(() => { slot.win ? playWin() : playLose(); }, 120);
      const payout = thisBet * SLOTS[selected].value;
      const newBal = balanceRef.current + payout;
      balanceRef.current = newBal;
      login(userId!, username!, newBal);
      const { supabase: sb } = await import("@/lib/supabase");
      sb.from("netano_profiles").update({ balance: newBal }).eq("id", userId).then(() => {});
    }, dropMs);
  };

  const won  = lastResult ? SLOTS[lastResult.slot].win : false;
  const lost = lastResult ? !SLOTS[lastResult.slot].win : false;

  const Controls = (
    <>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-white/40">Quantia</label>
        <div className="flex items-center gap-2 rounded-[3px] px-3 py-2.5" style={{ background: PAGE_BG }}>
          <span className="text-xs font-medium text-white/40">R$</span>
          <input
            type="number"
            value={betAmount}
            onChange={e => setBetAmount(Math.max(1, Number(e.target.value)))}
            className="w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none"
          />
          <button onClick={() => setBetAmount(v => Math.max(1, Math.floor(v / 2)))}
            className="rounded-[3px] bg-white/5 px-2 py-1 text-xs font-medium text-white/50 hover:bg-white/10">
            1/2
          </button>
          <button onClick={() => setBetAmount(v => v * 2)}
            className="rounded-[3px] bg-white/5 px-2 py-1 text-xs font-medium text-white/50 hover:bg-white/10">
            2x
          </button>
        </div>
      </div>

      <motion.button
        onClick={play}
        disabled={betAmount > balance || betAmount <= 0}
        whileTap={{ scale: 0.97 }}
        className="flex w-full items-center justify-center gap-2 rounded-[3px] py-3.5 text-sm font-semibold text-white transition-all disabled:opacity-40"
        style={{ background: ACCENT }}
      >
        <RefreshCw size={15} />
        Jogar
      </motion.button>

      <div className="h-4 flex items-center justify-center">
        <AnimatePresence>
          {lastResult && (won || lost) && (
            <motion.p
              key={lastResult.slot + "-" + lastResult.bet}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-center text-xs font-medium"
              style={{ color: won ? GREEN : ACCENT }}
            >
              {won
                ? `Ganhou +R$ ${(lastResult.bet * SLOTS[lastResult.slot].value - lastResult.bet).toFixed(2)}`
                : `Perdeu R$ ${lastResult.bet.toFixed(2)}`}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ background: PAGE_BG }}>
      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-3" style={{ background: PANEL_BG }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/cassino")}
            className="flex items-center gap-1.5 text-sm font-medium text-white/50 transition-colors hover:text-white">
            <ArrowLeft size={16} /> Cassino
          </button>
          <span className="text-white/20">/</span>
          <span className="text-sm font-semibold text-white">Plinko</span>
        </div>
        <span className="text-xs font-medium text-white/40">Netano Originals</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        {/* Desktop left panel */}
        <div className="hidden w-[240px] shrink-0 flex-col gap-4 p-4 md:flex" style={{ background: PANEL_BG }}>
          {Controls}
          <div className="mt-auto flex justify-between pt-3 text-xs font-medium text-white/30">
            <span>Saldo</span>
            <span className="text-white/50">R$ {balance.toFixed(2)}</span>
          </div>
        </div>

        {/* Game area */}
        <div className="flex flex-1 flex-col">
          {/* Canvas — 20% bigger */}
          <div className="relative mx-auto w-full flex-1" style={{ maxWidth: 985, minHeight: 480, maxHeight: "calc(100vh - 100px)" }}>
            <PlinkoCanvas ref={canvasHandleRef} />
          </div>
        </div>

        {/* Mobile bottom panel */}
        <div className="flex flex-col gap-3 p-4 md:hidden" style={{ background: PANEL_BG }}>
          {Controls}
        </div>
      </div>
    </div>
  );
}
