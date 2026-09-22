/* Тренажёр CCNA · практика: задания на сопоставление */
"use strict";

/* ═══ Практика: сопоставление ═════════════════════════ */
const MT={id:null,left:[],right:[],done:[],num:[],selL:-1,selR:-1,err:0,t0:0,ms:0,bad:null,fin:false,cnt:0};
const matchList=()=>MATCH.filter(m=>sel.has(m.b)).sort((a,b)=>a.day-b.day||a.id.localeCompare(b.id));
const matchCur=()=>MATCH.find(m=>m.id===MT.id);
function matchOpen(m){
  if(!m){ MT.id=null; return; }
  const pairs=m.gen&&MATCH_GEN[m.gen]?MATCH_GEN[m.gen](m.n):shuffle(m.pool.slice()).slice(0,m.n);
  Object.assign(MT,{id:m.id,left:pairs,right:shuffle(pairs.map((_,i)=>i)),done:[],num:[],selL:-1,selR:-1,err:0,t0:Date.now(),ms:0,bad:null,fin:false,cnt:0});
}
function matchFirstOpen(){ const L=matchList(); matchOpen(L.find(m=>!(P.match.by[m.id]&&P.match.by[m.id].perfect))||L[0]||null); }
function matchFinish(){
  const m=matchCur(); if(!m) return;
  MT.fin=true; MT.ms=Date.now()-MT.t0;
  const perfect=MT.err===0, by=P.match.by[m.id]||(P.match.by[m.id]={n:0,perfect:0,best:0});
  bump("p"); if(perfect) bump("pr");
  P.match.n=(P.match.n||0)+1; by.n++;
  if(perfect){ P.match.perfect=(P.match.perfect||0)+1; by.perfect++; by.best=by.best?Math.min(by.best,MT.ms):MT.ms; }
  mixResult(perfect); save();
}
function matchTap(side,i){
  if(MT.fin||!MT.id) return;
  if(side==="l"){ if(MT.done.includes(i)) return; MT.selL=MT.selL===i?-1:i; }
  else { if(MT.done.includes(MT.right[i])) return; MT.selR=MT.selR===i?-1:i; }
  if(MT.selL>=0&&MT.selR>=0){
    const l=MT.selL, r=MT.selR;
    if(MT.right[r]===l){ MT.done.push(l); MT.num[l]=++MT.cnt; if(MT.done.length===MT.left.length) matchFinish(); }
    else {
      MT.err++; const bad={l,r}; MT.bad=bad;
      setTimeout(()=>{ if(MT.bad===bad){ MT.bad=null; if(effView()==="match") render(); } },650);
    }
    MT.selL=-1; MT.selR=-1;
  }
  render(); if(MT.fin) showResult();
}
function matchNext(){
  if(inMix()){ mixNext(); return; }
  const L=matchList(), k=L.findIndex(m=>m.id===MT.id);
  matchOpen(L.length?L[(k+1)%L.length]:null); render(); window.scrollTo({top:0});
}
function renderMatch(){
  if(!MT.id||!matchCur()) matchFirstOpen();
  const m=matchCur(), card=$("card");
  if(!m){
    card.innerHTML='<div class="empty"><b>Здесь пока нет наборов</b><span>Для выбранных блоков заданий на сопоставление нет. Включите другие блоки выше.</span></div>';
    $("controls").innerHTML=""; return;
  }
  const b=BLOCKS[m.b], L=matchList(), by=P.match.by[m.id];
  const monoL=m.mono==="left"||m.mono==="both", monoR=m.mono==="right"||m.mono==="both";
  const left=MT.left.map((p,i)=>{
    const d=MT.done.includes(i), bad=MT.bad&&MT.bad.l===i;
    return `<button class="mi${monoL?" mono":""}${d?" done":MT.selL===i?" sel":""}${bad?" bad":""}" data-ml="${i}"${d?" disabled":""}>${d?`<span class="pn">${MT.num[i]}</span>`:""}<span>${esc(p[0])}</span></button>`;
  }).join("");
  const right=MT.right.map((li,j)=>{
    const d=MT.done.includes(li), bad=MT.bad&&MT.bad.r===j;
    return `<button class="mi${monoR?" mono":""}${d?" done":MT.selR===j?" sel":""}${bad?" bad":""}" data-mr="${j}"${d?" disabled":""}>${d?`<span class="pn">${MT.num[li]}</span>`:""}<span>${esc(MT.left[li][1])}</span></button>`;
  }).join("");
  const pos=inMix()?`${MIX.i+1} / ${MIX.items.length}`:`${Math.max(1,L.findIndex(x=>x.id===m.id)+1)} / ${L.length}`;
  const res=MT.fin?`<div class="res ${MT.err?"bad":"ok"}"><div class="verdict"><span class="vi">${MT.err?"!":"✓"}</span>${MT.err?`Готово · ошибок ${MT.err}`:"Без единой ошибки"} · ${fmtS(MT.ms)}</div>${MT.err?pingRow("idle","matchErr"):pingRow("cheer","matchOk")}<div class="hintbox">${m.h||""}</div></div>`:"";
  card.innerHTML=`<div class="chead"><span class="dtag">${wire(b)}${esc(b.n)}</span><span class="day">День ${m.day} · ${esc(DAYS[m.day]||"")}</span><span class="badge">сопоставление</span><span class="pos">${pos}</span></div>
    <div class="qbody"><h2 class="q">${esc(m.t)}</h2><div class="dtask">Нажмите элемент слева, затем подходящий справа. Совпавшие пары получают общий номер.</div>
    <div class="match"><div class="mcol">${left}</div><div class="mcol">${right}</div></div>
    <div class="timer"><span>Пар <b>${MT.done.length}/${MT.left.length}</b></span><span>Ошибок <b>${MT.err}</b></span>${by&&by.best?`<span>Лучшее без ошибок <b>${fmtS(by.best)}</b></span>`:""}</div></div>${res}`;
  $("controls").innerHTML=MT.fin
    ?`<button class="btn primary" data-act="matchnext">${inMix()?"Дальше →":"Следующий набор →"}</button>${inMix()?"":'<button class="btn" data-act="matchredo">Ещё раз этот набор</button>'}`
    :'<button class="btn ghost" data-act="matchnext">Пропустить</button>';
}
