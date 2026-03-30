import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Github, Linkedin, Mail, ExternalLink, ChevronRight } from 'lucide-react';
import { ProjectCard } from '../components/ProjectCard';
import { WritingCard } from '../components/WritingCard';
import { BookCard } from '../components/BookCard';
import { api } from '../lib/api';
import type { Project } from '../data/projects';
import type { Writing } from '../data/writings';
import type { Book } from '../data/library';

/**
 * Generates EMG signal path with stochastic high-frequency noise pattern
 * Simulates muscle bursts (active) and rests (quiet) - NOT periodic like ECG
 */
function generateEMGPath(
  startX: number,
  baselineY: number,
  cycleWidth: number,
  numCycles: number
): string {
  const points: string[] = [];
  points.push(`M${startX},${baselineY}`);

  for (let cycle = 0; cycle < numCycles; cycle++) {
    const cycleStartX = startX + cycle * cycleWidth;

    // Vary burst timing slightly per cycle
    const restDuration1 = 17 + (Math.random() - 0.5) * 4;
    const burstDuration = 18 + (Math.random() - 0.5) * 4;
    const restDuration2 = cycleWidth - restDuration1 - burstDuration;

    // REST PHASE 1: Very low amplitude noise (quiet muscle)
    for (let i = 0; i < restDuration1; i += 2) {
      const x = cycleStartX + i;
      const y = baselineY + (Math.random() - 0.5) * 3;
      points.push(`L${x.toFixed(1)},${y.toFixed(1)}`);
    }

    // BURST PHASE: High-frequency stochastic spikes (muscle activation)
    const burstStartX = cycleStartX + restDuration1;
    for (let i = 0; i < burstDuration; i += 1) {
      const x = burstStartX + i;

      // Envelope: amplitude peaks in middle of burst (natural ramp up/down)
      const burstProgress = i / burstDuration;
      const envelope = Math.sin(burstProgress * Math.PI);

      // Random spike with envelope-modulated amplitude
      const maxAmplitude = 9;
      const amplitude = maxAmplitude * envelope * (0.4 + Math.random() * 0.6);
      const direction = Math.random() > 0.5 ? 1 : -1;

      const y = baselineY + direction * amplitude;
      points.push(`L${x.toFixed(1)},${y.toFixed(1)}`);
    }

    // REST PHASE 2: Return to quiet baseline
    const rest2StartX = burstStartX + burstDuration;
    for (let i = 0; i < restDuration2; i += 2) {
      const x = rest2StartX + i;
      const y = baselineY + (Math.random() - 0.5) * 3;
      points.push(`L${x.toFixed(1)},${y.toFixed(1)}`);
    }
  }

  return points.join(' ');
}

/**
 * Generates ECG signal path with organic PQRST variation
 * Adds subtle R-R interval variation and baseline drift for realistic appearance
 */
