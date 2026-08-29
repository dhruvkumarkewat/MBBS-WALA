import { Lottie } from 'lottie-react';
import loaderAnimation from '../assets/loader-animation.json';

interface FullScreenLoaderProps {
  /** Optional subtitle shown below the animation */
  message?: string;
  /** Optional heading text */
  title?: string;
}

/**
 * Full-screen loading overlay with the custom Lottie animation.
 * Uses a dark gradient backdrop so it looks great over any background.
 */
export default function FullScreenLoader({ message, title }: FullScreenLoaderProps) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #0e1217 0%, #0f1c2e 50%, #0e1a1a 100%)',
      }}
      role="status"
      aria-label={title || message || 'Loading…'}
    >
      {/* Ambient glow blobs */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-10"
          style={{
            background:
              'radial-gradient(circle, rgba(0,113,188,0.8) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full opacity-10"
          style={{
            background:
              'radial-gradient(circle, rgba(0,180,160,0.6) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Lottie animation */}
      <div className="relative z-10 w-72 h-56 sm:w-80 sm:h-64">
        <Lottie
          src={loaderAnimation}
          loop
          autoplay
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Text */}
      <div className="relative z-10 mt-2 text-center px-6">
        {title && (
          <p className="text-base sm:text-lg font-bold text-white tracking-tight mb-1">
            {title}
          </p>
        )}
        {message && (
          <p className="text-xs sm:text-sm text-white/60 font-medium max-w-xs mx-auto">
            {message}
          </p>
        )}
        {!title && !message && (
          <p className="text-xs text-white/50 font-medium tracking-wide">
            Loading…
          </p>
        )}
      </div>
    </div>
  );
}
