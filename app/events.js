/* Тренажёр CCNA · обработка нажатий и клавиатуры */
"use strict";

/* ═══ События ═════════════════════════════════════════ */
document.addEventListener("click",e=>{
  const tg=e.target;
  const term=tg.closest(".gt"); if(term){ openGloss(term); return; }
  if(gpop&&!tg.closest(".gpop")) closeGloss();
  if(pingBub&&!tg.closest("#pingAv")&&(!tg.closest("#pingBubble")||tg.closest("#pingBubble .mini"))) pingClose();
  const pon=tg.closest("[data-pingon]");
  if(pon){ P.ui.ping=pon.dataset.pingon==="1"; save(); if(!pingOn()) pingClose(); render(); renderSettings(); return; }
  const th=tg.closest("[data-th]");
  if(th){ P.ui.theme=th.dataset.th; save(); applyTheme(); renderSettings(); return; }
  const training=tg.closest("[data-train]");
  if(training){
    const kind=training.dataset.train;
    if(kind==="cards"||kind==="cli"||kind==="mix"){ setMode(kind); return; }
    if(kind==="drills"||kind==="case"||kind==="match"){
      P.ui.topic=kind==="drills"?"mix":kind;
      if(kind==="case") caseFirstOpen(); else if(kind==="match") matchFirstOpen(); else prNew();
      setMode("prac"); return;
    }
  }
  const md=tg.closest("[data-mode]"); if(md){ setMode(md.dataset.mode); return; }
  const les=tg.closest("[data-lesson]"); if(les){ lectOpen(les.dataset.lesson); setMode("lect"); return; }
  const la=tg.closest("[data-lask]"); if(la){ askLesson(la.dataset.lask); return; }
  const chip=tg.closest(".chip[data-b]");
  if(chip){ const i=+chip.dataset.b; if(sel.has(i)){ if(sel.size>1) sel.delete(i); } else sel.add(i); selChanged(); return; }
  const ord=tg.closest("[data-ord]"); if(ord){ P.ui.ordered=ord.dataset.ord==="course"; save(); buildQueue(); render(); renderSettings(); return; }
  const tp=tg.closest("[data-topic]");
  if(tp){ P.ui.topic=tp.dataset.topic; save(); if(P.ui.topic==="case") caseFirstOpen(); else if(P.ui.topic==="match") matchFirstOpen(); else prNew(); render(); return; }
  const stp=tg.closest("[data-stype]"); if(stp){ P.ui.stype=stp.dataset.stype; save(); prNew(); render(); return; }
  const srg=tg.closest("[data-srange]"); if(srg){ P.ui.srange=srg.dataset.srange; save(); prNew(); render(); return; }
  const gc=tg.closest("[data-goalc]"); if(gc){ P.goal.cards=+gc.dataset.goalc; save(); render(); renderSettings(); return; }
  const gp=tg.closest("[data-goalp]"); if(gp){ P.goal.prac=+gp.dataset.goalp; save(); render(); renderSettings(); return; }
  const heat=tg.closest("[data-heat]"); if(heat){ const r=$("heatRead"); if(r) r.textContent=heat.dataset.heat; return; }
  const opt=tg.closest(".opt[data-i]"); if(opt){ if(!opt.disabled) choose(+opt.dataset.i); return; }
  const po=tg.closest(".opt[data-pi]"); if(po){ if(!po.disabled) prPick(+po.dataset.pi); return; }
  const co=tg.closest(".opt[data-ci]"); if(co){ if(!co.disabled) casePick(+co.dataset.ci); return; }
  const ml=tg.closest("[data-ml]"); if(ml){ if(!ml.disabled) matchTap("l",+ml.dataset.ml); return; }
  const mr=tg.closest("[data-mr]"); if(mr){ if(!mr.disabled) matchTap("r",+mr.dataset.mr); return; }
  const rb=tg.closest("[data-rate]"); if(rb){ rate(+rb.dataset.rate); return; }
  const aq=tg.closest("[data-ask]"); if(aq){ askCard(ASK_PRESET[aq.dataset.ask]); return; }
  if(tg.closest("#term")&&!tg.closest("button")) focusCli();
  if(tg.closest("#cterm")&&!tg.closest("button")) focusCase();
  const btn=tg.closest("[data-act]"); if(!btn) return;
  switch(btn.dataset.act){
    case "submit": submit(); break;
    case "show": reveal(); break;
    case "skip": case "next": next(); break;
    case "restart": buildQueue(); render(); break;
    case "ahead": buildQueue({ahead:true}); render(); break;
    case "all": sel=new Set(BLOCKS.map((_,i)=>i)); selChanged(); break;
    case "early": sel=new Set([0,1]); selChanged(); break;
    case "reset":
      if(resetArmed&&Date.now()-resetArmed<5000){
        const keep={ui:P.ui,goal:P.goal}; P=Object.assign(blank(),keep); resetArmed=0; save();
        buildQueue(); cliFirstOpen(); caseFirstOpen(); matchFirstOpen(); PR.task=null; MIX.built=false; render(); renderSettings();
      } else {
        resetArmed=Date.now(); renderToolbar(); renderSettings();
        setTimeout(()=>{ if(resetArmed&&Date.now()-resetArmed>=5000){ resetArmed=0; renderToolbar(); renderSettings(); } },5100);
      }
      break;
    case "askopen": ASK.open=true; renderAsk(); { const el=$("askIn"); if(el) el.focus({preventScroll:true}); } break;
    case "asksend": { const el=$("askIn"); if(el&&el.value.trim()){ const v=el.value; el.value=""; askCard(v); } break; }
    case "askstop": if(ASK.ctl) ASK.ctl.abort(); break;
    case "gask": askTerm(); break;
    case "gclose": closeGloss(); break;
    case "go": homeGo(); break;
    case "settings": openSettings(); break;
    case "setclose": closeSettings(); break;
    case "feedback": openFeedback(); break;
    case "ping": pingToggle(); break;
    case "pingclose": pingClose(); break;
    case "ldone": lectDone(); break;
    case "lnext": lectStep(1); break;
    case "lprev": lectStep(-1); break;
    case "llist": P.ui.lesson=""; save(); render(); window.scrollTo({top:0}); break;
    case "laskstop": if(LASK.ctl) LASK.ctl.abort(); break;
    case "trainday": trainDay(+btn.dataset.day); break;
    case "trainerr": trainErrors(); break;
    case "traintopic":
      P.ui.topic=btn.dataset.t;
      if(P.ui.topic==="case") caseFirstOpen(); else if(P.ui.topic==="match") matchFirstOpen(); else prNew();
      setMode("prac"); break;
    case "mixnew": MIX.built=false; render(); window.scrollTo({top:0}); break;
    case "prcheck": prCheck(false); break;
    case "prshow": prCheck(true); break;
    case "prnext": prNext(); break;
    case "casereveal": casePick(-2); break;
    case "casefix": CS.stage="fix"; render(); focusCase(); break;
    case "casehint": caseHint(); break;
    case "casenext": caseNext(); break;
    case "matchnext": matchNext(); break;
    case "matchredo": matchOpen(matchCur()); render(); break;
    case "clihint": cliHint(); break;
    case "clinext": cliNextAction(); break;
    case "cliprev": cliGo(Math.max(0,C.i-1)); break;
    case "cliredo": cliGo(C.i); break;
  }
});
document.addEventListener("mouseover",e=>{ const h=e.target.closest&&e.target.closest("[data-heat]"); if(h){ const r=$("heatRead"); if(r) r.textContent=h.dataset.heat; } });
document.addEventListener("focusin",e=>{ const h=e.target.closest&&e.target.closest("[data-heat]"); if(h){ const r=$("heatRead"); if(r) r.textContent=h.dataset.heat; } });