function generateECGPath(
  startX: number,
  baselineY: number,
  cycleWidth: number,
  numCycles: number
): string {
  const points: string[] = [];
  points.push(`M${startX},${baselineY}`);

  let currentX = startX;

  for (let cycle = 0; cycle < numCycles; cycle++) {
    // R-R interval variation: +/- 3px (about 6% heart rate variability)
    const rrVariation = (Math.random() - 0.5) * 6;
    const effectiveCycleWidth = cycleWidth + rrVariation;
    const scale = effectiveCycleWidth / cycleWidth;

    // Baseline drift: subtle wandering +/- 2px
    const baselineDrift = (Math.random() - 0.5) * 4;
    const localBaseline = baselineY + baselineDrift;

    // Amplitude variations (subtle)
    const rVariation = 1 + (Math.random() - 0.5) * 0.2;
    const sVariation = 1 + (Math.random() - 0.5) * 0.2;
    const pVariation = 1 + (Math.random() - 0.5) * 0.3;
    const tVariation = 1 + (Math.random() - 0.5) * 0.3;

    const cycleStart = currentX;

    // Flat baseline to P wave start
    points.push(`L${(cycleStart + 4 * scale).toFixed(1)},${localBaseline.toFixed(1)}`);

    // P wave (small atrial depolarization bump)
    points.push(`L${(cycleStart + 5 * scale).toFixed(1)},${(localBaseline - 2 * pVariation).toFixed(1)}`);
    points.push(`L${(cycleStart + 6 * scale).toFixed(1)},${(localBaseline - 3 * pVariation).toFixed(1)}`);
    points.push(`L${(cycleStart + 8 * scale).toFixed(1)},${(localBaseline - 2 * pVariation).toFixed(1)}`);

    // PR segment (flat, isoelectric)
    points.push(`L${(cycleStart + 12 * scale).toFixed(1)},${localBaseline.toFixed(1)}`);

    // Q wave (small dip before R)
    points.push(`L${(cycleStart + 13 * scale).toFixed(1)},${(localBaseline + 4 * sVariation).toFixed(1)}`);

    // R wave (tall sharp spike - ventricular depolarization)
    points.push(`L${(cycleStart + 14 * scale).toFixed(1)},${(localBaseline - 24 * rVariation).toFixed(1)}`);

    // S wave (dip below baseline)
    points.push(`L${(cycleStart + 15 * scale).toFixed(1)},${(localBaseline + 10 * sVariation).toFixed(1)}`);

    // Return to baseline (ST segment)
    points.push(`L${(cycleStart + 16 * scale).toFixed(1)},${localBaseline.toFixed(1)}`);

    // T wave (ventricular repolarization - broader, gentler)
    points.push(`L${(cycleStart + 20 * scale).toFixed(1)},${localBaseline.toFixed(1)}`);
    points.push(`L${(cycleStart + 22 * scale).toFixed(1)},${(localBaseline - 3 * tVariation).toFixed(1)}`);
    points.push(`L${(cycleStart + 25 * scale).toFixed(1)},${(localBaseline - 4 * tVariation).toFixed(1)}`);
    points.push(`L${(cycleStart + 28 * scale).toFixed(1)},${(localBaseline - 3 * tVariation).toFixed(1)}`);

    // Return to baseline for rest of cycle
    points.push(`L${(cycleStart + 32 * scale).toFixed(1)},${localBaseline.toFixed(1)}`);

    currentX = cycleStart + effectiveCycleWidth;
    points.push(`L${currentX.toFixed(1)},${localBaseline.toFixed(1)}`);
  }

  return points.join(' ');
}

