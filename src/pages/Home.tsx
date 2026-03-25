import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Github, Linkedin, Mail, ExternalLink, ChevronRight } from 'lucide-react';
import { ProjectCard } from '../components/ProjectCard';
import { WritingCard } from '../components/WritingCard';
import { BookCard } from '../components/BookCard';
import { api } from '../lib/api';

export function Home() {
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [recentWritings, setRecentWritings] = useState<any[]>([]);
  const [featuredBooks, setFeaturedBooks] = useState<any[]>([]);

  useEffect(() => {
    api.getPublicProjects().then((data: any[]) => setRecentProjects(data.slice(0, 3))).catch(console.error);
    api.getPublicWritings().then((data: any[]) => setRecentWritings(data.slice(0, 3))).catch(console.error);
    api.getPublicBooks().then((data: any[]) => setFeaturedBooks(data.slice(0, 3))).catch(console.error);
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
                      <feGaussianBlur stdDeviation="3.5" result="blur"/>
                      <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
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
                        d="M24,66 L28,66 L29,64 L31,63 L33,64 L36,66 L40,66 L41,70 L42,42 L43,76 L44,66 L48,66 L50,63 L52,62 L54,63 L56,66 L76,66
                           L80,66 L81,64 L83,63 L85,64 L88,66 L92,66 L93,70 L94,42 L95,76 L96,66 L100,66 L102,63 L104,62 L106,63 L108,66 L128,66
                           L132,66 L133,64 L135,63 L137,64 L140,66 L144,66 L145,70 L146,42 L147,76 L148,66 L152,66 L154,63 L156,62 L158,63 L160,66 L180,66
                           L184,66 L185,64 L187,63 L189,64 L192,66 L196,66 L197,70 L198,42 L199,76 L200,66 L204,66 L206,63 L208,62 L210,63 L212,66 L232,66
                           L236,66 L237,64 L239,63 L241,64 L244,66 L248,66 L249,70 L250,42 L251,76 L252,66 L256,66 L258,63 L260,62 L262,63 L264,66 L284,66
                           L288,66 L289,64 L291,63 L293,64 L296,66 L300,66 L301,70 L302,42 L303,76 L304,66 L308,66 L310,63 L312,62 L314,63 L316,66 L336,66
                           L340,66 L341,64 L343,63 L345,64 L348,66 L352,66 L353,70 L354,42 L355,76 L356,66 L360,66 L362,63 L364,62 L366,63 L368,66 L388,66
                           L392,66 L393,64 L395,63 L397,64 L400,66 L404,66 L405,70 L406,42 L407,76 L408,66 L412,66 L414,63 L416,62 L418,63 L420,66 L440,66"
                        stroke="#4ADE80" strokeWidth="1.8" fill="none" filter="url(#glow-green)"
                      />
                    </g>
                  </g>

                  {/* ── EMG PANEL — seamless scrolling burst pattern ── */}
                  <rect x="18" y="118" width="170" height="70" rx="10" fill="rgba(15,23,42,0.85)" stroke="#C084FC" strokeWidth="1.5"/>
                  <text x="30" y="136" fontSize="9" fill="#E879F9" fontFamily="monospace" fontWeight="bold">EMG SIGNAL</text>
                  <circle cx="170" cy="130" r="5" fill="#C084FC" className="blink2" filter="url(#glow-purple)"/>
                  <rect x="24" y="143" width="158" height="36" rx="4" fill="rgba(2,6,23,0.7)"/>
                  {/* Clip + scroll: each 52px cycle = 18px quiet + 16px burst + 18px quiet */}
                  <g clipPath="url(#emg-clip)">
                    <g className="scroll-emg">
                      <path
                        d="M24,161 L42,161 L43,157 L44,167 L45,152 L46,170 L47,153 L48,169 L49,157 L50,165 L51,159 L52,163 L53,161 L54,161 L76,161
                           L94,161 L95,156 L96,168 L97,151 L98,171 L99,154 L100,169 L101,157 L102,164 L103,160 L104,163 L105,161 L106,161 L128,161
                           L146,161 L147,157 L148,167 L149,152 L150,170 L151,153 L152,168 L153,158 L154,165 L155,159 L156,163 L157,161 L158,161 L180,161
                           L198,161 L199,156 L200,167 L201,152 L202,170 L203,154 L204,169 L205,157 L206,164 L207,160 L208,163 L209,161 L210,161 L232,161
                           L250,161 L251,157 L252,168 L253,152 L254,171 L255,153 L256,169 L257,158 L258,165 L259,159 L260,163 L261,161 L262,161 L284,161
                           L302,161 L303,156 L304,168 L305,151 L306,170 L307,154 L308,169 L309,157 L310,164 L311,160 L312,163 L313,161 L314,161 L336,161
                           L354,161 L355,157 L356,167 L357,152 L358,170 L359,153 L360,168 L361,158 L362,165 L363,159 L364,163 L365,161 L366,161 L388,161
                           L406,161 L407,156 L408,167 L409,152 L410,170 L411,154 L412,169 L413,157 L414,164 L415,160 L416,163 L417,161 L418,161 L440,161"
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

                  {/* ── CONTROL SYSTEM (top right) ── */}
                  <rect x="294" y="18" width="170" height="90" rx="10" fill="rgba(15,23,42,0.85)" stroke="#38BDF8" strokeWidth="1.5"/>
                  <text x="306" y="36" fontSize="9" fill="#7DD3FC" fontFamily="monospace" fontWeight="bold">CONTROL SYSTEM</text>
                  <rect x="306" y="44" width="42" height="22" rx="4" fill="#0E4872"/>
                  <text x="327" y="59" fontSize="7.5" fill="#38BDF8" textAnchor="middle" fontFamily="monospace">REF</text>
                  <rect x="370" y="44" width="42" height="22" rx="4" fill="#0E4872"/>
                  <text x="391" y="59" fontSize="7.5" fill="#38BDF8" textAnchor="middle" fontFamily="monospace">PLANT</text>
                  <line x1="348" y1="55" x2="368" y2="55" stroke="#38BDF8" strokeWidth="1.5" className="flow-dash"/>
                  <path d="M412 66 Q430 66 430 80 Q430 92 391 92 Q348 92 330 92 Q306 92 306 80 L306 66" stroke="#38BDF8" strokeWidth="1" fill="none" strokeDasharray="4 3" className="fade-loop"/>
                  <text x="360" y="88" fontSize="7" fill="#7DD3FC" textAnchor="middle" fontFamily="monospace">feedback</text>
                  <circle cx="358" cy="55" r="7" fill="none" stroke="#38BDF8" strokeWidth="1.5"/>
                  <text x="358" y="59" fontSize="9" fill="#7DD3FC" textAnchor="middle">+</text>

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