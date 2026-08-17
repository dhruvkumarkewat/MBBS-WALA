import React, { useEffect, useRef } from 'react';

export function NeetLoader({ isPredicting = true }: { isPredicting?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const flowRunning = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    if (flowRunning.current) return;
    flowRunning.current = true;

    const ICONS = {
      stethoscope: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3v6a4 4 0 0 0 8 0V3"/><circle cx="5" cy="3" r="1.1" fill="currentColor" stroke="none"/><circle cx="13" cy="3" r="1.1" fill="currentColor" stroke="none"/><path d="M9 13.2v1.8a5 5 0 0 0 10 0v-2.6"/><circle cx="19" cy="10.4" r="2.1"/></svg>`,
      database: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="7" ry="2.6"/><path d="M5 5v14c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V5"/><path d="M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6"/></svg>`,
      chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V13"/><path d="M9.5 20V8"/><path d="M15 20v-9"/><path d="M20 20v-5"/></svg>`,
      brain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3.6c-1.8 0-3 1.3-3.3 2.7C4.2 6.6 3 8 3 9.8c0 1.2.6 2.1 1.5 2.7-.3.6-.5 1.3-.5 2 0 2 1.6 3.5 3.5 3.6.2 1.6 1.6 2.7 3.2 2.7"/><path d="M15 3.6c1.8 0 3 1.3 3.3 2.7 1.5.1 2.7 1.4 2.7 3.2 0 1.2-.6 2.2-1.5 2.8.3.6.5 1.3.5 2 0 2-1.6 3.5-3.5 3.6-.2 1.6-1.6 2.7-3.2 2.7"/><path d="M12 4v16.6"/></svg>`,
      target: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.2"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/></svg>`,
      shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2l7 2.9v5.8c0 4.6-3 7.6-7 9.1-4-1.5-7-4.5-7-9.1V6.1l7-2.9z"/><path d="M8.8 12l2.2 2.2 4.2-4.2"/></svg>`,
      check: `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12.5l4 4 8-8.5"/></svg>`
    };

    const STEPS = [
      { icon:'stethoscope', percent:null, title:'Preparing your prediction', desc:'Getting things ready...' },
      { icon:'database',    percent:15,   title:'Fetching data',             desc:'Collecting latest counselling data...' },
      { icon:'chart',       percent:35,   title:'Analyzing cutoffs',         desc:'Analyzing past year cutoff trends...' },
      { icon:'brain',       percent:55,   title:'AI is thinking',            desc:'Our AI model is processing your rank...' },
      { icon:'target',      percent:75,   title:'Matching colleges',         desc:'Finding best matching colleges for you...' },
      { icon:'shield',      percent:90,   title:'Finalizing results',        desc:'Almost there! Finalizing your prediction...' },
      { icon:'check',       percent:100,  title:'Prediction Ready!',         desc:'Your results are ready' },
    ];

    const STEP_DURATION = 1500;

    const c = containerRef.current;
    const ringFill  = c.querySelector('#nl-ringFill') as HTMLElement;
    const iconBadge = c.querySelector('#nl-iconBadge') as HTMLElement;
    const percentEl = c.querySelector('#nl-percentLabel') as HTMLElement;
    const titleEl   = c.querySelector('#nl-stepTitle') as HTMLElement;
    const descEl    = c.querySelector('#nl-stepDesc') as HTMLElement;
    const dotsEl    = c.querySelector('#nl-dotsLoading') as HTMLElement;
    const stepperEl = c.querySelector('#nl-stepper') as HTMLElement;

    const CIRC = 2 * Math.PI * 58;
    if (ringFill) {
      ringFill.style.strokeDasharray = CIRC.toString();
      ringFill.style.strokeDashoffset = CIRC.toString();
    }

    if (stepperEl && !stepperEl.children.length) {
      STEPS.forEach(() => stepperEl.appendChild(document.createElement('span')));
    }

    function sleep(ms: number){
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    function renderStep(i: number){
      const s = STEPS[i];
      const isLast = i === STEPS.length - 1;

      titleEl.classList.add('nl-fade-out');
      descEl.classList.add('nl-fade-out');
      setTimeout(() => {
        titleEl.textContent = s.title;
        descEl.textContent  = s.desc;
        titleEl.classList.remove('nl-fade-out');
        descEl.classList.remove('nl-fade-out');
      }, 180);

      iconBadge.innerHTML = ICONS[s.icon as keyof typeof ICONS];
      iconBadge.className = 'nl-icon-badge nl-step-' + i;

      if (s.percent === null){
        ringFill.style.stroke = 'transparent';
        ringFill.style.strokeDashoffset = CIRC.toString();
        percentEl.classList.remove('nl-show');
        dotsEl.style.display = 'flex';
      } else {
        dotsEl.style.display = 'none';
        ringFill.style.stroke = isLast ? '#22c55e' : '#6d5bf5';
        ringFill.style.strokeDashoffset = (CIRC - (s.percent / 100) * CIRC).toString();
        percentEl.textContent = s.percent + '%';
        percentEl.style.color = isLast ? '#22c55e' : '#6d5bf5';
        percentEl.classList.add('nl-show');
      }

      [...stepperEl.children].forEach((dot, idx) => {
        dot.classList.toggle('nl-done', idx < i);
        dot.classList.toggle('nl-active', idx === i);
      });
    }

    async function runPredictionFlow(){
      renderStep(0);

      const midSteps = [1, 2, 3, 4, 5];
      for (const idx of midSteps){
        await sleep(STEP_DURATION);
        if ((window as any).neetLoaderForceDone) break;
        renderStep(idx);
      }

      while (!(window as any).neetLoaderForceDone){
        await sleep(200);
      }

      renderStep(STEPS.length - 1); // "Prediction Ready!"
    }

    runPredictionFlow();
  }, []);

  useEffect(() => {
    if (!isPredicting) {
        (window as any).neetLoaderForceDone = true;
    } else {
        (window as any).neetLoaderForceDone = false;
    }
  }, [isPredicting]);

  return (
    <div className="neet-loader-wrapper" ref={containerRef}>
      <style dangerouslySetInnerHTML={{__html: `
        .neet-loader-wrapper {
          --ink-900:#211c4d;
          --ink-500:#6b7280;
          --violet-600:#6d5bf5;
          --violet-300:#c9c2fb;
          --violet-100:#eeecfe;
          --teal-500:#14b8a6;
          --teal-100:#e3f8f5;
          --green-500:#22c55e;
          --red-500:#ef4444;
          --red-100:#fee2e2;
          --card-bg:#ffffff;
          
          width: 100%;
          min-height: 350px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, -apple-system, sans-serif;
          position: relative;
        }
      
        .nl-loader-card {
          width: 360px;
          max-width: 100%;
          background: var(--card-bg);
          border-radius: 28px;
          padding: 44px 32px 34px;
          text-align: center;
          box-shadow: 0 20px 60px -20px rgba(76,59,177,.35), 0 2px 8px rgba(76,59,177,.08);
          position: relative;
          z-index: 10;
        }
      
        .nl-ring-wrap {
          position: relative;
          width: 128px;
          height: 128px;
          margin: 0 auto 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      
        svg.nl-ring { position: absolute; inset: 0; transform: rotate(-90deg); }
        .nl-ring-bg { fill: none; stroke: var(--violet-100); stroke-width: 7; }
        .nl-ring-fill {
          fill: none;
          stroke: var(--violet-600);
          stroke-width: 7;
          stroke-linecap: round;
          transition: stroke-dashoffset .9s cubic-bezier(.4,0,.2,1), stroke .4s ease;
        }
      
        .nl-icon-badge {
          width: 76px;
          height: 76px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--violet-100);
          color: var(--violet-600);
          transition: background .4s ease, color .4s ease;
          z-index: 1;
        }
        .nl-icon-badge svg { width: 34px; height: 34px; }
        .nl-icon-badge.nl-step-0 { background: var(--teal-100); color: var(--teal-500); }
        .nl-icon-badge.nl-step-6 { background: var(--green-500); color: #fff; }
      
        .nl-percent-label {
          height: 32px;
          font-size: 26px;
          font-weight: 800;
          color: var(--violet-600);
          opacity: 0;
          transform: translateY(-4px);
          transition: all .3s ease;
        }
        .nl-percent-label.nl-show { opacity: 1; transform: translateY(0); }
      
        .nl-dots-loading {
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .nl-dots-loading span {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--teal-500);
          animation: nl-bounce 1.2s infinite ease-in-out;
        }
        .nl-dots-loading span:nth-child(2) { animation-delay: .15s; }
        .nl-dots-loading span:nth-child(3) { animation-delay: .3s; }
        @keyframes nl-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: .4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      
        .nl-step-title {
          font-size: 19px;
          font-weight: 700;
          color: var(--ink-900);
          margin: 6px 0 6px;
          transition: opacity .25s ease, transform .25s ease;
        }
        .nl-step-desc {
          font-size: 13.5px;
          line-height: 1.5;
          color: var(--ink-500);
          margin: 0 0 26px;
          min-height: 20px;
          transition: opacity .25s ease, transform .25s ease;
        }
        .nl-fade-out { opacity: 0; transform: translateY(4px); }
      
        .nl-stepper { display: flex; justify-content: center; gap: 7px; }
        .nl-stepper span {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--violet-100);
          transition: all .35s ease;
        }
        .nl-stepper span.nl-done { background: var(--violet-300); }
        .nl-stepper span.nl-active { background: var(--violet-600); width: 20px; border-radius: 4px; }
      
        @media (prefers-reduced-motion: reduce) {
          .nl-ring-fill, .nl-icon-badge, .nl-percent-label, .nl-step-title, .nl-step-desc, .nl-stepper span {
            transition-duration: .01ms !important;
          }
          .nl-dots-loading span { animation: none; opacity: .7; }
        }
      `}}/>

      <div className="nl-loader-card">
        <div className="nl-loading-state" id="nl-loadingState">
          <div className="nl-ring-wrap">
            <svg className="nl-ring" viewBox="0 0 128 128" width="128" height="128" aria-hidden="true">
              <circle className="nl-ring-bg" cx="64" cy="64" r="58"></circle>
              <circle className="nl-ring-fill" id="nl-ringFill" cx="64" cy="64" r="58"></circle>
            </svg>
            <div className="nl-icon-badge" id="nl-iconBadge" aria-hidden="true"></div>
          </div>

          <div className="nl-percent-label" id="nl-percentLabel">0%</div>
          <div className="nl-dots-loading" id="nl-dotsLoading" aria-hidden="true"><span></span><span></span><span></span></div>

          <div aria-live="polite">
            <div className="nl-step-title" id="nl-stepTitle"></div>
            <div className="nl-step-desc" id="nl-stepDesc"></div>
          </div>

          <div className="nl-stepper" id="nl-stepper" aria-hidden="true"></div>
        </div>
      </div>
    </div>
  );
}