export function Home() {
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [recentWritings, setRecentWritings] = useState<Writing[]>([]);
  const [featuredBooks, setFeaturedBooks] = useState<Book[]>([]);

  // Generate signal paths once on mount for organic variation
  const emgPath = useMemo(() => generateEMGPath(24, 161, 52, 8), []);
  const ecgPath = useMemo(() => generateECGPath(24, 66, 52, 8), []);

  useEffect(() => {
    api.getPublicProjects().then((data: Project[]) => setRecentProjects(data.slice(0, 3))).catch(console.error);
    api.getPublicWritings().then((data: Writing[]) => setRecentWritings(data.slice(0, 3))).catch(console.error);
    api.getPublicBooks().then((data: Book[]) => setFeaturedBooks(data.slice(0, 3))).catch(console.error);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 bg-[#FAFAFA] dark:bg-[#0F172A]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl lg:text-6xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] leading-tight">
                  Alphonsus
                  <span className="block text-[#1E40AF] dark:text-[#60A5FA]">Aditya</span>
                </h1>
                <p className="text-xl text-[#6B7280] max-w-lg">
                  Biomedical Engineering Student
                </p>
                <p className="text-lg text-[#6B7280] leading-relaxed">
                  Exploring the intersection of Medical Signals, Faith, and Human Life
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Link
                  to="/engineering"
                  className="btn btn-primary inline-flex items-center justify-center space-x-2"
                >
                  <span>View Projects</span>
                  <ExternalLink className="w-4 h-4" />
                </Link>
                <Link
                  to="/writings"
                  className="btn btn-secondary inline-flex items-center justify-center space-x-2"
                >
                  <span>Read Reflections</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Social Links */}
              <div className="flex items-center space-x-6 pt-4">
                <a
                  href="https://linkedin.com/in/alphonsusadt"
                  className="flex items-center space-x-2 text-[#6B7280] hover:text-[#1E40AF] dark:hover:text-[#60A5FA] transition-colors group"
                >
                  <Linkedin className="w-5 h-5" />
                  <span className="text-sm font-medium">LinkedIn</span>
                </a>
                <a
                  href="https://github.com/alphonsusadt"
                  className="flex items-center space-x-2 text-[#6B7280] hover:text-[#1E40AF] dark:hover:text-[#60A5FA] transition-colors group"
                >
                  <Github className="w-5 h-5" />
                  <span className="text-sm font-medium">GitHub</span>
                </a>
                <a
                  href="mailto:alphonsus@example.com"
                  className="flex items-center space-x-2 text-[#6B7280] hover:text-[#1E40AF] dark:hover:text-[#60A5FA] transition-colors group"
                >
                  <Mail className="w-5 h-5" />
                  <span className="text-sm font-medium">Email</span>
                </a>
              </div>
            </div>

            {/* Right Content - Biomedical Robotics Animation */}
            <div className="relative flex items-center justify-center">
              <div className="w-full rounded-2xl overflow-hidden" style={{height: '420px'}}>
                <svg viewBox="0 0 480 420" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" style={{display:'block'}}>
                  <defs>
                    <filter id="glow-blue" x="-40%" y="-40%" width="180%" height="180%">
                      <feGaussianBlur stdDeviation="4" result="blur"/>
                      <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                    <filter id="glow-green" x="-40%" y="-40%" width="180%" height="180%">
                      <feGaussianBlur stdDeviation="2" result="blur"/>
                      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                    <filter id="glow-purple" x="-40%" y="-40%" width="180%" height="180%">
                      <feGaussianBlur stdDeviation="3" result="blur"/>
                      <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#2D3A6B" strokeWidth="0.6"/>
                    </pattern>
                    {/* ClipPaths for signal panels */}
                    <clipPath id="ecg-clip"><rect x="24" y="44" width="158" height="44"/></clipPath>
                    <clipPath id="emg-clip"><rect x="24" y="143" width="158" height="36"/></clipPath>
                    {/* Rounded corner clip for entire card */}
                    <clipPath id="card-clip"><rect width="480" height="420" rx="16" ry="16"/></clipPath>
                    <style>{`
                      @keyframes blink-dot {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.2; }
                      }
                      @keyframes arm-rotate1 {
                        0%, 100% { transform-origin: 241px 312px; transform: rotate(0deg); }
                        40% { transform-origin: 241px 312px; transform: rotate(-18deg); }
                        70% { transform-origin: 241px 312px; transform: rotate(12deg); }
                      }
                      @keyframes arm-rotate2 {
                        0%, 100% { transform-origin: 241px 262px; transform: rotate(0deg); }
                        40% { transform-origin: 241px 262px; transform: rotate(20deg); }
                        70% { transform-origin: 241px 262px; transform: rotate(-15deg); }
                      }
                      @keyframes arm-rotate3 {
                        0%, 100% { transform-origin: 241px 222px; transform: rotate(0deg); }
                        40% { transform-origin: 241px 222px; transform: rotate(-10deg); }
                        70% { transform-origin: 241px 222px; transform: rotate(8deg); }
                      }
                      @keyframes signal-pulse {
                        0%, 100% { opacity: 0.4; }
                        50% { opacity: 1; }
                      }
                      @keyframes dash-flow {
                        0% { stroke-dashoffset: 40; }
                        100% { stroke-dashoffset: 0; }
                      }
                      @keyframes fade-in-out {
                        0%, 100% { opacity: 0.2; }
                        50% { opacity: 0.9; }
                      }
                      /* Seamless scroll — shift by exactly 1 cycle width */
                      @keyframes scroll-ecg {
                        from { transform: translateX(0); }
                        to   { transform: translateX(-52px); }
                      }
                      @keyframes scroll-emg {
                        from { transform: translateX(0); }
                        to   { transform: translateX(-52px); }
                      }
                      @keyframes dot-travel {
                        0%   { offset-distance: 0%;   opacity: 0; }
                        8%   { opacity: 1; }
                        92%  { opacity: 1; }
                        100% { offset-distance: 100%; opacity: 0; }
                      }
                      .arm1 { animation: arm-rotate1 3.5s ease-in-out infinite; }
                      .arm2 { animation: arm-rotate2 3.5s ease-in-out infinite; }
                      .arm3 { animation: arm-rotate3 3.5s ease-in-out infinite; }
                      .scroll-ecg { animation: scroll-ecg 1.5s linear infinite; }
                      .scroll-emg { animation: scroll-emg 0.9s linear infinite; }
                      .blink  { animation: blink-dot 1.2s ease-in-out infinite; }
                      .blink2 { animation: blink-dot 1.8s ease-in-out infinite 0.4s; }
                      .pulse-dot { animation: signal-pulse 1.5s ease-in-out infinite; }
                      .flow-dash { animation: dash-flow 1s linear infinite; stroke-dasharray: 6 4; }
                      .fade-loop { animation: fade-in-out 2.5s ease-in-out infinite; }
                      /* ECG → robot dots */
                      .ecg-dot-1 { offset-path: path('M188,58 Q214,143 241,228'); animation: dot-travel 2s linear infinite; }
                      .ecg-dot-2 { offset-path: path('M188,58 Q214,143 241,228'); animation: dot-travel 2s linear infinite 0.67s; }
                      .ecg-dot-3 { offset-path: path('M188,58 Q214,143 241,228'); animation: dot-travel 2s linear infinite 1.34s; }
                      /* EMG → robot dots */
                      .emg-dot-1 { offset-path: path('M188,153 Q214,190 241,228'); animation: dot-travel 1.8s linear infinite; }
                      .emg-dot-2 { offset-path: path('M188,153 Q214,190 241,228'); animation: dot-travel 1.8s linear infinite 0.6s; }
                      .emg-dot-3 { offset-path: path('M188,153 Q214,190 241,228'); animation: dot-travel 1.8s linear infinite 1.2s; }
                      /* Control → robot dots */
                      .ctrl-dot-1 { offset-path: path('M294,62 Q267,130 241,196'); animation: dot-travel 2.2s linear infinite 0.3s; }
                      .ctrl-dot-2 { offset-path: path('M294,62 Q267,130 241,196'); animation: dot-travel 2.2s linear infinite 1.03s; }
                      .ctrl-dot-3 { offset-path: path('M294,62 Q267,130 241,196'); animation: dot-travel 2.2s linear infinite 1.76s; }
                      /* Bio → robot dots */
                      .bio-dot-1 { offset-path: path('M294,174 Q267,200 241,228'); animation: dot-travel 1.6s linear infinite 0.2s; }
                      .bio-dot-2 { offset-path: path('M294,174 Q267,200 241,228'); animation: dot-travel 1.6s linear infinite 0.73s; }
                      .bio-dot-3 { offset-path: path('M294,174 Q267,200 241,228'); animation: dot-travel 1.6s linear infinite 1.26s; }
                    `}</style>
                  </defs>

                  {/* Background */}
                  <defs>
                    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0F172A"/>
                      <stop offset="50%" stopColor="#1E1B4B"/>
                      <stop offset="100%" stopColor="#0C1445"/>
                    </linearGradient>
                  </defs>
                  <g clipPath="url(#card-clip)">
                  <rect width="480" height="420" fill="url(#bg-grad)"/>
                  <rect width="480" height="420" fill="url(#grid)"/>

                  {/* ── ROBOTIC ARM (center-bottom) ── */}
                  {/* Base platform */}
                  <rect x="219" y="340" width="44" height="14" rx="4" fill="#3B82F6" filter="url(#glow-blue)"/>
                  <rect x="233" y="323" width="16" height="20" rx="3" fill="#60A5FA"/>
                  {/* Joint 0 */}
                  <circle cx="241" cy="320" r="7" fill="#93C5FD" filter="url(#glow-blue)"/>

                  <g className="arm1">
                    {/* Segment 1 */}
                    <rect x="237" y="268" width="8" height="54" rx="4" fill="#3B82F6"/>
                    <circle cx="241" cy="268" r="6" fill="#7DD3FC" filter="url(#glow-blue)"/>
                    <g className="arm2">
                      {/* Segment 2 */}
                      <rect x="238" y="228" width="6" height="42" rx="3" fill="#60A5FA"/>
                      <circle cx="241" cy="228" r="5" fill="#BAE6FD" filter="url(#glow-blue)"/>
                      <g className="arm3">
                        {/* Segment 3 */}
                        <rect x="239" y="196" width="4" height="34" rx="2" fill="#7DD3FC"/>
                        <circle cx="241" cy="196" r="4" fill="#E0F2FE" filter="url(#glow-blue)"/>
                        {/* Gripper */}
                        <line x1="237" y1="190" x2="231" y2="183" stroke="#BAE6FD" strokeWidth="2.5" strokeLinecap="round"/>
                        <line x1="245" y1="190" x2="251" y2="183" stroke="#BAE6FD" strokeWidth="2.5" strokeLinecap="round"/>
                        <circle cx="241" cy="186" r="4" fill="#38BDF8" className="pulse-dot" filter="url(#glow-blue)"/>
                      </g>
                    </g>
                  </g>

                  {/* ── ECG PANEL — seamless scrolling PQRST ── */}
                  <rect x="18" y="18" width="170" height="80" rx="10" fill="rgba(15,23,42,0.85)" stroke="#34D399" strokeWidth="1.5"/>
                  <text x="30" y="36" fontSize="9" fill="#6EE7B7" fontFamily="monospace" fontWeight="bold">ECG SIGNAL</text>
                  <circle cx="172" cy="30" r="5" fill="#4ADE80" className="blink" filter="url(#glow-green)"/>
                  <text x="162" y="34" fontSize="7" fill="#4ADE80" fontFamily="monospace">LIVE</text>
                  <rect x="24" y="44" width="158" height="44" rx="4" fill="rgba(2,6,23,0.7)"/>
                  {/* Clip + scroll: path is 8 cycles × 52px = 416px; animate by -52px */}
                  <g clipPath="url(#ecg-clip)">
                    <g className="scroll-ecg">
                      <path
                        d={ecgPath}
                        stroke="#4ADE80" strokeWidth="1.2" fill="none" filter="url(#glow-green)"
                      />
                    </g>
                  </g>

                  {/* ── EMG PANEL — stochastic noise bursts (muscle activation) ── */}
                  <rect x="18" y="118" width="170" height="70" rx="10" fill="rgba(15,23,42,0.85)" stroke="#C084FC" strokeWidth="1.5"/>
                  <text x="30" y="136" fontSize="9" fill="#E879F9" fontFamily="monospace" fontWeight="bold">EMG SIGNAL</text>
                  <circle cx="170" cy="130" r="5" fill="#C084FC" className="blink2" filter="url(#glow-purple)"/>
                  <rect x="24" y="143" width="158" height="36" rx="4" fill="rgba(2,6,23,0.7)"/>
                  {/* Clip + scroll: stochastic bursts with quiet rest periods */}
                  <g clipPath="url(#emg-clip)">
                    <g className="scroll-emg">
                      <path
                        d={emgPath}
                        stroke="#E879F9" strokeWidth="1.5" fill="none" filter="url(#glow-purple)"
                      />
                    </g>
                  </g>

                  {/* ── TRAVELLING DOTS on all connections ── */}
                  {/* ECG → robot */}
                  <path d="M188,58 Q214,143 241,228" stroke="#4ADE80" strokeWidth="1" strokeDasharray="3 4" opacity="0.35" className="flow-dash"/>
                  <circle r="2.5" fill="#4ADE80" filter="url(#glow-green)" className="ecg-dot-1"/>
                  <circle r="2.5" fill="#4ADE80" filter="url(#glow-green)" className="ecg-dot-2"/>
                  <circle r="2.5" fill="#4ADE80" filter="url(#glow-green)" className="ecg-dot-3"/>
                  {/* EMG → robot */}
                  <path d="M188,153 Q214,190 241,228" stroke="#C084FC" strokeWidth="1" strokeDasharray="3 4" opacity="0.35" className="flow-dash"/>
                  <circle r="2.5" fill="#E879F9" filter="url(#glow-purple)" className="emg-dot-1"/>
                  <circle r="2.5" fill="#E879F9" filter="url(#glow-purple)" className="emg-dot-2"/>
                  <circle r="2.5" fill="#E879F9" filter="url(#glow-purple)" className="emg-dot-3"/>

                  {/* ── CONTROL SYSTEM (top right) - Closed-Loop Feedback ── */}
                  <rect x="294" y="18" width="170" height="90" rx="10" fill="rgba(15,23,42,0.85)" stroke="#38BDF8" strokeWidth="1.5"/>
                  <text x="306" y="36" fontSize="9" fill="#7DD3FC" fontFamily="monospace" fontWeight="bold">CONTROL SYSTEM</text>

                  {/* REF Node */}
                  <rect x="302" y="46" width="26" height="18" rx="3" fill="#0E4872"/>
                  <text x="315" y="58" fontSize="6.5" fill="#38BDF8" textAnchor="middle" fontFamily="monospace">REF</text>

                  {/* Arrow: REF -> SUM */}
                  <line x1="328" y1="55" x2="336" y2="55" stroke="#38BDF8" strokeWidth="1.2" className="flow-dash"/>
                  <polygon points="336,55 333,52.5 333,57.5" fill="#38BDF8"/>

                  {/* SUM (Error) Circle with Σ symbol */}
                  <circle cx="344" cy="55" r="7" fill="none" stroke="#38BDF8" strokeWidth="1.5"/>
                  <text x="344" y="58.5" fontSize="9" fill="#7DD3FC" textAnchor="middle" fontFamily="monospace">Σ</text>
                  {/* Plus sign indicator on left input */}
                  <text x="334" y="50" fontSize="5" fill="#4ADE80" fontFamily="monospace">+</text>
                  {/* Minus sign indicator on bottom (feedback) input */}
                  <text x="339" y="68" fontSize="6" fill="#F87171" fontFamily="monospace">−</text>

                  {/* Arrow: SUM -> PID */}
                  <line x1="351" y1="55" x2="359" y2="55" stroke="#38BDF8" strokeWidth="1.2" className="flow-dash"/>
                  <polygon points="359,55 356,52.5 356,57.5" fill="#38BDF8"/>

                  {/* CONTROLLER (PID) Node */}
                  <rect x="360" y="46" width="32" height="18" rx="3" fill="#0E4872"/>
                  <text x="376" y="58" fontSize="6.5" fill="#38BDF8" textAnchor="middle" fontFamily="monospace">PID</text>

                  {/* Arrow: PID -> PLANT */}
                  <line x1="392" y1="55" x2="400" y2="55" stroke="#38BDF8" strokeWidth="1.2" className="flow-dash"/>
                  <polygon points="400,55 397,52.5 397,57.5" fill="#38BDF8"/>

                  {/* PLANT Node */}
                  <rect x="401" y="46" width="40" height="18" rx="3" fill="#0E4872"/>
                  <text x="421" y="58" fontSize="6.5" fill="#38BDF8" textAnchor="middle" fontFamily="monospace">PLANT</text>

                  {/* Output arrow from PLANT */}
                  <line x1="441" y1="55" x2="450" y2="55" stroke="#38BDF8" strokeWidth="1.2"/>
                  <polygon points="450,55 447,52.5 447,57.5" fill="#38BDF8"/>
                  <text x="455" y="58" fontSize="5" fill="#7DD3FC" fontFamily="monospace">y</text>

                  {/* FEEDBACK PATH (dashed, clearly visible) - curves from output back down to SUM */}
                  <path
                    d="M448,55 Q456,55 456,70 Q456,82 421,82 Q380,82 344,82 L344,62"
                    stroke="#38BDF8"
                    strokeWidth="1.5"
                    fill="none"
                    strokeDasharray="4 2"
                    className="fade-loop"
                  />
                  {/* Arrow at end of feedback (pointing up into SUM) */}
                  <polygon points="344,62 341,66 347,66" fill="#38BDF8"/>
                  {/* Minus sign at feedback arrow entry point (negative feedback indicator) */}
                  <text x="350" y="65" fontSize="8" fill="#F87171" fontFamily="monospace" fontWeight="bold">−</text>

                  {/* Feedback label */}
                  <text x="400" y="90" fontSize="6" fill="#7DD3FC" textAnchor="middle" fontFamily="monospace">feedback</text>

                  {/* ── SENSOR NODE (bottom right) ── */}
                  <rect x="294" y="124" width="170" height="90" rx="10" fill="rgba(15,23,42,0.85)" stroke="#FCD34D" strokeWidth="1.5"/>
                  <text x="306" y="142" fontSize="9" fill="#FDE68A" fontFamily="monospace" fontWeight="bold">BIOSENSORS</text>
                  {/* Pulse rings — centered at x=318 y=174, max r=14 stays within panel */}
                  <g transform="translate(318, 174)">
                    <circle r="14" fill="none" stroke="#FBBF24" strokeWidth="1" opacity="0.25" className="fade-loop"/>
                    <circle r="9" fill="none" stroke="#FBBF24" strokeWidth="1.2" opacity="0.55" className="fade-loop" style={{animationDelay:'0.4s'}}/>
                    <circle r="4.5" fill="none" stroke="#FCD34D" strokeWidth="1.8" opacity="0.85" className="fade-loop" style={{animationDelay:'0.8s'}}/>
                    <circle r="2.5" fill="#FDE68A" className="pulse-dot" filter="url(#glow-blue)"/>
                  </g>
                  {/* Labels to the right of pulse */}
                  <text x="338" y="157" fontSize="7.5" fill="#FDE68A" fontFamily="monospace">SpO₂   EMG   EEG</text>
                  <text x="338" y="169" fontSize="7.5" fill="#FCD34D" fontFamily="monospace">98%  0.4mV  12Hz</text>
                  <text x="338" y="181" fontSize="7.5" fill="#94A3B8" fontFamily="monospace">STATUS: ACTIVE</text>
                  {/* Status dots */}
                  <circle cx="340" cy="196" r="3.5" fill="#4ADE80" className="pulse-dot" style={{animationDelay:'0.3s'}}/>
                  <circle cx="357" cy="196" r="3.5" fill="#E879F9" className="pulse-dot" style={{animationDelay:'0.7s'}}/>
                  <circle cx="374" cy="196" r="3.5" fill="#38BDF8" className="pulse-dot" style={{animationDelay:'1.1s'}}/>
                  <circle cx="391" cy="196" r="3.5" fill="#FCD34D" className="pulse-dot" style={{animationDelay:'1.5s'}}/>

                  {/* ── CONNECTING LINES ── */}
                  {/* Control → robot */}
                  <path d="M294,62 Q267,130 241,196" stroke="#38BDF8" strokeWidth="1" strokeDasharray="3 4" opacity="0.35" className="flow-dash"/>
                  <circle r="2.5" fill="#38BDF8" filter="url(#glow-blue)" className="ctrl-dot-1"/>
                  <circle r="2.5" fill="#38BDF8" filter="url(#glow-blue)" className="ctrl-dot-2"/>
                  <circle r="2.5" fill="#38BDF8" filter="url(#glow-blue)" className="ctrl-dot-3"/>
                  {/* Biosensor → robot */}
                  <path d="M294,174 Q267,200 241,228" stroke="#FBBF24" strokeWidth="1" strokeDasharray="3 4" opacity="0.35" className="flow-dash"/>
                  <circle r="2.5" fill="#FCD34D" filter="url(#glow-blue)" className="bio-dot-1"/>
                  <circle r="2.5" fill="#FCD34D" filter="url(#glow-blue)" className="bio-dot-2"/>
                  <circle r="2.5" fill="#FCD34D" filter="url(#glow-blue)" className="bio-dot-3"/>

                  {/* ── LABEL ── */}
                  <text x="240" y="382" fontSize="8.5" fill="#64748B" textAnchor="middle" fontFamily="monospace" letterSpacing="2">BIOMEDICAL ROBOTICS · SIGNAL SYSTEMS</text>
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Projects Section */}
      <section className="py-16 bg-white dark:bg-[#0F172A]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-4">
              Recent Engineering Projects
            </h2>
            <p className="text-lg text-[#6B7280] max-w-2xl mx-auto">
              Exploring the intersection of signal processing, medical devices, and data analysis
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {recentProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/engineering"
              className="btn btn-primary inline-flex items-center space-x-2"
            >
              <span>View All Projects</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Recent Writings Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-4">
              Recent Writings
            </h2>
            <p className="text-lg text-[#6B7280] max-w-2xl mx-auto">
              Reflections on faith, engineering, and the human experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {recentWritings.map((writing) => (
              <WritingCard key={writing.id} writing={writing} />
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/writings"
              className="btn btn-secondary inline-flex items-center space-x-2"
            >
              <span>Read All Writings</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Books Section */}
      <section className="py-16 bg-white dark:bg-[#0F172A]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-4">
              From My Library
            </h2>
            <p className="text-lg text-[#6B7280] max-w-2xl mx-auto">
              Books that shape my thinking on technology, faith, and philosophy
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/library"
              className="btn btn-primary inline-flex items-center space-x-2"
            >
              <span>Browse Library</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}