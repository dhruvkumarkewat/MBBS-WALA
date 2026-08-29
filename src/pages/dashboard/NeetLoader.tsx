import React, { useEffect, useRef, useState } from 'react';
import reportingSvg from '../../assets/reporting.svg';

const STEPS = [
  { icon: '🔍', title: 'Scanning your rank…',         desc: 'Fetching latest counselling data' },
  { icon: '📊', title: 'Analyzing cutoffs…',           desc: 'Comparing past year cutoff trends' },
  { icon: '🧠', title: 'AI is thinking…',              desc: 'Our model is processing your rank' },
  { icon: '🎯', title: 'Matching colleges…',           desc: 'Finding best matches for you' },
  { icon: '🔒', title: 'Finalizing results…',          desc: 'Almost there! Applying your filters' },
  { icon: '✅', title: 'Prediction ready!',            desc: 'Your results are being loaded' },
];

const STEP_MS = 1500;

export function NeetLoader({ isPredicting = true }: { isPredicting?: boolean }) {
  const [step, setStep] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const dataReady = useRef(!isPredicting);
  const stepRef = useRef(0);

  // Advance steps every STEP_MS ms, freeze at step 4 until data is ready
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
          const next = prev >= STEPS.length - 2
            ? (dataReady.current ? Math.min(prev + 1, STEPS.length - 1) : prev)
            : prev + 1;
          stepRef.current = next;
          return next;
        });
        setFadeIn(true);
      }, 200);
    }, STEP_MS);

    return () => clearInterval(interval);
  }, []);

  // When data becomes ready and we are stuck at step 4, push to final step
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
    <div style={wrapperStyle}>
      {/* SVG animation */}
      <div style={svgContainerStyle}>
        <img
          src={reportingSvg}
          alt="Analyzing data"
          style={svgStyle}
          draggable={false}
        />
      </div>

      {/* Step info */}
      <div
        style={{
          ...infoStyle,
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? 'translateY(0)' : 'translateY(6px)',
        }}
      >
        <p style={iconStyle}>{current.icon}</p>
        <p style={titleStyle}>{current.title}</p>
        <p style={descStyle}>{current.desc}</p>
      </div>

      {/* Progress bar */}
      <div style={barTrackStyle}>
        <div
          style={{
            ...barFillStyle,
            width: `${progress}%`,
          }}
        />
      </div>

      {/* Dots */}
      <style dangerouslySetInnerHTML={{ __html: dotCSS }} />
      <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }} aria-hidden="true">
        <span className="nl-dot" />
        <span className="nl-dot nl-dot-2" />
        <span className="nl-dot nl-dot-3" />
      </div>
    </div>
  );
}

const wrapperStyle: React.CSSProperties = {
  width: '100%',
  position: 'relative',
  borderRadius: '20px',
  overflow: 'hidden',
  backgroundColor: '#0d1624',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 20px 20px',
  gap: '4px',
  border: '1px solid rgba(109, 91, 245, 0.2)',
  boxShadow: '0 4px 40px rgba(109, 91, 245, 0.12)',
};

const svgContainerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '360px',
  aspectRatio: '4/3',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const svgStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  userSelect: 'none',
  pointerEvents: 'none',
};

const infoStyle: React.CSSProperties = {
  textAlign: 'center',
  transition: 'opacity 0.2s ease, transform 0.2s ease',
};

const iconStyle: React.CSSProperties = {
  fontSize: '1.6rem',
  margin: '0 0 4px',
  lineHeight: 1,
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.05rem',
  fontWeight: 800,
  color: '#fff',
  margin: '0 0 3px',
  letterSpacing: '-0.01em',
};

const descStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  color: 'rgba(255,255,255,0.6)',
  margin: 0,
};

const barTrackStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '320px',
  height: '5px',
  borderRadius: '999px',
  backgroundColor: 'rgba(255,255,255,0.08)',
  overflow: 'hidden',
  marginTop: '12px',
};

const barFillStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: '999px',
  background: 'linear-gradient(90deg, #6d5bf5, #9b7fff)',
  transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
};

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
