import React, { useEffect, useState } from 'react';

const ICONS: Record<string, React.ReactNode> = {
  stethoscope: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3v6a4 4 0 0 0 8 0V3" />
      <circle cx="5" cy="3" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="13" cy="3" r="1.1" fill="currentColor" stroke="none" />
      <path d="M9 13.2v1.8a5 5 0 0 0 10 0v-2.6" />
      <circle cx="19" cy="10.4" r="2.1" />
    </svg>
  ),
  database: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="7" ry="2.6" />
      <path d="M5 5v14c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V5" />
      <path d="M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V13" />
      <path d="M9.5 20V8" />
      <path d="M15 20v-9" />
      <path d="M20 20v-5" />
    </svg>
  ),
  brain: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3.6c-1.8 0-3 1.3-3.3 2.7C4.2 6.6 3 8 3 9.8c0 1.2.6 2.1 1.5 2.7-.3.6-.5 1.3-.5 2 0 2 1.6 3.5 3.5 3.6.2 1.6 1.6 2.7 3.2 2.7" />
      <path d="M15 3.6c1.8 0 3 1.3 3.3 2.7 1.5.1 2.7 1.4 2.7 3.2 0 1.2-.6 2.2-1.5 2.8.3.6.5 1.3.5 2 0 2-1.6 3.5-3.5 3.6-.2 1.6-1.6 2.7-3.2 2.7" />
      <path d="M12 4v16.6" />
    </svg>
  ),
  target: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5.2" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.2l7 2.9v5.8c0 4.6-3 7.6-7 9.1-4-1.5-7-4.5-7-9.1V6.1l7-2.9z" />
      <path d="M8.8 12l2.2 2.2 4.2-4.2" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 12.5l4 4 8-8.5" />
    </svg>
  )
};

const STEPS = [
  { icon: 'stethoscope', percent: null, title: 'Preparing your prediction', desc: 'Getting things ready...' },
  { icon: 'database',    percent: 15,   title: 'Fetching data',             desc: 'Collecting latest counselling data...' },
  { icon: 'chart',       percent: 35,   title: 'Analyzing cutoffs',         desc: 'Analyzing past year cutoff trends...' },
  { icon: 'brain',       percent: 55,   title: 'AI is thinking',            desc: 'Our AI model is processing your rank...' },
  { icon: 'target',      percent: 75,   title: 'Matching colleges',         desc: 'Finding best matching colleges for you...' },
  { icon: 'shield',      percent: 90,   title: 'Finalizing results',        desc: 'Almost there! Finalizing your prediction...' },
  { icon: 'check',       percent: 100,  title: 'Prediction Ready!',         desc: 'Your results are ready' },
];

const STEP_DURATION = 1500;
const CIRC = 2 * Math.PI * 58;

export interface PredictionLoaderProps {
  isLoading: boolean;
  error?: string | null;
  onAnimationComplete: () => void;
  onRetry: () => void;
  dark?: boolean;
}

