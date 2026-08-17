import React, { useEffect, useRef } from 'react';

export function NeetLoader({ isPredicting = true }: { isPredicting?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const STAGES = [
      { title:"Starting Analysis…", subtitle:"Preparing your NEET data for prediction", icon:"books", prop:"flag", target:17, duration:2200 },
      { title:"Checking Latest Cutoffs…", subtitle:"Matching your rank with real college data", icon:"chart", prop:"magnifier", target:35, duration:1900 },
      { title:"Analyzing Seat Matrix…", subtitle:"Comparing categories, quotas and availability", icon:"checklist", prop:"clipboard", target:55, duration:2000 },
      { title:"Finding Best Colleges for You…", subtitle:"Calculating admission chances with AI", icon:"building", prop:"speed", target:74, duration:1900 },
      { title:"Finalizing Your Prediction…", subtitle:"Almost there! Generating personalized results", icon:"building", prop:"trophy", target:96, duration:2100 },
      { title:"Done!", subtitle:"Your NEET Prediction is Ready", icon:"done", target:100, duration:900, done:true }
    ];

    const ICONS = {
      chart:`<svg viewBox="0 0 40 40" fill="none"><line x1="6" y1="32" x2="34" y2="32" stroke="#c7d0e0" stroke-width="2" stroke-linecap="round"/><rect x="9" y="22" width="4.2" height="10" rx="1" fill="#c7d0e0"/><rect x="16" y="16" width="4.2" height="16" rx="1" fill="#e7ecf5"/><rect x="23" y="24" width="4.2" height="8" rx="1" fill="#c7d0e0"/><rect x="30" y="12" width="4.2" height="20" rx="1" fill="#f7f9fc"/><polyline points="10,20 18,14 25,18 32,8" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="20" r="1.8" fill="#fff"/><circle cx="18" cy="14" r="1.8" fill="#fff"/><circle cx="25" cy="18" r="1.8" fill="#fff"/><circle cx="32" cy="8" r="1.8" fill="#fff"/></svg>`,
      building:`<svg viewBox="0 0 40 40" fill="none"><polygon points="6,15 20,5 34,15" fill="#f7f9fc"/><line x1="20" y1="5" x2="20" y2="1" stroke="#f7f9fc" stroke-width="1.6"/><polygon points="20,1 25,2.5 20,4" fill="#f7f9fc"/><rect x="5" y="15" width="30" height="3.4" fill="#f7f9fc"/><rect x="8.5" y="19.5" width="3" height="11" fill="#c7d0e0"/><rect x="15" y="19.5" width="3" height="11" fill="#c7d0e0"/><rect x="22" y="19.5" width="3" height="11" fill="#c7d0e0"/><rect x="28.5" y="19.5" width="3" height="11" fill="#c7d0e0"/><rect x="4" y="31" width="32" height="3.6" rx="1" fill="#f7f9fc"/></svg>`
    };

    const BOOKS = `
      <div class="info-card">
        <div class="info-row"><span class="swatch" style="background:#a3475a"></span>Physics <svg class="chk" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#22c55e"/><path d="M5.5 10.2l2.6 2.6L14.5 7" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <div class="info-row"><span class="swatch" style="background:#3f7d68"></span>Chemistry <svg class="chk" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#22c55e"/><path d="M5.5 10.2l2.6 2.6L14.5 7" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <div class="info-row"><span class="swatch" style="background:#465a86"></span>Biology <svg class="chk" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#22c55e"/><path d="M5.5 10.2l2.6 2.6L14.5 7" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      </div>`;
    const CHECKLIST = `
      <div class="info-card">
        ${["AIQ","State Quota","Category","Density"].map(t=>`<div class="info-row"><svg class="chk" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#22c55e"/><path d="M5.5 10.2l2.6 2.6L14.5 7" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>${t}</div>`).join("")}
      </div>`;

    const PROPS = {
      flag:`<rect x="-1.6" y="-34" width="3.2" height="34" rx="1.4" fill="var(--red-body)"/><path d="M0,-34 L20,-27 L0,-20 Z" fill="var(--red-body)"/>`,
      magnifier:`<circle cx="4" cy="-13" r="8" fill="none" stroke="var(--red-body)" stroke-width="4"/><line x1="9.5" y1="-7.5" x2="16" y2="-1" stroke="var(--red-body)" stroke-width="4.2" stroke-linecap="round"/>`,
      clipboard:`<rect x="-11" y="-30" width="22" height="27" rx="3" fill="var(--red-body)"/><rect x="-4.5" y="-34" width="9" height="6.5" rx="2" fill="var(--red-cape)"/><line x1="-6.5" y1="-19" x2="6.5" y2="-19" stroke="var(--red-cape)" stroke-width="2" stroke-linecap="round"/><line x1="-6.5" y1="-14.5" x2="6.5" y2="-14.5" stroke="var(--red-cape)" stroke-width="2" stroke-linecap="round"/><line x1="-6.5" y1="-10" x2="2.5" y2="-10" stroke="var(--red-cape)" stroke-width="2" stroke-linecap="round"/>`,
      trophy:`<path d="M-8,-30 L8,-30 L7,-19 C7,-13 3,-9 0,-9 C-3,-9 -7,-13 -7,-19 Z" fill="var(--red-body)"/><path d="M-8,-28 C-14,-28 -14,-19 -7,-17" fill="none" stroke="var(--red-body)" stroke-width="2.2"/><path d="M8,-28 C14,-28 14,-19 7,-17" fill="none" stroke="var(--red-body)" stroke-width="2.2"/><rect x="-2.2" y="-9" width="4.4" height="6" fill="var(--red-body)"/><rect x="-7" y="-3" width="14" height="3.6" rx="1.4" fill="var(--red-body)"/>`
    };

    const c = containerRef.current;
    const el = (id: string) => c.querySelector(`#${id}`) as HTMLElement;
    const badge=el('nl-badge'), header=el('nl-header'), title=el('nl-title'), subtitle=el('nl-subtitle'),
          iconAnchor=el('nl-iconAnchor'), iconSlot=el('nl-iconSlot'), connector=el('nl-connector'),
          connectorDot=el('nl-connectorDot'), runnerWrap=el('nl-runnerWrap'), runnerFigure=el('nl-runnerFigure'),
          propSlot=el('nl-propSlot'), deskPerson=el('nl-deskPerson'), pedestal=el('nl-pedestal'),
          fill=el('nl-fill'), percentLabel=el('nl-percentLabel'), card=el('nl-card'), sparkles=el('nl-sparkles');

    if (!sparkles.children.length) {
      for(let i=0;i<7;i++){
        const s=document.createElement('span');
        s.textContent='✦';
        s.style.left=(10+Math.random()*80)+'%';
        s.style.top=(10+Math.random()*70)+'%';
        s.style.fontSize=(10+Math.random()*10)+'px';
        s.style.animationDelay=(Math.random()*1.8)+'s';
        sparkles.appendChild(s);
      }
    }

    let stageIdx=-1, currentPct=0, loopTimer: any = null;

    function setIcon(stage: any){
      if(stage.icon==='books'){ iconSlot.innerHTML=BOOKS; }
      else if(stage.icon==='checklist'){ iconSlot.innerHTML=CHECKLIST; }
      else {
        const glow = stage.icon==='building' ? 'glow-gold' : '';
        iconSlot.innerHTML = `<div class="icon-tile ${glow}">${ICONS[stage.icon as keyof typeof ICONS]}</div>`;
      }
    }

    function setProp(stage: any){
      runnerFigure.classList.remove('mode-speed');
      propSlot.innerHTML='';
      if(stage.prop==='speed'){
        runnerWrap.classList.add('mode-speed');
      } else {
        runnerWrap.classList.remove('mode-speed');
        if(stage.prop && PROPS[stage.prop as keyof typeof PROPS]) propSlot.innerHTML=PROPS[stage.prop as keyof typeof PROPS];
      }
    }

    function measureRunTravel(){
      if (!runnerWrap.parentElement) return 0;
      const visualW = runnerWrap.parentElement.getBoundingClientRect().width;
      const runnerW = runnerWrap.getBoundingClientRect().width;
      const deskW = deskPerson.getBoundingClientRect().width;
      return Math.max(0, visualW - runnerW - deskW - 34);
    }
    function measureStandX(){
      if (!runnerWrap.parentElement) return 0;
      const visualW = runnerWrap.parentElement.getBoundingClientRect().width;
      const runnerW = runnerWrap.getBoundingClientRect().width;
      const deskW = deskPerson.getBoundingClientRect().width;
      return Math.max(0, visualW - runnerW - deskW - 46);
    }

    function playStage(i: number){
      stageIdx=i;
      const stage=STAGES[i];

      badge.textContent = stage.done ? '' : String(i+1);
      if(stage.done){
        badge.innerHTML = `<svg viewBox="0 0 20 20" width="16" height="16"><path d="M4 10.5L8 14.5L16 5" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        badge.style.background = 'linear-gradient(150deg,#2fbf6a,#159a52)';
      } else {
        badge.style.background = 'linear-gradient(150deg,var(--badge-a),var(--badge-b))';
      }
      badge.classList.remove('pulse'); void badge.offsetWidth; badge.classList.add('pulse');

      header.classList.add('fade');
      setTimeout(()=>{
        title.innerHTML = stage.done ? `<svg class="check-ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#22c55e"/><path d="M7 12.5l3.2 3.2L17 8.5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>${stage.title}` : stage.title;
        subtitle.textContent = stage.subtitle;
        header.classList.remove('fade');
      }, 180);

      if(stage.done){
        iconAnchor.classList.add('hide');
        pedestal.classList.add('show');
        deskPerson.className='desk-person pose-done';
        percentLabel.classList.add('show');
        runnerFigure.classList.remove('running');
        runnerFigure.classList.add('standing');
        runnerWrap.style.setProperty('--dur', stage.duration+'ms');
        const standX = measureStandX();
        runnerWrap.style.transform = `translateX(${standX}px)`;
      } else {
        iconAnchor.classList.remove('hide');
        pedestal.classList.remove('show');
        deskPerson.className = i===4 ? 'desk-person pose-cheer' : 'desk-person pose-normal';
        percentLabel.classList.remove('show');
        runnerFigure.classList.add('running');
        runnerFigure.classList.remove('standing');
        setTimeout(()=>{ setIcon(stage); setProp(stage); }, 160);

        runnerWrap.style.setProperty('--dur','0ms');
        runnerWrap.style.transform='translateX(0px)';
        void runnerWrap.offsetWidth;
        const travel = measureRunTravel();
        runnerWrap.style.setProperty('--dur', stage.duration+'ms');
        requestAnimationFrame(()=>{
          runnerWrap.style.transform = `translateX(${travel}px)`;
        });
      }

      const endPct=stage.target;
      fill.style.setProperty('--dur', stage.duration+'ms');
      void fill.offsetWidth;
      fill.style.width = endPct+'%';
      percentLabel.textContent = endPct+'%';
      currentPct = endPct;

      clearTimeout(loopTimer);
      loopTimer=setTimeout(()=>{
        if(i+1<STAGES.length && !(window as any).neetLoaderForceDone){ playStage(i+1); }
        else if ((window as any).neetLoaderForceDone) {
            playStage(5);
        } else {
          loopTimer=setTimeout(restart, 2600);
        }
      }, stage.duration + 90);
    }

    function restart(){
      card.classList.add('resetting');
      setTimeout(()=>{
        currentPct=0;
        fill.style.setProperty('--dur','0ms');
        fill.style.width='0%';
        card.classList.remove('resetting');
        playStage(0);
      }, 260);
    }

    function start(){ 
        (window as any).neetLoaderForceDone = false;
        currentPct=0; 
        playStage(0); 
    }

    (window as any).NeetLoaderFn = { start, playStage, restart, stages:STAGES };
    
    start();

    const resizeHandler = () => {
      if(stageIdx<0) return;
      const stage=STAGES[stageIdx];
      runnerWrap.style.setProperty('--dur','0ms');
      if(stage.done){ runnerWrap.style.transform = `translateX(${measureStandX()}px)`; }
    };
    window.addEventListener('resize', resizeHandler);

    return () => {
        clearTimeout(loopTimer);
        window.removeEventListener('resize', resizeHandler);
    }
  }, []);

  useEffect(() => {
    if (!isPredicting) {
        (window as any).neetLoaderForceDone = true;
        if ((window as any).NeetLoaderFn) {
            (window as any).NeetLoaderFn.playStage(5);
        }
    } else {
        (window as any).neetLoaderForceDone = false;
        if ((window as any).NeetLoaderFn) {
            (window as any).NeetLoaderFn.start();
        }
    }
  }, [isPredicting]);

  return (
    <div className="neet-loader-wrapper" ref={containerRef}>
      <style dangerouslySetInnerHTML={{__html: `
        .neet-loader-wrapper {
          --black:#000000;
          --card-bg:#040814;
          --card-bg-2:#070c1c;
          --card-border:rgba(148,163,184,.14);
          --tile-bg:#0c1226;
          --tile-border:rgba(148,163,184,.16);
          --badge-a:#4b5493;
          --badge-b:#2c3260;
          --red-1:#ff3b62;
          --red-2:#e21b49;
          --red-3:#c1123a;
          --red-shadow:#7c0b28;
          --red-body:#e0203f;
          --red-cape:#a81232;
          --white:#f7f9fc;
          --dim:#8b96ab;
          --green:#22c55e;
          --gold:#f5b942;
          --track-h: 18px;
          
          width: 100%;
          min-height: 350px;
          background: var(--card-bg-2);
          border-radius: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          overflow: hidden;
          padding: 24px;
          position: relative;
        }
      
        .stage-bg{
          position:relative;
          width:100%;
          max-width:760px;
          display:flex;
          align-items:center;
          justify-content:center;
        }
      
        /* ---------- ambient skyline backdrop ---------- */
        .skyline{
          position:absolute;
          inset:-40px -40px auto -40px;
          height:340px;
          opacity:.35;
          pointer-events:none;
          z-index:0;
        }
      
        /* ---------- card ---------- */
        .loader-card{
          position:relative;
          z-index:1;
          width:100%;
          background: radial-gradient(120% 140% at 15% 0%, var(--card-bg-2) 0%, var(--card-bg) 55%);
          border:1px solid var(--card-border);
          border-radius:22px;
          padding:26px clamp(18px,4vw,34px) 24px;
          box-shadow:0 30px 70px -20px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.03);
          opacity:0;
          transform:translateY(10px) scale(.985);
          animation:cardIn .6s cubic-bezier(.2,.7,.3,1) forwards;
        }
        @keyframes cardIn{to{opacity:1;transform:translateY(0) scale(1);}}
        .loader-card.resetting{animation:cardBlink .5s ease;}
        @keyframes cardBlink{0%,100%{opacity:1;}50%{opacity:.55;}}
      
        /* ---------- badge ---------- */
        .nl-badge{
          position:absolute;
          top:20px; left:20px;
          width:32px; height:32px;
          border-radius:50%;
          background:linear-gradient(150deg,var(--badge-a),var(--badge-b));
          display:flex;align-items:center;justify-content:center;
          font-weight:700; font-size:14px; color:var(--white);
          box-shadow:0 4px 10px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.15);
          z-index:3;
          transition:transform .3s ease;
        }
        .nl-badge.pulse{animation:badgePop .45s cubic-bezier(.3,1.5,.4,1);}
        @keyframes badgePop{0%{transform:scale(.4) rotate(-20deg);}70%{transform:scale(1.18);}100%{transform:scale(1);}}
      
        /* ---------- header ---------- */
        .nl-header{
          text-align:center;
          padding:2px 40px 0;
          min-height:56px;
        }
        .nl-title{
          margin:0;
          font-size:clamp(17px,2.6vw,22px);
          font-weight:700;
          color:var(--white);
          letter-spacing:-.01em;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          transition:opacity .28s ease, transform .28s ease;
        }
        .nl-title .check-ico{width:22px;height:22px;flex:none;}
        .nl-subtitle{
          margin:6px 0 0;
          font-size:clamp(12px,1.6vw,14px);
          color:var(--dim);
          font-weight:400;
          transition:opacity .28s ease, transform .28s ease;
        }
        .nl-header.fade .nl-title, .nl-header.fade .nl-subtitle{opacity:0;transform:translateY(-4px);}
      
        /* ---------- stage visual area ---------- */
        .stage-visual{
          position:relative;
          height:172px;
          margin-top:10px;
        }
      
        /* floating info anchor */
        .icon-anchor{
          position:absolute;
          left:6%;
          top:2px;
          display:flex;
          flex-direction:column;
          align-items:center;
          transition:opacity .25s ease, transform .25s ease;
        }
        .icon-anchor.hide{opacity:0;transform:translateY(-6px) scale(.94);pointer-events:none;}
      
        .icon-tile{
          width:60px;height:60px;
          border-radius:16px;
          background:linear-gradient(150deg,var(--tile-bg),#070a17);
          border:1px solid var(--tile-border);
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 8px 20px rgba(0,0,0,.4);
          animation:tileFloat 2.6s ease-in-out infinite;
        }
        .icon-tile.glow-gold{box-shadow:0 0 26px 2px rgba(245,185,66,.35), 0 8px 20px rgba(0,0,0,.4);}
        .icon-tile svg{width:34px;height:34px;}
        @keyframes tileFloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-5px);}}
      
        .info-card{
          background:linear-gradient(150deg,var(--tile-bg),#070a17);
          border:1px solid var(--tile-border);
          border-radius:14px;
          padding:9px 14px;
          box-shadow:0 8px 20px rgba(0,0,0,.4);
          animation:tileFloat 2.6s ease-in-out infinite;
        }
        .info-row{
          display:flex;align-items:center;gap:10px;
          font-size:12.5px;color:var(--white);font-weight:500;
          padding:3px 0;
          white-space:nowrap;
        }
        .info-row .chk{width:15px;height:15px;flex:none;}
        .info-row .swatch{width:8px;height:8px;border-radius:3px;flex:none;}
      
        .nl-connector{
          width:0;
          border-left:2px dashed rgba(148,163,184,.4);
          height:38px;
          margin-top:2px;
          transition:height .2s ease, opacity .2s ease;
        }
        .connector-dot{
          width:8px;height:8px;border-radius:50%;
          background:var(--white);
          margin-left:-5px;
          box-shadow:0 0 0 0 rgba(255,255,255,.5);
          animation:dotPulse 1.6s ease-out infinite;
        }
        @keyframes dotPulse{
          0%{box-shadow:0 0 0 0 rgba(255,255,255,.45);}
          70%{box-shadow:0 0 0 9px rgba(255,255,255,0);}
          100%{box-shadow:0 0 0 0 rgba(255,255,255,0);}
        }
      
        /* ---------- runner ---------- */
        .runner-wrap{
          position:absolute;
          bottom:12px; left:0;
          width:64px; height:96px;
          transform:translateX(0);
          z-index:2;
        }
        .runner-shadow{
          position:absolute;
          bottom:-8px; left:50%;
          width:52px;height:10px;
          background:radial-gradient(closest-side, rgba(0,0,0,.55), transparent 75%);
          transform:translateX(-50%);
        }
        .runner-figure{width:100%;height:100%;overflow:visible;}
        .runner-figure .limb, .runner-figure .torso-grp, .runner-figure .cape-grp{
          transform-box:view-box;
        }
        .runner-figure .leg-back{transform-origin:46px 88px;}
        .runner-figure .leg-front{transform-origin:46px 88px;}
        .runner-figure .arm-back{transform-origin:50px 40px;}
        .runner-figure .arm-front{transform-origin:50px 40px;}
        .runner-figure .torso-grp{transform-origin:50px 65px;}
        .runner-figure .cape-grp{transform-origin:44px 44px;}
      
        .runner-figure.running .leg-front{animation:legFront .42s infinite ease-in-out;}
        .runner-figure.running .leg-back{animation:legBack .42s infinite ease-in-out;}
        .runner-figure.running .arm-front{animation:armFront .42s infinite ease-in-out;}
        .runner-figure.running .arm-back{animation:armBack .42s infinite ease-in-out;}
        .runner-figure.running .torso-grp{animation:torsoBob .42s infinite ease-in-out;}
        .runner-figure.running .cape-grp{animation:capeFlow .42s infinite ease-in-out;}
      
        @keyframes legFront{0%,100%{transform:rotate(34deg);}50%{transform:rotate(-28deg);}}
        @keyframes legBack{0%,100%{transform:rotate(-28deg);}50%{transform:rotate(34deg);}}
        @keyframes armFront{0%,100%{transform:rotate(-30deg);}50%{transform:rotate(30deg);}}
        @keyframes armBack{0%,100%{transform:rotate(30deg);}50%{transform:rotate(-30deg);}}
        @keyframes torsoBob{0%,100%{transform:translateY(0) rotate(-4deg);}50%{transform:translateY(-4px) rotate(-7deg);}}
        @keyframes capeFlow{0%,100%{transform:rotate(6deg) skewX(-4deg);}50%{transform:rotate(-6deg) skewX(4deg);}}
      
        .runner-figure.standing .leg-front{transform:rotate(3deg);}
        .runner-figure.standing .leg-back{transform:rotate(-3deg);}
        .runner-figure.standing .arm-front{transform:rotate(18deg);}
        .runner-figure.standing .arm-back{transform:rotate(-10deg);}
        .runner-figure.standing .torso-grp{transform:rotate(2deg);}
        .runner-figure.standing .cape-grp{animation:capeIdle 2.6s infinite ease-in-out;}
        @keyframes capeIdle{0%,100%{transform:rotate(3deg);}50%{transform:rotate(-2deg);}}
      
        .runner-wrap{transition:transform var(--dur,2s) cubic-bezier(.45,.05,.2,1);}
      
        .speed-lines{position:absolute;left:-34px;top:38px;display:none;flex-direction:column;gap:7px;}
        .mode-speed .speed-lines{display:flex;}
        .speed-lines span{
          display:block;height:3px;border-radius:2px;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.55));
          animation:speedGo .5s infinite linear;
        }
        .speed-lines span:nth-child(1){width:26px;animation-delay:0s;}
        .speed-lines span:nth-child(2){width:18px;animation-delay:.12s;}
        .speed-lines span:nth-child(3){width:22px;animation-delay:.24s;}
        @keyframes speedGo{0%{opacity:0;transform:translateX(10px);}30%{opacity:1;}100%{opacity:0;transform:translateX(-14px);}}
      
        /* ---------- desk person ---------- */
        .desk-person{
          position:absolute;
          right:1%; bottom:12px;
          width:104px;height:100px;
          z-index:2;
        }
        .desk-person svg{width:100%;height:100%;overflow:visible;}
        .pose-cheer .pose-normal-parts{display:none;}
        .pose-cheer .pose-cheer-parts{display:block;}
        .pose-normal .pose-cheer-parts{display:none;}
        .pose-normal .pose-normal-parts{display:block;}
        .bubble{opacity:0;transform:translateY(6px) scale(.8);transition:opacity .3s ease,transform .3s ease;}
        .pose-done .bubble{opacity:1;transform:translateY(0) scale(1);}
        .pose-done .pose-cheer-parts{display:block;}
        .pose-done .pose-normal-parts{display:none;}
      
        /* ---------- pedestal (Done state) ---------- */
        .pedestal-wrap{
          position:absolute;
          left:50%; bottom:6px;
          transform:translateX(-50%) scale(.7);
          opacity:0;
          transition:opacity .5s ease, transform .5s cubic-bezier(.3,1.4,.35,1);
          pointer-events:none;
          text-align:center;
        }
        .pedestal-wrap.show{opacity:1;transform:translateX(-50%) scale(1);}
        .ray{
          position:absolute;left:50%;top:44%;
          width:220px;height:220px;
          transform:translate(-50%,-50%);
          background: repeating-conic-gradient(from 0deg, rgba(255,255,255,.16) 0deg 4deg, transparent 4deg 18deg);
          border-radius:50%;
          mask:radial-gradient(circle, rgba(0,0,0,.9) 18%, transparent 62%);
          -webkit-mask:radial-gradient(circle, rgba(0,0,0,.9) 18%, transparent 62%);
          animation:raySpin 12s linear infinite;
        }
        @keyframes raySpin{to{transform:translate(-50%,-50%) rotate(360deg);}}
        .glass-box{
          position:relative;
          width:112px;height:100px;
          border-radius:18px 18px 10px 10px;
          background:linear-gradient(155deg, rgba(120,150,210,.22), rgba(30,40,70,.28));
          border:1px solid rgba(255,255,255,.35);
          box-shadow:0 0 40px 6px rgba(120,170,255,.35), inset 0 0 20px rgba(255,255,255,.08);
          display:flex;align-items:center;justify-content:center;
          backdrop-filter:blur(1px);
        }
        .glass-box svg{width:64px;height:64px;filter:drop-shadow(0 0 8px rgba(255,255,255,.6));}
        .glass-check{
          position:absolute; top:-9px; right:-9px;
          width:22px;height:22px;border-radius:50%;
          background:rgba(20,26,46,.9);
          border:1px solid rgba(255,255,255,.4);
          display:flex;align-items:center;justify-content:center;
        }
        .glass-check svg{width:12px;height:12px;}
        .pedestal-base{
          width:128px;height:16px;margin:6px auto 0;
          border-radius:50%;
          background:radial-gradient(closest-side, rgba(130,170,255,.55), rgba(130,170,255,0) 72%);
          filter:blur(1px);
        }
        .sparkles{position:absolute;inset:-30px -50px auto -50px;height:170px;pointer-events:none;}
        .sparkles span{
          position:absolute; color:#fff; font-size:14px; opacity:0;
          animation:sparkle 1.8s ease-in-out infinite;
          filter:drop-shadow(0 0 4px rgba(255,255,255,.8));
        }
        @keyframes sparkle{0%,100%{opacity:0;transform:scale(.4) rotate(0deg);}50%{opacity:1;transform:scale(1) rotate(20deg);}}
      
        /* ---------- progress track ---------- */
        .track-wrap{
          position:relative;
          margin-top:8px;
          height:var(--track-h);
        }
        .track{
          position:absolute; inset:0;
          background:linear-gradient(180deg,#fdfdfd,#eef0f4);
          border-radius:999px;
          overflow:hidden;
          box-shadow:inset 0 1px 3px rgba(0,0,0,.25);
        }
        .track-fill-new{
          position:absolute; top:0; left:0; bottom:0;
          width:0%;
          border-radius:999px;
          background:linear-gradient(90deg, var(--red-shadow), var(--red-3) 35%, var(--red-2) 70%, var(--red-1));
          box-shadow:0 0 18px 1px rgba(226,27,73,.55);
          transition:width var(--dur,2s) cubic-bezier(.45,.05,.2,1);
          overflow:hidden;
        }
        .track-fill-new::after{
          content:'';
          position:absolute; inset:0;
          background:linear-gradient(100deg, transparent 30%, rgba(255,255,255,.35) 45%, transparent 60%);
          background-size:220% 100%;
          animation:shine 2.4s linear infinite;
        }
        @keyframes shine{0%{background-position:120% 0;}100%{background-position:-40% 0;}}
        .percent-label{
          position:absolute; right:10px; top:50%;
          transform:translateY(-50%);
          font-size:11px; font-weight:700; color:#fff;
          letter-spacing:.02em;
          opacity:0; transition:opacity .3s ease;
          text-shadow:0 1px 2px rgba(0,0,0,.4);
          z-index:2;
        }
        .percent-label.show{opacity:1;}
      
        /* ---------- reduced motion ---------- */
        @media (prefers-reduced-motion: reduce){
          .runner-figure.running *{animation:none !important;}
          .icon-tile, .info-card, .ray, .track-fill-new::after, .connector-dot, .sparkles span{animation:none !important;}
          .loader-card{animation:none;opacity:1;transform:none;}
          .runner-wrap, .track-fill-new{transition-duration:.35s !important;}
        }
      
        @media (max-width:480px){
          .desk-person{width:82px;height:80px;}
          .runner-wrap{width:52px;height:80px;bottom:10px;}
          .icon-tile{width:50px;height:50px;border-radius:13px;}
          .icon-tile svg{width:28px;height:28px;}
          .stage-visual{height:150px;}
          .glass-box{width:90px;height:82px;}
          .glass-box svg{width:50px;height:50px;}
        }
      `}}/>
      <div className="stage-bg">
        <svg className="skyline" viewBox="0 0 760 340" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <g fill="#0e1730">
            <rect x="0" y="260" width="46" height="80"/>
            <rect x="50" y="230" width="34" height="110"/>
            <rect x="90" y="270" width="52" height="70"/>
            <rect x="600" y="250" width="40" height="90"/>
            <rect x="645" y="215" width="30" height="125"/>
            <rect x="680" y="265" width="60" height="75"/>
            <rect x="720" y="240" width="26" height="100"/>
          </g>
          <g fill="none" stroke="#16204a" strokeWidth="1.5">
            <circle cx="700" cy="60" r="34"/>
            <path d="M660 90 L700 60 L742 95"/>
            <path d="M20 60 q40 -30 80 0 t80 0"/>
          </g>
        </svg>

        <div className="loader-card" id="nl-card">
          <div className="nl-badge" id="nl-badge">1</div>

          <div className="nl-header" id="nl-header">
            <h2 className="nl-title" id="nl-title">Starting Analysis…</h2>
            <p className="nl-subtitle" id="nl-subtitle">Preparing your NEET data for prediction</p>
          </div>

          <div className="stage-visual">

            <div className="icon-anchor" id="nl-iconAnchor">
              <div id="nl-iconSlot"></div>
              <div className="nl-connector" id="nl-connector"></div>
              <div className="connector-dot" id="nl-connectorDot"></div>
            </div>

            <div className="pedestal-wrap" id="nl-pedestal">
              <div className="ray"></div>
              <div className="sparkles" id="nl-sparkles"></div>
              <div className="glass-box">
                <div className="glass-check">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M4 12.5L9.5 18L20 6" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <svg viewBox="0 0 60 60" fill="none">
                  <polygon points="30,8 54,19 30,30 6,19" fill="#f7f9fc"/>
                  <rect x="27" y="15" width="6" height="6" fill="#e21b49" transform="rotate(45 30 18)"/>
                  <rect x="19" y="21" width="22" height="12" rx="3" fill="#f7f9fc"/>
                  <line x1="46" y1="19" x2="46" y2="32" stroke="#f7f9fc" strokeWidth="2"/>
                  <circle cx="46" cy="35" r="2.6" fill="#f7f9fc"/>
                  <path d="M22 33 C22 42 26 46 30 46 C34 46 38 42 38 33" stroke="#f7f9fc" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
                  <circle cx="30" cy="47" r="4" fill="none" stroke="#f7f9fc" strokeWidth="2.4"/>
                </svg>
              </div>
              <div className="pedestal-base"></div>
            </div>

            <div className="runner-wrap" id="nl-runnerWrap">
              <div className="speed-lines"><span></span><span></span><span></span></div>
              <div className="runner-shadow"></div>
              <svg className="runner-figure running" id="nl-runnerFigure" viewBox="0 0 100 160">
                <g className="cape-grp">
                  <path d="M44,42 C28,36 8,40 -2,54 C8,58 2,72 6,86 C18,80 32,74 40,64 C44,58 46,50 44,42 Z" fill="var(--red-cape)"/>
                </g>
                <g className="limb leg-back"><rect x="38.5" y="88" width="15" height="58" rx="7.5" fill="var(--red-body)"/></g>
                <g className="limb arm-back"><rect x="44" y="40" width="12" height="44" rx="6" fill="var(--red-body)"/></g>
                <g className="torso-grp">
                  <path d="M58,38 L46,42 C42,55 41,70 42,84 L54,86 C57,72 59,55 58,38 Z" fill="var(--red-body)"/>
                  <circle cx="60" cy="22" r="12" fill="var(--red-body)"/>
                </g>
                <g className="limb leg-front"><rect x="38.5" y="88" width="15" height="58" rx="7.5" fill="var(--red-body)"/></g>
                <g className="limb arm-front"><rect x="44" y="40" width="12" height="44" rx="6" fill="var(--red-body)"/>
                  <g id="nl-propSlot" transform="translate(50,84)"></g>
                </g>
              </svg>
            </div>

            <div className="desk-person pose-normal" id="nl-deskPerson">
              <svg viewBox="0 0 120 116" fill="none">
                <g stroke="var(--white)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="112" x2="18" y2="70"/>
                  <line x1="88" y1="112" x2="88" y2="70"/>
                  <line x1="14" y1="70" x2="92" y2="70"/>
                </g>
                <g fill="var(--white)">
                  <rect x="30" y="55" width="26" height="16" rx="2"/>
                  <path d="M28 55 L58 55 L64 47 L22 47 Z"/>
                </g>
                <circle cx="76" cy="26" r="11" fill="var(--white)"/>
                <g className="pose-normal-parts">
                  <path d="M76,37 C64,39 58,48 58,60 L58,80 C58,86 63,90 69,90 L83,90 C89,90 94,86 94,80 L94,60 C94,48 88,39 76,37 Z" fill="var(--white)"/>
                  <path d="M60,58 C52,60 46,54 42,49" stroke="var(--white)" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
                </g>
                <g className="pose-cheer-parts" style={{display:'none'}}>
                  <path d="M76,37 C65,39 59,47 58,58 L58,80 C58,86 63,90 69,90 L83,90 C89,90 94,86 94,80 L94,64 C94,50 88,39 76,37 Z" fill="var(--white)"/>
                  <path d="M62,44 C56,36 52,28 50,20" stroke="var(--white)" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
                  <path d="M90,44 C96,36 100,28 102,20" stroke="var(--white)" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
                </g>
                <g className="chair" stroke="var(--white)" strokeWidth="2.4" fill="none" strokeLinecap="round">
                  <path d="M84,58 C96,58 100,66 98,78"/>
                  <line x1="84" y1="90" x2="80" y2="112"/>
                  <line x1="96" y1="90" x2="98" y2="112"/>
                </g>
                <g className="bubble" transform="translate(96,4)">
                  <rect x="0" y="0" width="30" height="22" rx="8" fill="#1b2340"/>
                  <polygon points="8,20 4,28 16,21" fill="#1b2340"/>
                  <path d="M9 12 C9 12 10 15 13 15 C17 15 19 8 19 8" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" transform="translate(-1,-1) scale(1)"/>
                  <g transform="translate(7,4) scale(0.7)">
                    <path d="M2 20 L2 9 L6 9 L6 20 Z" fill="#fff"/>
                    <path d="M6 9 L9 1 C10 -1 13 0 12.5 3 L11 9 L18 9 C20 9 21 11 20 13 L17 20 C16.3 21.4 15 22 13.5 22 L6 22 Z" fill="#fff"/>
                  </g>
                </g>
              </svg>
            </div>
          </div>

          <div className="track-wrap">
            <div className="track">
              <div className="track-fill-new" id="nl-fill"></div>
            </div>
            <div className="percent-label" id="nl-percentLabel">100%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
