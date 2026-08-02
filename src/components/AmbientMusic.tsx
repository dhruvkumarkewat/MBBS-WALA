import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const STORAGE_KEY = 'mbbswala-ambient-music';
const VOLUME = 0.12;

/** One shared HTMLAudioElement for the whole app (avoids StrictMode double-play). */
let sharedAudio: HTMLAudioElement | null = null;
let sharedListenersAttached = false;

function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio('/audio/ambient.mp3');
    sharedAudio.loop = true;
    // Don't preload until user opts in — avoids network/CPU lag on first paint
    sharedAudio.preload = 'none';
    sharedAudio.volume = VOLUME;
  }
  return sharedAudio;
}

function hardStop(audio: HTMLAudioElement) {
  try {
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 0;
    // Cancel any pending play() promise side-effects
    audio.muted = true;
  } catch {
    /* ignore */
  }
}

function softPlay(audio: HTMLAudioElement) {
  audio.muted = false;
  audio.volume = VOLUME;
  return audio.play();
}

/**
 * Soft ambient bed. Default OFF.
 * Mute always hard-stops audio — no background unlock listeners that re-start music.
 */
export default function AmbientMusic({ className = '' }: { className?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const audio = getSharedAudio();
    audioRef.current = audio;

    // Always start muted/stopped on mount — never auto-resume ghost playback
    hardStop(audio);
    setEnabled(false);
    setReady(true); // button usable immediately; network starts only on play

    try {
      localStorage.setItem(STORAGE_KEY, 'off');
    } catch {
      /* ignore */
    }

    const onCanPlay = () => setReady(true);
    audio.addEventListener('canplaythrough', onCanPlay);

    const onPause = () => setEnabled(false);
    const onPlay = () => setEnabled(true);

    if (!sharedListenersAttached) {
      audio.addEventListener('pause', onPause);
      audio.addEventListener('play', onPlay);
      sharedListenersAttached = true;
    }

    // Sync UI if something else paused/played
    setEnabled(!audio.paused && !audio.muted && audio.volume > 0);

    return () => {
      audio.removeEventListener('canplaythrough', onCanPlay);
      // Do NOT destroy shared audio on unmount (StrictMode) — just ensure stopped if leaving
    };
  }, []);

  const toggle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const audio = audioRef.current || getSharedAudio();
      audioRef.current = audio;

      const isPlaying = !audio.paused && !audio.muted && audio.volume > 0;

      if (isPlaying || enabled) {
        hardStop(audio);
        setEnabled(false);
        try {
          localStorage.setItem(STORAGE_KEY, 'off');
        } catch {
          /* ignore */
        }
        return;
      }

      try {
        // Load network only when user presses play
        if (audio.preload === 'none') {
          audio.preload = 'auto';
          audio.load();
        }
        await softPlay(audio);
        setEnabled(true);
        try {
          localStorage.setItem(STORAGE_KEY, 'on');
        } catch {
          /* ignore */
        }
      } catch {
        hardStop(audio);
        setEnabled(false);
      }
    },
    [enabled]
  );

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!ready && !audioRef.current}
      className={`pointer-events-auto group relative w-11 h-11 rounded-full border border-white/15 bg-[#1A1E28] backdrop-blur-md text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)] grid place-items-center hover:bg-[#252A36] hover:border-white/25 transition-all touch-manipulation active:scale-95 ${className}`}
      aria-label={enabled ? 'Mute background music' : 'Play soft background music'}
      aria-pressed={enabled}
      title={enabled ? 'Music on — tap to mute' : 'Music off — tap to play'}
    >
      {enabled ? (
        <Volume2 className="w-4 h-4 text-[#42A5F5]" strokeWidth={2.25} />
      ) : (
        <VolumeX className="w-4 h-4 text-white" strokeWidth={2.25} />
      )}
      {/* no animate-ping — avoids continuous paint cost on the FAB */}
    </button>
  );
}
