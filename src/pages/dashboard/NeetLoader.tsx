import React, { useEffect, useState } from 'react';

const ITEMS: Record<string, string> = {
  flag: '<line x1="0" y1="0" x2="4" y2="-35" stroke="white" stroke-width="2.4" stroke-linecap="round"/><path d="M4,-33 L24,-29 L17,-23 L24,-17 L4,-19 Z" fill="#f02541"/>',
  magnifier: '<circle cx="10" cy="-10" r="8" fill="none" stroke="#f02541" stroke-width="3.5"/><line x1="15" y1="-5" x2="23" y2="3" stroke="#f02541" stroke-width="3.5" stroke-linecap="round"/>',
  clipboard: '<g transform="rotate(-12)"><rect x="-2" y="-20" width="20" height="24" rx="2" fill="#f02541"/><rect x="2" y="-16" width="12" height="16" fill="white"/><rect x="4" y="-23" width="8" height="5" rx="1.5" fill="#a0a0a0"/></g>',
  trophy: '<g transform="translate(-10,-35)"><path d="M2 0 h16 v6 a8 8 0 0 1 -16 0 z" fill="#facc15"/><path d="M0 2 q-6 0 -4 8 q1 4 6 4" fill="none" stroke="#facc15" stroke-width="2"/><path d="M20 2 q6 0 4 8 q-1 4 -6 4" fill="none" stroke="#facc15" stroke-width="2"/><rect x="8" y="14" width="4" height="6" fill="#facc15"/><rect x="4" y="20" width="12" height="3" rx="1" fill="#facc15"/></g>',
  none: ''
};

const ARM_POSES: Record<string, string> = {
  flag:      'M52,40 Q64,24 68,6',
  magnifier: 'M52,40 Q70,38 82,34',
  clipboard: 'M52,40 Q68,36 80,30',
  trophy:    'M52,40 Q60,20 58,2',
  none:      'M52,40 Q68,34 80,27'
};

const stages = [
  { title:'Starting Analysis...', sub:'Preparing your NEET data for prediction', ic:'subjects', item:'flag', progress:15, armsFree:false, speed:false, sparkle:false, done: false },
  { title:'Checking Latest Cutoffs...', sub:'Matching your rank with real college data', ic:'chart', item:'magnifier', progress:35, armsFree:false, speed:false, sparkle:false, done: false },
  { title:'Analyzing Seat Matrix...', sub:'Comparing categories, quotas and availability', ic:'checklist', item:'clipboard', progress:55, armsFree:false, speed:false, sparkle:false, done: false },
  { title:'Finding Best Colleges for You...', sub:'Calculating admission chances with AI', ic:'building', item:'none', progress:75, armsFree:true, speed:true, sparkle:false, done: false },
  { title:'Finalizing Your Prediction...', sub:'Almost there! Generating personalized results', ic:null, item:'trophy', progress:90, armsFree:true, speed:false, sparkle:true, done: false },
  { title:'Done!', sub:'Your NEET Prediction is Ready', ic:'done', item:'none', progress:100, armsFree: false, speed: false, sparkle: false, done:true }
];

