import React, { useEffect, useRef, useState } from 'react';
import reportingSvg from '../../assets/reporting.svg';

const STEPS = [
  { icon: '🔍', title: 'Scanning your rank…',     desc: 'Fetching latest counselling data' },
  { icon: '📊', title: 'Analyzing cutoffs…',       desc: 'Comparing past year cutoff trends' },
  { icon: '🧠', title: 'AI is thinking…',          desc: 'Our model is processing your rank' },
  { icon: '🎯', title: 'Matching colleges…',       desc: 'Finding best matches for you' },
  { icon: '🔒', title: 'Finalizing results…',      desc: 'Almost there! Applying your filters' },
  { icon: '✅', title: 'Prediction ready!',        desc: 'Your results are being loaded' },
];

const STEP_MS = 1500;

export function NeetLoader({ isPredicting = true }: { isPredicting?: boolean }) {
  const [step, setStep] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const dataReady = useRef(!isPredicting);
  const stepRef = useRef(0);

  useEffect(() => {
    if (!isPredicting) {
      dataReady.current = true;
    } else {
      dataReady.current = false;
    }
  }, [isPredicting]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setStep((prev) => {
          const next =
            prev >= STEPS.length - 2
              ? dataReady.current
                ? Math.min(prev + 1, STEPS.length - 1)
                : prev
              : prev + 1;
          stepRef.current = next;
          return next;
        });
        setFadeIn(true);
      }, 200);
    }, STEP_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isPredicting && stepRef.current >= STEPS.length - 2) {
      setTimeout(() => {
        setFadeIn(false);
        setTimeout(() => {
          setStep(STEPS.length - 1);
          setFadeIn(true);
        }, 200);
      }, 400);
    }
  }, [isPredicting]);

  const current = STEPS[Math.min(step, STEPS.length - 1)];
  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    /* Full-screen fixed overlay — sits above everything */
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'linear-gradient(135deg, #0a1018 0%, #0d1e2f 50%, #091a1a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow blobs */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-128px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            opacity: 0.15,
            background:
              'radial-gradient(circle, rgba(109,91,245,0.7) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: '25%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            opacity: 0.12,
            background:
              'radial-gradient(circle, rgba(0,180,160,0.6) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Single centered card — SVG + text + progress all together */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          maxWidth: '380px',
          gap: '0px',
        }}
      >
        {/* SVG Animation — constrained so it doesn't dominate the layout */}
        <div
          style={{
            width: '220px',
            height: '165px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <img
            src={reportingSvg}
            alt="Analyzing data"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              userSelect: 'none',
              pointerEvents: 'none',
              filter: 'brightness(1.1)',
            }}
            draggable={false}
          />
        </div>

        {/* Step info */}
        <div
          style={{
            textAlign: 'center',
            opacity: fadeIn ? 1 : 0,
            transform: fadeIn ? 'translateY(0)' : 'translateY(6px)',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
            marginTop: '16px',
          }}
        >
          <p style={{ fontSize: '1.8rem', margin: '0 0 6px', lineHeight: 1 }}>
            {current.icon}
          </p>
          <p
            style={{
              fontSize: '1.15rem',
              fontWeight: 800,
              color: '#fff',
              margin: '0 0 4px',
              letterSpacing: '-0.01em',
            }}
          >
            {current.title}
          </p>
          <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
            {current.desc}
          </p>
        </div>

        {/* Progress bar */}
        <div
          style={{
            width: '100%',
            maxWidth: '300px',
            height: '5px',
            borderRadius: '999px',
            backgroundColor: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
            marginTop: '20px',
          }}
        >
          <div
            style={{
              height: '100%',
              borderRadius: '999px',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #6d5bf5, #9b7fff)',
              transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        </div>

        {/* Dots */}
        <style dangerouslySetInnerHTML={{ __html: dotCSS }} />
        <div
          style={{ display: 'flex', gap: '6px', marginTop: '12px' }}
          aria-hidden="true"
        >
          <span className="nl-dot" />
          <span className="nl-dot nl-dot-2" />
          <span className="nl-dot nl-dot-3" />
        </div>
      </div>
    </div>
  );
}

const dotCSS = `
  .nl-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: rgba(255,255,255,0.6);
    animation: nl-bounce 1.2s infinite ease-in-out;
  }
  .nl-dot-2 { animation-delay: 0.15s; }
  .nl-dot-3 { animation-delay: 0.30s; }
  @keyframes nl-bounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
    40%           { transform: translateY(-5px); opacity: 1; }
  }
`;