document.addEventListener("keydown",e=>{
  if(e.metaKey||e.ctrlKey||e.altKey) return;
  const tg=e.target, tag=tg&&tg.tagName, inInput=tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT";
  if(e.key==="Escape"){
    if(SET_OPEN){ closeSettings(); return; }
    if(gpop){ closeGloss(); return; }
    if(pingBub){ pingClose(); return; }
    if(ASK.busy&&ASK.ctl){ ASK.ctl.abort(); return; }
    if(LASK.busy&&LASK.ctl){ LASK.ctl.abort(); return; }
    if(P.ui.mode==="lect"&&P.ui.lesson){ P.ui.lesson=""; save(); render(); return; }
  }
  if((e.key==="Enter"||e.key===" ")&&tg&&tg.classList&&tg.classList.contains("gt")){ e.preventDefault(); openGloss(tg); return; }
  if(tg&&tg.id==="askIn"){ if(e.key==="Enter"){ e.preventDefault(); const v=tg.value; if(v.trim()){ tg.value=""; askCard(v); } } return; }
  if(e.key==="Enter"&&tag==="BUTTON") return;                // Enter на кнопке обработает click
  if(gpop) return;
  const v=effView();
  if(v==="cli"){
    if(tg&&tg.id==="cliIn"&&e.key==="Enter"){ e.preventDefault(); const val=tg.value; tg.value=""; cliEnter(val); return; }
    if(!inInput&&e.key==="Enter"&&C.done){ e.preventDefault(); cliNextAction(); }
    return;
  }
  if(v==="case"){
    if(tg&&tg.id==="caseIn"&&e.key==="Enter"){ e.preventDefault(); const val=tg.value; tg.value=""; caseEnter(val); return; }
    if(inInput) return;
    const c=caseCur(); if(!c) return;
    if(CS.stage==="diag"&&CS.pick===-1){ const n=parseInt(e.key,10); if(n>=1&&n<=c.o.length){ e.preventDefault(); casePick(n-1); } return; }
    if(e.key==="Enter"){ e.preventDefault(); if(CS.stage==="diag"&&c.fix){ CS.stage="fix"; render(); focusCase(); } else if(CS.stage==="done") caseNext(); }
    return;
  }
  if(v==="prac"){
    const t=PR.task;
    if(e.key==="Enter"){
      e.preventDefault();
      if(PR.checked){ prNext(); return; }
      if(tag==="INPUT"&&tg.id&&tg.id.indexOf("pf")===0){ const nx=$("pf"+(+tg.id.slice(2)+1)); if(nx&&!nx.value.trim()){ nx.focus(); return; } }
      prCheck(false); return;
    }
    if(!inInput&&t&&t.choice&&!PR.checked){ const n=parseInt(e.key,10); if(n>=1&&n<=t.choice.options.length){ e.preventDefault(); prPick(n-1); } }
    return;
  }
  if(v==="match"){ if(!inInput&&e.key==="Enter"&&MT.fin){ e.preventDefault(); matchNext(); } return; }
  if(v==="lect"){
    if(inInput||!P.ui.lesson) return;
    if(e.key==="ArrowRight"){ e.preventDefault(); lectStep(1); }
    else if(e.key==="ArrowLeft"){ e.preventDefault(); lectStep(-1); }
    else if(e.key==="Enter"){ e.preventDefault(); lectDone(); }
    return;
  }
  if(v!=="cards"||inInput||S.qi>=S.queue.length) return;
  const q=S.queue[S.qi];
  if(S.answered){
    if(S.ok){
      if(e.key==="1"||e.key==="2"||e.key==="3"){ e.preventDefault(); rate(+e.key); }
      else if(e.key==="Enter"){ e.preventDefault(); rate(2); }
    } else if(e.key==="Enter"){ e.preventDefault(); next(); }
    return;
  }
  const n=parseInt(e.key,10);
  if(n>=1&&n<=q.o.length){ e.preventDefault(); choose(n-1); return; }
  if(e.key==="Enter"){ e.preventDefault(); submit(); return; }
  if(/^[sSыЫ]$/.test(e.key)){ e.preventDefault(); reveal(); }
});