export function NeetLoader({ isPredicting = true }: { isPredicting?: boolean }) {
  const [stageIndex, setStageIndex] = useState(0);
  const [fadeState, setFadeState] = useState('in');

  useEffect(() => {
    if (!isPredicting) {
      setStageIndex(stages.length - 1);
      return;
    }

    let i = 0;
    const interval = setInterval(() => {
      setFadeState('out');
      setTimeout(() => {
        i = Math.min(i + 1, stages.length - 2); 
        setStageIndex(i);
        setFadeState('in');
      }, 180);
    }, 1800);

    return () => clearInterval(interval);
  }, [isPredicting]);

  const s = stages[stageIndex];
  const isDone = s.done;

  return (
    <div className="neet-loader-container w-full relative flex items-center justify-center p-4 sm:p-8 bg-gradient-to-b from-[#151e32] to-[#0f1524] rounded-3xl overflow-hidden min-h-[350px]" style={{ fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
      <style dangerouslySetInnerHTML={{__html: `
        .bg-fx { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .bg-shape { position: absolute; background: rgba(255,255,255,0.015); border: 1px solid rgba(255,255,255,0.03); border-radius: 16px; backdrop-filter: blur(4px); }
        .s1 { width: 140px; height: 140px; top: 15%; left: 8%; transform: rotate(15deg); }
        .s2 { width: 100px; height: 180px; top: 25%; right: 12%; transform: rotate(-20deg); }
        .s3 { width: 200px; height: 100px; bottom: 12%; left: 20%; transform: rotate(10deg); }
        .s4 { width: 110px; height: 110px; top: 65%; right: 30%; transform: rotate(45deg); border-radius: 50%; }
        .s5 { width: 180px; height: 180px; top: -10%; right: 40%; transform: rotate(30deg); }

        .loader-wrap { display: flex; flex-direction: column; align-items: center; gap: 18px; position: relative; z-index: 1; width: 100%; max-width: 900px; }
        .neet-loader { width: 100%; position: relative; padding: 20px; }

        .headtext { text-align: center; min-height: 80px; position: relative; z-index: 5; margin-bottom: 20px; }
        .headtext h3 { margin: 0 0 8px; color: #f8fafc; font-size: 26px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 12px; }
        .done-tick { display: none; align-items: center; justify-content: center; }
        .is-done .done-tick { display: flex; }
        .headtext p { margin: 0; color: #94a3b8; font-size: 16px; }
        .sub-fade { transition: opacity 0.18s ease; }
        .sub-fade.out { opacity: 0; }
        .sub-fade.in { opacity: 1; }

        .stage-area { position: relative; height: 180px; z-index: 4; }
        .track-wrap { position: relative; height: 100%; }

        .icon-card {
          position: absolute; bottom: 95px; left: 15%; transform: translate(-50%, 0);
          width: auto; min-width: 130px; height: auto; min-height: 90px;
          background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 14px; box-shadow: 0 10px 24px rgba(0,0,0,0.5); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          transition: left 1.7s linear, opacity 0.3s ease, transform 0.3s ease, background 0.4s ease;
          opacity: 1; z-index: 10;
        }
        .icon-card.hide { opacity: 0; transform: translate(-50%, 10px) scale(0.9); }
        .icon-card .connector {
          position: absolute; top: 100%; left: 50%; width: 0; height: 75px;
          border-left: 2px dashed rgba(255,255,255,0.4); transform: translateX(-50%);
        }

        .ic-content { width: 100%; height: 100%; display: none; align-items: center; justify-content: center; }
        .ic-content.on { display: flex; }

        .subjects-stack { display: flex; flex-direction: column; gap: 8px; padding: 15px; width: 120px; }
        .book-row { position: relative; border-radius: 6px; padding: 6px 12px; font-size: 13px; font-weight: 700; color: white; }
        .book-row.red { background: #e21c35; }
        .book-row.green { background: #2f9e44; }
        .book-row.blue { background: #3b5bdb; }
        .book-row .bookmark { position: absolute; right: 12px; top: 0; width: 8px; height: 14px; background: white; border-radius: 0 0 3px 3px; }

        .checklist-box { display: flex; flex-direction: column; gap: 8px; padding: 15px; width: 130px; }
        .chk-row { display: flex; align-items: center; gap: 10px; color: white; font-size: 13px; font-weight: 600; line-height: 1; }
        .chk-circle { width: 16px; height: 16px; background: #2f9e44; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        
        .icon-card.done-orb {
          width: 140px; height: 140px; bottom: 25px; left: 50% !important;
          background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.5), inset 0 0 20px rgba(255,255,255,0.05);
          backdrop-filter: blur(10px);
        }
        .icon-card.done-orb .connector { display: none; }
        .done-tick-top {
          position: absolute; top: -14px; right: -14px; width: 34px; height: 34px; background: #2f9e44; border-radius: 50%;
          border: 3.5px solid #0f1524; display: flex; align-items: center; justify-content: center;
        }

        .runner-rig {
          position: absolute; bottom: 5px; left: 15%; width: 75px; height: 100px;
          transform: translate(-50%, 0); transition: left 1.7s linear; z-index: 15;
        }
        .runner-rig svg { width: 100%; height: 100%; overflow: visible; }
        .runner-rig .p-back-leg, .runner-rig .p-front-leg { transform-box: view-box; transform-origin: 46px 82px; }
        .runner-rig .p-back-arm, .runner-rig .p-front-arm { transform-box: view-box; transform-origin: 52px 40px; }
        .runner-rig .p-cape { transform-box: view-box; transform-origin: 50px 36px; }
        .runner-rig .p-body { transform-box: view-box; transform-origin: 50px 60px; }

        .runner-rig.running .p-back-leg { animation: swingBack .5s ease-in-out infinite; }
        .runner-rig.running .p-front-leg { animation: swingFront .5s ease-in-out infinite; }
        .runner-rig.running.arms-free .p-back-arm { animation: swingFrontArm .5s ease-in-out infinite; }
        .runner-rig.running.arms-free .p-front-arm { animation: swingBackArm .5s ease-in-out infinite; }
        .runner-rig.running:not(.arms-free) .p-back-arm { animation: swingBackSm .5s ease-in-out infinite; }
        .runner-rig.running .p-cape { animation: capeFlow .55s ease-in-out infinite; }
        .runner-rig.running > svg { animation: bodyBob .5s ease-in-out infinite; }

        @keyframes swingBack { 0% { transform: rotate(-26deg); } 50% { transform: rotate(22deg); } 100% { transform: rotate(-26deg); } }
        @keyframes swingFront { 0% { transform: rotate(22deg); } 50% { transform: rotate(-26deg); } 100% { transform: rotate(22deg); } }
        @keyframes swingFrontArm { 0% { transform: rotate(20deg); } 50% { transform: rotate(-16deg); } 100% { transform: rotate(20deg); } }
        @keyframes swingBackArm { 0% { transform: rotate(-16deg); } 50% { transform: rotate(20deg); } 100% { transform: rotate(-16deg); } }
        @keyframes swingBackSm { 0% { transform: rotate(-8deg); } 50% { transform: rotate(10deg); } 100% { transform: rotate(-8deg); } }
        @keyframes capeFlow { 0% { transform: rotate(-6deg) scaleX(1); } 50% { transform: rotate(10deg) scaleX(1.05); } 100% { transform: rotate(-6deg) scaleX(1); } }
        @keyframes bodyBob { 0% { transform: translateY(0); } 25% { transform: translateY(2px); } 50% { transform: translateY(0); } 75% { transform: translateY(2px); } 100% { transform: translateY(0); } }

        .runner-rig.idle .p-cape { animation: capeIdle 2.6s ease-in-out infinite; }
        @keyframes capeIdle { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(3deg); } }

        .speedlines { position: absolute; bottom: 30px; left: -10px; opacity: 0; transition: opacity 0.3s ease; }
        .runner-rig.show-speed .speedlines { opacity: 1; }
        .speedlines span { display: block; height: 3px; border-radius: 2px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8)); margin-bottom: 6px; animation: zap 0.4s linear infinite; }
        .speedlines span:nth-child(1) { width: 20px; }
        .speedlines span:nth-child(2) { width: 30px; animation-delay: 0.1s; }
        .speedlines span:nth-child(3) { width: 16px; animation-delay: 0.2s; }
        @keyframes zap { 0% { transform: translateX(10px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateX(-10px); opacity: 0; } }

        .sparkles { position: absolute; inset: -40px -30px auto -40px; height: 100px; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; }
        .runner-rig.show-sparkle .sparkles { opacity: 1; }
        .sparkles svg { position: absolute; animation: spark 1s ease-in-out infinite alternate; fill: white; transform-origin: center; }
        .sparkles svg:nth-child(1) { top: 10px; left: 10px; animation-delay: 0s; }
        .sparkles svg:nth-child(2) { top: 60px; left: 0px; animation-delay: 0.3s; }
        .sparkles svg:nth-child(3) { top: 20px; left: 90px; animation-delay: 0.6s; }
        @keyframes spark { 0% { transform: scale(0.3); opacity: 0; } 100% { transform: scale(1.2); opacity: 1; } }

        .dust { position: absolute; bottom: 0px; left: 10px; width: 40px; height: 16px; pointer-events: none; }
        .dust span { position: absolute; bottom: 0; width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.4); opacity: 0; }
        .runner-rig.running .dust span { animation: puff 1s ease-out infinite; }
        .dust span:nth-child(1) { left: 20px; animation-delay: 0s !important; }
        .dust span:nth-child(2) { left: 10px; animation-delay: 0.33s !important; }
        .dust span:nth-child(3) { left: 0px; animation-delay: 0.66s !important; }
        @keyframes puff { 0% { opacity: 0; transform: translate(0,0) scale(0.5); } 15% { opacity: 0.7; } 100% { opacity: 0; transform: translate(-20px,-8px) scale(1.4); } }

        .desk-person { position: absolute; bottom: -2px; right: 0; width: 100px; height: 85px; z-index: 5; }
        .desk-person svg { width: 100%; height: 100%; overflow: visible; transform: scaleX(-1); }
        .desk-person .arms-normal { display: block; }
        .desk-person .arms-cheer { display: none; }
        .desk-person.cheer .arms-normal { display: none; }
        .desk-person.cheer .arms-cheer { display: block; }

        .thumbs-bubble {
          position: absolute; top: -15px; right: 25px; width: 32px; height: 32px; background: white;
          border-radius: 8px 8px 2px 8px; display: none; align-items: center; justify-content: center;
          box-shadow: 0 6px 14px rgba(0,0,0,0.4); animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); z-index: 6;
        }
        .thumbs-bubble.show { display: flex; }
        .thumbs-bubble svg { width: 18px; height: 18px; fill: #0f1524; }
        @keyframes popIn { 0% { transform: scale(0); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }

        .track { position: relative; height: 18px; border-radius: 9px; background: rgba(255,255,255,0.05); margin-top: 15px; z-index: 3; overflow: visible; }
        .track-fill { position: absolute; top: 0; left: 0; bottom: 0; border-radius: 9px; background: #f02541; box-shadow: 0 0 16px rgba(240, 37, 65, 0.6); transition: width 1.7s linear; }
        .track-head { position: absolute; right: 0; top: 50%; transform: translate(50%, -50%); width: 12px; height: 12px; background: white; border-radius: 50%; box-shadow: 0 0 12px rgba(255,255,255,0.9); }
        .is-done .track-head { display: none; }
        
        .track-100 { position: absolute; right: 15px; top: 50%; transform: translateY(-50%); color: white; font-weight: bold; font-size: 12px; opacity: 0; transition: opacity 0.5s; z-index: 5; }
        .is-done .track-100 { opacity: 1; transition-delay: 1.5s; }
      `}}/>

      <div className="bg-fx">
        <div className="bg-shape s1"></div>
        <div className="bg-shape s2"></div>
        <div className="bg-shape s3"></div>
        <div className="bg-shape s4"></div>
        <div className="bg-shape s5"></div>
      </div>

      <div className="loader-wrap">
        <div className={`neet-loader ${isDone ? 'is-done' : ''}`}>
          
          <div className="headtext">
            <h3>
              <span className="done-tick">
                <svg viewBox="0 0 24 24" width="28" height="28">
                  <circle cx="12" cy="12" r="11" fill="#2f9e44"/>
                  <path d="M7 12l3 3l7-7" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span className={`sub-fade ${fadeState}`}>{s.title}</span>
            </h3>
            <p className={`sub-fade ${fadeState}`}>{s.sub}</p>
          </div>

          <div className="stage-area">
            <div className="track-wrap">

              <div className={`icon-card ${s.ic ? '' : 'hide'} ${isDone ? 'done-orb' : ''}`} style={{ left: isDone ? '50%' : `${s.progress}%` }}>
                
                <div className={`ic-content ${s.ic === 'subjects' ? 'on' : ''}`}>
                  <div className="subjects-stack">
                    <div className="book-row red">Physics<div className="bookmark"></div></div>
                    <div className="book-row green">Chemistry<div className="bookmark"></div></div>
                    <div className="book-row blue">Biology<div className="bookmark"></div></div>
                  </div>
                </div>
                
                <div className={`ic-content ${s.ic === 'chart' ? 'on' : ''}`}>
                  <svg viewBox="0 0 100 80" width="100" height="80">
                    <polyline points="15,10 15,70 95,70" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round"/>
                    <rect x="25" y="45" width="14" height="25" fill="white" rx="2"/>
                    <rect x="50" y="25" width="14" height="45" fill="white" rx="2"/>
                    <rect x="75" y="35" width="14" height="35" fill="white" rx="2"/>
                    <polyline points="32,30 57,15 82,10" fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinejoin="round"/>
                    <circle cx="32" cy="30" r="5" fill="#3b82f6"/>
                    <circle cx="57" cy="15" r="5" fill="#3b82f6"/>
                    <circle cx="82" cy="10" r="5" fill="#3b82f6"/>
                  </svg>
                </div>
                
                <div className={`ic-content ${s.ic === 'checklist' ? 'on' : ''}`}>
                  <div className="checklist-box">
                    <div className="chk-row"><div className="chk-circle"><svg viewBox="0 0 12 12" width="10" height="10"><path d="M3 6l2 2l4-4" stroke="white" strokeWidth="2" fill="none"/></svg></div>AIQ</div>
                    <div className="chk-row"><div className="chk-circle"><svg viewBox="0 0 12 12" width="10" height="10"><path d="M3 6l2 2l4-4" stroke="white" strokeWidth="2" fill="none"/></svg></div>State Quota</div>
                    <div className="chk-row"><div className="chk-circle"><svg viewBox="0 0 12 12" width="10" height="10"><path d="M3 6l2 2l4-4" stroke="white" strokeWidth="2" fill="none"/></svg></div>Category</div>
                    <div className="chk-row"><div className="chk-circle"><svg viewBox="0 0 12 12" width="10" height="10"><path d="M3 6l2 2l4-4" stroke="white" strokeWidth="2" fill="none"/></svg></div>Density</div>
                  </div>
                </div>
                
                <div className={`ic-content ${s.ic === 'building' ? 'on' : ''}`}>
                  <svg viewBox="0 0 100 80" width="100" height="80">
                    <defs>
                      <filter id="b-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter>
                    </defs>
                    <circle cx="50" cy="40" r="24" fill="#facc15" filter="url(#b-glow)" opacity="0.4"/>
                    <circle cx="25" cy="50" r="14" fill="#2f9e44"/>
                    <circle cx="75" cy="50" r="14" fill="#2f9e44"/>
                    <polygon points="50,15 85,35 15,35" fill="white"/>
                    <rect x="15" y="38" width="70" height="6" fill="white"/>
                    <rect x="22" y="47" width="8" height="22" fill="white"/>
                    <rect x="38" y="47" width="8" height="22" fill="white"/>
                    <rect x="54" y="47" width="8" height="22" fill="white"/>
                    <rect x="70" y="47" width="8" height="22" fill="white"/>
                    <rect x="10" y="72" width="80" height="6" fill="white"/>
                  </svg>
                </div>
                
                <div className={`ic-content ${s.ic === 'done' ? 'on' : ''}`}>
                  <div className="done-tick-top">
                    <svg viewBox="0 0 24 24" width="20" height="20"><path d="M5 12l4 4l9-9" stroke="white" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <svg viewBox="0 0 100 100" width="90" height="90">
                    <polygon points="50,20 85,35 50,50 15,35" fill="white"/>
                    <path d="M 30,42 L 30,60 C 30,65 70,65 70,60 L 70,42" fill="white"/>
                    <path d="M 50,35 L 85,60" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    <circle cx="85" cy="63" r="4" fill="white"/>
                    <path d="M 15,50 C 15,95 85,95 85,50" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round"/>
                    <circle cx="12" cy="46" r="5" fill="white"/>
                    <circle cx="88" cy="46" r="5" fill="white"/>
                    <path d="M 50,83 L 50,95" stroke="white" strokeWidth="4" strokeLinecap="round"/>
                    <circle cx="50" cy="99" r="6" fill="white" stroke="#0f1524" strokeWidth="3"/>
                  </svg>
                </div>

                <div className="connector"></div>
              </div>

              <div className={`runner-rig ${isDone ? 'idle' : 'running'} ${s.armsFree ? 'arms-free' : ''} ${s.speed ? 'show-speed' : ''} ${s.sparkle ? 'show-sparkle' : ''}`} style={{ left: isDone ? '86%' : `${s.progress}%` }}>
                <svg viewBox="0 0 100 140">
                  <g className="p-cape">
                    <path d="M50,34 C30,40 0,46 -10,70 C5,62 20,58 40,56 C36,64 30,72 20,80 C35,76 45,66 54,52 C56,46 55,39 50,34 Z" fill="#f02541"/>
                  </g>
                  <g className="p-back-leg"><path d="M46,82 Q30,104 18,127" stroke="#f02541" strokeWidth="15" strokeLinecap="round" fill="none"/></g>
                  <g className="p-front-leg"><path d="M46,82 Q62,102 74,126" stroke="#f02541" strokeWidth="15" strokeLinecap="round" fill="none"/></g>
                  <g className="p-body">
                    <path d="M52,40 L46,82" stroke="#f02541" strokeWidth="19" strokeLinecap="round"/>
                    <circle cx="55" cy="23" r="12" fill="#f02541"/>
                    <path d="M45,13 C39,8 34,9 32,14 C37,13 42,13.5 45,16 Z" fill="#f02541"/>
                  </g>
                  <g className="p-back-arm"><path d="M52,40 Q36,50 25,63" stroke="#f02541" strokeWidth="11" strokeLinecap="round" fill="none"/></g>
                  <g className="p-front-arm">
                    <path d={isDone ? ARM_POSES.none : (ARM_POSES[s.item] || ARM_POSES.none)} stroke="#f02541" strokeWidth="11" strokeLinecap="round" fill="none"/>
                    <g className="held-item" transform={isDone ? 'translate(58,2)' : `translate(${ARM_POSES[s.item]?.match(/(-?\\d+(?:\\.\\d+)?),(-?\\d+(?:\\.\\d+)?)\\s*$/)?.[1] || 80},${ARM_POSES[s.item]?.match(/(-?\\d+(?:\\.\\d+)?),(-?\\d+(?:\\.\\d+)?)\\s*$/)?.[2] || 27})`} dangerouslySetInnerHTML={{ __html: isDone ? '' : ITEMS[s.item] || '' }}></g>
                  </g>
                </svg>

                <div className="speedlines"><span></span><span></span><span></span></div>
                <div className="sparkles">
                  <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"/></svg>
                  <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"/></svg>
                  <svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"/></svg>
                </div>
                <div className="dust"><span></span><span></span><span></span></div>
              </div>

              <div className={`desk-person ${isDone ? 'cheer' : ''}`}>
                <svg viewBox="0 0 90 70">
                  <g transform="translate(90, 0) scale(-1, 1)">
                    <line x1="12" y1="14" x2="12" y2="58" stroke="white" strokeWidth="4" strokeLinecap="round"/>
                    <line x1="12" y1="34" x2="22" y2="34" stroke="white" strokeWidth="4" strokeLinecap="round"/>
                    <circle cx="20" cy="10" r="7" fill="white"/>
                    <line x1="20" y1="17" x2="20" y2="34" stroke="white" strokeWidth="5" strokeLinecap="round"/>
                    <g className="arms-normal">
                      <path d="M20,20 L40,29" stroke="white" strokeWidth="4.5" strokeLinecap="round" fill="none"/>
                    </g>
                    <g className="arms-cheer">
                      <path d="M20,20 L8,6 M20,20 L34,8" stroke="white" strokeWidth="4.5" strokeLinecap="round" fill="none"/>
                    </g>
                    <path d="M20,34 L32,34 L32,58" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    <path d="M38,30 L76,30" stroke="white" strokeWidth="4" strokeLinecap="round"/>
                    <line x1="68" y1="30" x2="68" y2="58" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
                    <path d="M44,29 L58,29 L58,32 L44,32 Z" fill="white"/>
                    <path d="M44,29 L46,17 L58,20 L58,29 Z" fill="white"/>
                  </g>
                </svg>
                <div className={`thumbs-bubble ${isDone ? 'show' : ''}`}>
                  <svg viewBox="0 0 24 24"><path d="M2,9 L2,21 L8,21 L8,9 L2,9 Z M10,9 L10,21 L19.46,21 C20.31,21 21.05,20.47 21.32,19.68 L23.9,13.68 C23.96,13.48 24,13.25 24,13 L24,11 C24,9.9 23.1,9 22,9 L15.54,9 L16.51,4.35 L16.54,4.04 C16.54,3.63 16.37,3.24 16.09,2.96 L15.13,2 L8.57,8.57 C8.21,8.93 8,9.44 8,10 L10,9 Z"/></svg>
                </div>
              </div>

            </div>
          </div>

          <div className="track">
            <div className="track-fill" style={{ width: `${s.progress}%` }}>
              <div className="track-head"></div>
            </div>
            <div className="track-100">100%</div>
          </div>

        </div>
      </div>
    </div>
  );
}