export function PredictionLoader({ isLoading, error, onAnimationComplete, onRetry, dark = true }: PredictionLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [fadeContent, setFadeContent] = useState(false);
  const isApiDone = !isLoading && !error;

  // Advance steps based on time up to step 5, regardless of whether API is done
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;

    if (!error && currentStep < 5) {
      timerId = setTimeout(() => {
        setFadeContent(true);
        setTimeout(() => {
          setCurrentStep(s => s + 1);
          setFadeContent(false);
        }, 180);
      }, STEP_DURATION);
    }

    return () => clearTimeout(timerId);
  }, [error, currentStep]);

  // When API is done, move to the final step (after reaching step 5)
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;

    if (isApiDone && currentStep === 5 && !error) {
      setFadeContent(true);
      timerId = setTimeout(() => {
        setCurrentStep(6);
        setFadeContent(false);
      }, 180);
    }

    return () => clearTimeout(timerId);
  }, [isApiDone, currentStep, error]);

  // When we reach the final step (6), wait a bit then complete
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;

    if (currentStep === 6 && !error) {
      timerId = setTimeout(() => {
        onAnimationComplete();
      }, 700);
    }

    return () => clearTimeout(timerId);
  }, [currentStep, error, onAnimationComplete]);

  // If component mounts/remounts due to starting loading again
  useEffect(() => {
    if (isLoading && currentStep === 6) {
      setCurrentStep(0);
    }
  }, [isLoading]);

  const step = STEPS[currentStep] || STEPS[0];
  const isLast = currentStep === STEPS.length - 1;

  // Theming classes based on CSS variables mapped to Tailwind arbitrary classes or inline
  const textColor = dark ? 'text-white' : 'text-[#211c4d]';
  const descColor = dark ? 'text-white/60' : 'text-[#6b7280]';
  const cardBg = dark ? 'bg-[#0f1f2c] border border-white/8' : 'bg-white border shadow-lg';
  const circleStrokeBg = dark ? '#ffffff1a' : '#eeecfe';

  const strokeDashoffset = step.percent === null 
    ? CIRC 
    : CIRC - (step.percent / 100) * CIRC;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className={`w-full max-w-[360px] rounded-[28px] p-[44px_32px_34px] text-center relative ${cardBg}`}>
        
        {!error ? (
          <div className="loading-state">
            <div className="relative w-[128px] h-[128px] mx-auto mb-[14px] flex items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 128 128" width="128" height="128" aria-hidden="true">
                <circle cx="64" cy="64" r="58" fill="none" stroke={circleStrokeBg} strokeWidth="7" />
                <circle 
                  cx="64" cy="64" r="58" 
                  fill="none" 
                  stroke={isLast ? '#22c55e' : '#6d5bf5'} 
                  strokeWidth="7" 
                  strokeLinecap="round" 
                  style={{
                    strokeDasharray: CIRC,
                    strokeDashoffset: strokeDashoffset,
                    transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.4s ease'
                  }}
                />
              </svg>
              <div 
                className={`w-[76px] h-[76px] rounded-full flex items-center justify-center z-[1] transition-all duration-400
                  ${currentStep === 0 ? 'bg-[#e3f8f5] text-[#14b8a6]' : 
                    isLast ? 'bg-[#22c55e] text-white' : 'bg-[#eeecfe] text-[#6d5bf5]'}`}
                aria-hidden="true"
              >
                <div className="w-[34px] h-[34px]">
                  {ICONS[step.icon]}
                </div>
              </div>
            </div>

            <div 
              className={`h-[32px] text-[26px] font-[800] transition-all duration-300 ${
                step.percent === null ? 'opacity-0 -translate-y-1' : 'opacity-100 translate-y-0'
              } ${isLast ? 'text-[#22c55e]' : 'text-[#6d5bf5]'}`}
            >
              {step.percent !== null ? `${step.percent}%` : ''}
            </div>
            
            <div 
              className={`h-[32px] flex items-center justify-center gap-[6px] ${
                step.percent === null ? 'flex' : 'hidden'
              }`}
              aria-hidden="true"
            >
              <span className="w-[6px] h-[6px] rounded-full bg-[#14b8a6] animate-[bounce_1.2s_infinite_ease-in-out_0s]" />
              <span className="w-[6px] h-[6px] rounded-full bg-[#14b8a6] animate-[bounce_1.2s_infinite_ease-in-out_0.15s]" />
              <span className="w-[6px] h-[6px] rounded-full bg-[#14b8a6] animate-[bounce_1.2s_infinite_ease-in-out_0.3s]" />
            </div>

            <div aria-live="polite">
              <div 
                className={`text-[19px] font-[700] ${textColor} my-[6px] transition-all duration-250 ${
                  fadeContent ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
                }`}
              >
                {step.title}
              </div>
              <div 
                className={`text-[13.5px] leading-[1.5] ${descColor} mb-[26px] min-h-[20px] transition-all duration-250 ${
                  fadeContent ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
                }`}
              >
                {step.desc}
              </div>
            </div>

            <div className="flex justify-center gap-[7px]" aria-hidden="true">
              {STEPS.map((_, idx) => (
                <span 
                  key={idx}
                  className={`h-[7px] rounded-full transition-all duration-350 ${
                    idx < currentStep ? 'w-[7px] bg-[#c9c2fb]' : 
                    idx === currentStep ? 'w-[20px] bg-[#6d5bf5]' : 'w-[7px] bg-[#eeecfe]'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="pt-[24px]" role="alert">
            <div className="w-[76px] h-[76px] mx-auto mb-[18px] rounded-full flex items-center justify-center bg-[#fee2e2] text-[#ef4444]" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[34px] h-[34px]">
                <path d="M12 3.5l9.5 16.5H2.5L12 3.5z"/><path d="M12 9.5v4.5"/><circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none"/>
              </svg>
            </div>
            <div className={`text-[19px] font-[700] ${textColor} my-[6px]`}>
              Couldn't load your prediction
            </div>
            <div className={`text-[13.5px] leading-[1.5] ${descColor} mb-[26px] min-h-[20px]`}>
              {error}
            </div>
            <button 
              onClick={onRetry}
              className="mt-[6px] border-none bg-[#6d5bf5] text-white font-[700] text-[14px] px-[28px] py-[11px] rounded-full cursor-pointer hover:bg-[#5b4be0] hover:-translate-y-[1px] active:translate-y-0 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6d5bf5] focus-visible:outline-offset-2"
              type="button"
            >
              ↻ Try again
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
