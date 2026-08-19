import React, { useEffect, useRef, useState } from 'react';

// Video timing constants
// The video is 8 seconds of actual animation — no storyboard/intro.
// Timeline:
//   0.0s – 3.0s : Loading animation (character running, cutoffs/seat-matrix scenes)
//   3.0s – 4.2s : ~90% hold section (character near end of bar) — loop here while waiting
//   4.2s – 8.0s : Final animation ("Done!" + 100%) — play through on data ready
//
// 90% hold: loop [LOOP_START, LOOP_END) while API is still processing.
// When data is ready: stop looping, seek to FINAL_START, play to natural end.
const VIDEO_START = 0;
const LOOP_START  = 3.0;
const LOOP_END    = 4.2;
const FINAL_START = 4.2;

export function NeetLoader({ isPredicting = true }: { isPredicting?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // phase ref — avoids stale closures in event handlers
  const phase = useRef<'playing' | 'holding' | 'finishing' | 'done'>('playing');
  const dataReady = useRef(false);
  const revealed = useRef(false);

  const [holdLabel, setHoldLabel] = useState(false);
  const [videoVisible, setVideoVisible] = useState(false);

  // Sync isPredicting → dataReady; if we are already holding, trigger finish
  useEffect(() => {
    if (!isPredicting) {
      dataReady.current = true;
      (window as any).neetLoaderForceDone = true;

      if (phase.current === 'holding') {
        phase.current = 'finishing';
        setHoldLabel(false);
        const video = videoRef.current;
        if (video) {
          video.currentTime = FINAL_START;
          video.play().catch(() => {});
        }
      }
    } else {
      dataReady.current = false;
      (window as any).neetLoaderForceDone = false;
    }
  }, [isPredicting]);

  // Main video lifecycle — runs once on mount
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    phase.current = 'playing';
    dataReady.current = !isPredicting;
    revealed.current = false;
    setHoldLabel(false);
    setVideoVisible(false);

    const onCanPlay = () => {
      // Seek to start position (in this video 0, no intro to skip)
      video.currentTime = VIDEO_START;
    };

    const onSeeked = () => {
      if (!revealed.current) {
        revealed.current = true;
        setVideoVisible(true);
        video.play().catch(() => {});
      }
    };

    let rafId: number;
    const monitorVideo = () => {
      const video = videoRef.current;
      if (!video) return;
      const t = video.currentTime;

      if (phase.current === 'playing' && t >= LOOP_START) {
        if (dataReady.current) {
          // Data arrived before 90% — just let it play through
          phase.current = 'finishing';
        } else {
          // Enter 90% hold loop
          phase.current = 'holding';
          setHoldLabel(true);
        }
      }

      if (phase.current === 'holding') {
        if (t >= LOOP_END) {
          // Loop back to start of hold section instantly
          video.currentTime = LOOP_START;
        }
        // Check if data became ready
        if (dataReady.current) {
          phase.current = 'finishing';
          setHoldLabel(false);
          video.currentTime = FINAL_START;
          video.play().catch(() => {});
        }
      }
      
      rafId = requestAnimationFrame(monitorVideo);
    };

    const onEnded = () => {
      if (phase.current !== 'done') {
        phase.current = 'done';
        setHoldLabel(false);
        (window as any).neetLoaderForceDone = true;
      }
    };

    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('ended', onEnded);
    
    // Start 60fps monitor loop
    rafId = requestAnimationFrame(monitorVideo);
    video.load();

    return () => {
      cancelAnimationFrame(rafId);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('ended', onEnded);
      video.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Retry support: isPredicting goes false → true means new attempt
  const prevPredicting = useRef(isPredicting);
  useEffect(() => {
    const wasDone = !prevPredicting.current;
    prevPredicting.current = isPredicting;
    if (wasDone && isPredicting) {
      const video = videoRef.current;
      if (!video) return;
      phase.current = 'playing';
      dataReady.current = false;
      revealed.current = false;
      setHoldLabel(false);
      setVideoVisible(false);
      video.currentTime = VIDEO_START;
      video.play().catch(() => {});
    }
  }, [isPredicting]);

  return (
    <div style={wrapperStyle} onContextMenu={(e) => e.preventDefault()}>
      <style dangerouslySetInnerHTML={{ __html: dotCSS }} />

      <video
        ref={videoRef}
        src="/Character_runs_across_progress_bar_no_audio.mp4"
        muted
        playsInline
        preload="auto"
        controls={false}
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
          opacity: videoVisible ? 1 : 0,
          transition: 'opacity 0.25s ease',
          pointerEvents: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      />

      {holdLabel && (
        <div style={overlayStyle}>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.1, textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}>90%</p>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', margin: '4px 0 2px', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>Still analyzing&hellip;</p>
          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', margin: 0, textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>Finalizing your college predictions</p>
          <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }} aria-hidden="true">
            <span className="nl-dot" />
            <span className="nl-dot nl-dot-2" />
            <span className="nl-dot nl-dot-3" />
          </div>
        </div>
      )}
    </div>
  );
}

const wrapperStyle: React.CSSProperties = {
  width: '100%',
  position: 'relative',
  borderRadius: '16px',
  overflow: 'hidden',
  backgroundColor: '#0d1b2a',
  aspectRatio: '16/9',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  paddingTop: '5%',
  pointerEvents: 'none',
};

const dotCSS = `
  .nl-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: rgba(255,255,255,0.85);
    animation: nl-bounce 1.2s infinite ease-in-out;
  }
  .nl-dot-2 { animation-delay: 0.15s; }
  .nl-dot-3 { animation-delay: 0.30s; }
  @keyframes nl-bounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
    40%           { transform: translateY(-5px); opacity: 1; }
  }
`;
