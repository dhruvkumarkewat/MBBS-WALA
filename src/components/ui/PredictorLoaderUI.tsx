import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Search, CheckCircle2, ShieldCheck } from 'lucide-react';

export function PredictorLoaderUI({ progress, loadingMessage }: { progress: number; loadingMessage: string }) {
  // Convert progress (0-100) to a constrained value for the runner
  // We want the runner to move from left (say 5%) to right (say 95%)
  const clampedProgress = Math.max(5, Math.min(progress, 95));

  return (
    <div className="relative w-full overflow-hidden flex flex-col items-center justify-center pt-8 pb-4" style={{ aspectRatio: '16/7', background: '#0d1b2a' }}>
      
      {/* Floating Center Icons based on progress */}
      <div className="absolute top-8 flex justify-center w-full z-10">
        <AnimatePresence mode="wait">
          {progress < 40 ? (
            <motion.div
              key="chart"
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.8 }}
              className="bg-white/10 p-4 rounded-2xl border border-white/20 backdrop-blur-md shadow-2xl"
            >
              <BarChart3 className="w-10 h-10 text-white/90" />
            </motion.div>
          ) : progress < 80 ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.8 }}
              className="bg-white/10 p-4 rounded-2xl border border-white/20 backdrop-blur-md shadow-2xl flex items-center justify-center relative"
            >
              <Search className="w-10 h-10 text-white/90 animate-pulse" />
              {/* Scanline effect */}
              <motion.div 
                animate={{ top: ['0%', '100%', '0%'] }} 
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="absolute left-0 w-full h-0.5 bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
              />
            </motion.div>
          ) : (
            <motion.div
              key="shield"
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.8 }}
              className="bg-white/10 p-4 rounded-2xl border border-white/20 backdrop-blur-md shadow-2xl"
            >
              <ShieldCheck className="w-10 h-10 text-emerald-400" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Holographic Beam (Optional cool effect) */}
      <div className="absolute top-[100px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[30px] border-l-transparent border-r-[30px] border-r-transparent border-b-[80px] border-b-white/5 opacity-50 blur-[2px]" />

      {/* Characters Layer */}
      <div className="absolute bottom-[38px] w-full px-8 flex items-end justify-between z-20">
        
        {/* Runner (Superhero Silhouette) */}
        <motion.div 
          className="absolute bottom-0"
          animate={{ left: `calc(${clampedProgress}% - 40px)` }}
          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
        >
          <div className="relative w-16 h-16">
            {/* Simple SVG Silhouette of a running hero in red */}
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]">
              {/* Cape */}
              <motion.path 
                animate={{ d: [
                  "M35,30 C20,35 10,50 15,65 C20,55 25,45 35,40 Z",
                  "M35,30 C15,35 5,45 10,60 C15,50 25,40 35,40 Z",
                  "M35,30 C20,35 10,50 15,65 C20,55 25,45 35,40 Z"
                ]}}
                transition={{ duration: 0.5, repeat: Infinity }}
                fill="#dc2626" 
              />
              {/* Body */}
              <path d="M50,15 A8,8 0 1,1 50,31 A8,8 0 1,1 50,15 M48,32 L60,40 L55,55 L45,45 Z" fill="#ef4444" />
              {/* Legs */}
              <motion.path
                animate={{ d: [
                  "M45,45 L35,65 L45,65 M55,55 L60,75 L70,75",
                  "M45,45 L40,60 L50,60 M55,55 L50,70 L60,70",
                  "M45,45 L35,65 L45,65 M55,55 L60,75 L70,75"
                ]}}
                transition={{ duration: 0.4, repeat: Infinity }}
                fill="#ef4444" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
              />
              {/* Arms */}
              <motion.path
                animate={{ d: [
                  "M60,40 L70,35 M48,32 L40,45",
                  "M60,40 L65,30 M48,32 L35,40",
                  "M60,40 L70,35 M48,32 L40,45"
                ]}}
                transition={{ duration: 0.4, repeat: Infinity }}
                fill="none" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
              />
              {/* Magnifying Glass / Flag */}
              <motion.g animate={{ rotate: [-5, 5, -5], transformOrigin: "70px 35px" }} transition={{ duration: 0.5, repeat: Infinity }}>
                 <circle cx="78" cy="25" r="5" fill="none" stroke="#ef4444" strokeWidth="2" />
                 <line x1="74" y1="29" x2="70" y2="35" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
              </motion.g>
            </svg>
            
            {/* Glow beneath feet */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-2 bg-white rounded-full blur-[2px] shadow-[0_0_10px_#fff]" />
          </div>
        </motion.div>

        {/* Person at Laptop (Right side) */}
        <div className="absolute right-[8%] bottom-0 w-16 h-16">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
            {/* Head */}
            <circle cx="65" cy="25" r="9" fill="#f8fafc" />
            {/* Body */}
            <path d="M60,35 L50,60 L65,60 L75,45 Z" fill="none" stroke="#f8fafc" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            {/* Chair */}
            <path d="M75,35 L80,60 L80,85 M70,85 L85,85" fill="none" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            {/* Table */}
            <path d="M20,60 L85,60 M30,60 L30,85 M75,60 L75,85" fill="none" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
            {/* Laptop */}
            <path d="M35,45 L45,60 L30,60 Z" fill="#f8fafc" />
            {/* Arms typing */}
            <motion.path 
              animate={{ d: [
                "M60,35 L45,45 L40,55",
                "M60,35 L45,47 L42,57",
                "M60,35 L45,45 L40,55"
              ]}}
              transition={{ duration: 0.2, repeat: Infinity }}
              fill="none" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </div>
        
      </div>

      {/* ── The Progress Track ── */}
      <div className="absolute bottom-6 w-[88%] h-7 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.2)] overflow-hidden z-10">
        <motion.div
          className="h-full bg-red-600 relative flex items-center justify-end pr-3 transition-colors shadow-[0_0_20px_rgba(220,38,38,0.8)]"
          animate={{ width: `${progress}%`, backgroundColor: progress === 100 ? '#16a34a' : '#dc2626' }}
          transition={{ type: 'spring', stiffness: 50, damping: 20 }}
        >
          {/* Inner Percentage on the Bar */}
          {progress > 10 && (
            <span className="text-white font-bold text-xs tabular-nums tracking-tight">
              {Math.floor(progress)}%
            </span>
          )}
        </motion.div>
      </div>

    </div>
  );
}
