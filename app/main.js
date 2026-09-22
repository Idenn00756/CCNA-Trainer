/* Тренажёр CCNA · запуск приложения и синхронизация с облаком */
"use strict";

/* ═══ Запуск ══════════════════════════════════════════ */
const linkedView=new URLSearchParams(location.search).get("view");
if(linkedView&&MODES.some(item=>item[0]===linkedView)) P.ui.mode=linkedView;
buildQueue();
cliFirstOpen(); caseFirstOpen(); matchFirstOpen();
achSilent(); ACH_ON=true;
applyTheme();
render();
// первое открытие: Пинг сам представляется — на главной он и так виден
if(pingOn()&&P.ui.mode!=="home"&&!Object.keys(P.days).length&&!Object.keys(P.cards).length) pingOpen();

/* ═══ Синхронизация прогресса, Claude и отзывы ═════════ */
(async()=>{
  try{
    if(!window.claude||typeof window.claude.use!=="function") return;
    const c=await window.claude.use("comments");
    if(c){ COMMENTS=c; decorateFeedback(); }
  }catch(e){}
})();
(async()=>{
  try{
    if(!window.claude||typeof window.claude.use!=="function") return;
    const s=await window.claude.use("sample");
    if(s){ SAMPLE=s; if(effView()==="cards"&&S.answered) renderAsk(); }
  }catch(e){}
})();
(async()=>{
  try{
    if(!window.claude||typeof window.claude.use!=="function") return;
    const d=await window.claude.use("db"); if(!d) return;
    const snap=await d.doc("progress/v3").get();
    if(snap&&snap.exists){ mergeRemote(snap.data()||{}); }
    else {
      const old=await d.doc("progress/v2").get();            // прогресс прошлой версии приложения
      if(old&&old.exists){ const v2=old.data()||{}; migrateV2(v2.stats); }
    }
    db=d; achSilent(); save();
    const fresh=!S.answered&&!S.picked.size&&!PR.checked&&CS.pick===-1&&!MT.done.length;
    if(fresh&&(P.ui.mode==="cards"||(inMix()&&MIX.i===0))){ buildQueue(); if(inMix()) MIX.built=false; render(); }
    else renderGauges();
  }catch(e){}
})();
