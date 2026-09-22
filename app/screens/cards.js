/* Тренажёр CCNA · режим «Карточки»: очередь, ответы, оценка и итоги сессии */
"use strict";

/* ═══ Режим «Карточки» ════════════════════════════════ */
const S={queue:[],qi:0,picked:new Set(),answered:false,ok:null,asked:0,right:0,streak:0,best:0,ahead:false,focus:""};
const pool=()=>BANK.filter(q=>sel.has(q.b));
function counts(){
  const now=Date.now(); let due=0,fresh=0,lrn=0; const p=pool();
  p.forEach(q=>{const r=P.cards[q.id]; if(!r) fresh++; else { if(r.due<=now) due++; if(r.reps>0) lrn++; }});
  return {due,fresh,learned:lrn,total:p.length};
}
function nextDue(){const now=Date.now();let m=0;pool().forEach(q=>{const r=P.cards[q.id];if(r&&r.due>now&&(!m||r.due<m))m=r.due;});return m;}
function buildQueue(o){
  o=o||{}; const now=Date.now(); let list;
  if(o.list) list=shuffle(o.list.slice());
  else if(o.ahead) list=pool().filter(q=>P.cards[q.id]&&P.cards[q.id].due>now).sort((a,b)=>P.cards[a.id].due-P.cards[b.id].due);
  else {
    const p=pool(), due=p.filter(q=>P.cards[q.id]&&P.cards[q.id].due<=now), fresh=p.filter(q=>!P.cards[q.id]);
    if(P.ui.ordered){const byDay=(a,b)=>a.day-b.day||a.id.localeCompare(b.id); due.sort(byDay); fresh.sort(byDay);}
    else { shuffle(due); shuffle(fresh); }
    list=due.concat(fresh);
  }
  Object.assign(S,{queue:list,qi:0,picked:new Set(),answered:false,ok:null,asked:0,right:0,streak:0,best:0,ahead:!!o.ahead,focus:o.focus||""});
  resetAsk(null);
}
function trainDay(day){ P.ui.mode="cards"; buildQueue({list:BANK.filter(q=>q.day===day),focus:`день ${day}`}); save(); render(); window.scrollTo({top:0}); }
function trainErrors(){
  const list=BANK.filter(q=>{const r=P.cards[q.id];return r&&r.lapses>0;})
    .sort((a,b)=>(P.cards[b.id].w-P.cards[b.id].c)-(P.cards[a.id].w-P.cards[a.id].c)).slice(0,25);
  P.ui.mode="cards"; buildQueue({list,focus:"ошибки"}); save(); render(); window.scrollTo({top:0});
}
function choose(i){
  if(S.answered) return; const q=S.queue[S.qi]; if(!q) return;
  if(q.a.length>1){ S.picked.has(i)?S.picked.delete(i):S.picked.add(i); render(); }
  else { S.picked=new Set([i]); submit(); }
}
function fail(q){
  const r=schedule(P.cards[q.id],0); r.s++; r.w++; P.cards[q.id]=r; S.streak=0;
  if(inMix()) mixRequeue({type:"card",q});                        // вернётся через три задания
  else {
    for(let i=S.queue.length-1;i>S.qi;i--) if(S.queue[i].id===q.id) S.queue.splice(i,1);
    S.queue.splice(Math.min(S.qi+4,S.queue.length),0,q);
  }
  save();
}
function submit(){
  if(S.answered) return; const q=S.queue[S.qi]; if(!q||!S.picked.size) return;
  if(q.a.length>1&&S.picked.size<q.a.length) return;
  const ok=S.picked.size===q.a.length&&q.a.every(i=>S.picked.has(i));
  S.answered=true; S.ok=ok; S.asked++; bump("c"); mixResult(ok);
  if(ok){ S.right++; S.streak++; S.best=Math.max(S.best,S.streak); bump("cr"); save(); } else fail(q);
  render(); showResult(); if(ok) pingCelebrate(S.streak);
}
function reveal(){
  if(S.answered) return; const q=S.queue[S.qi]; if(!q) return;
  S.answered=true; S.ok=false; S.picked=new Set(); S.asked++; bump("c"); mixResult(false); fail(q); render(); showResult();
}
function rate(g){
  if(!S.answered||!S.ok) return; const q=S.queue[S.qi];
  const r=schedule(P.cards[q.id],g); r.s++; r.c++; P.cards[q.id]=r; save(); next();
}
function next(){
  if(inMix()){ mixNext(); return; }
  S.qi++; S.picked=new Set(); S.answered=false; S.ok=null; render();
  const c=$("card"); if(c&&c.getBoundingClientRect().top<60) window.scrollTo({top:Math.max(0,c.offsetTop-70)});
}

function renderCards(){
  const card=$("card"), ctr=$("controls");
  if(!S.queue.length){
    const nd=nextDue();
    card.innerHTML=`<div class="empty">${pingOn()?pingSvg("sleep"):""}<b>${S.focus?"Здесь пока пусто":"На сегодня всё"}</b><span>${S.focus?"Для этой тренировки не нашлось карточек.":`Карточки выбранных блоков повторены.${nd?` Следующее повторение — через ${fmtWhen(nd-Date.now())}.`:""}`}</span></div>`;
    ctr.innerHTML=(nd&&!S.focus?'<button class="btn primary" data-act="ahead">Повторить досрочно</button>':(S.focus?'<button class="btn primary" data-act="restart">К обычной очереди</button>':""))
      +'<button class="btn ghost" data-mode="mix">Открыть микс</button>';
    return;
  }
  if(S.qi>=S.queue.length){ renderSummary(); return; }
  const q=S.queue[S.qi], b=BLOCKS[q.b], multi=q.a.length>1, r=P.cards[q.id];
  const opts=q.o.map((t,i)=>{
    let cls="opt", mark="";
    if(S.answered){ if(q.a.includes(i)){cls+=" ok";mark="✓";} else if(S.picked.has(i)){cls+=" bad";mark="✕";} else cls+=" dim"; }
    else if(S.picked.has(i)) cls+=" sel";
    return `<button class="${cls}" data-i="${i}"${S.answered?" disabled":""}><span class="key">${LET[i]}</span><span class="otext">${esc(t)}</span><span class="mark">${mark}</span></button>`;
  }).join("");

  let res="";
  if(S.answered){
    const wrong=[...S.picked].filter(i=>!q.a.includes(i));
    const yours=wrong.length?`<div class="yours"><span class="lbl">Ваш ответ — ${wrong.map(i=>LET[i]).join(", ")}</span>${wrong.map(i=>(q.no&&q.no[i])||"Этот вариант не подходит под условие.").join(" ")}</div>`:"";
    const rest=q.o.map((_,i)=>(!q.a.includes(i)&&!S.picked.has(i)&&q.no&&q.no[i])?`<li><span class="k">${LET[i]}</span><span>${q.no[i]}</span></li>`:"").join("");
    const others=rest?`<details class="others"><summary>Почему не остальные</summary><ul>${rest}</ul></details>`:"";
    const title=S.ok?"Верно":(S.picked.size?"Неверно":"Ответ");
    let tail;
    if(S.ok){
      const base=P.cards[q.id];
      tail=`<div class="rate"><span class="rl">Насколько легко вспомнилось?</span><div class="rbtns">${
        [[1,"Трудно",""],[2,"Хорошо",""],[3,"Легко","easy"]].map(([g,l,c])=>
          `<button class="rb ${c}" data-rate="${g}"><b>${l}</b><span>${g} · через ${fmtIvl(schedule(base,g).ivl)}</span></button>`).join("")
      }</div></div>`;
    } else tail=`<div class="rate"><span class="rl">Карточка вернётся через ${inMix()?"несколько заданий":"несколько вопросов"}</span></div>`;
    const say=S.ok?(S.streak>=3&&!pingMile(S.streak)?pingRow("cheer","streak",{n:S.streak}):pingRow("happy","ok"))
      :(S.picked.size?pingRow("sad","bad"):pingRow("idle","show"));
    res=`<div class="res ${S.ok?"ok":"bad"}"><div class="verdict"><span class="vi">${S.ok?"✓":"✕"}</span>${title} — ${q.a.map(i=>LET[i]).join(" и ")}</div>${say}<p class="why">${q.why}</p>${yours}${others}<div id="askwrap"></div>${tail}</div>`;
  }
  const badge=!r?'<span class="badge q">новая</span>':(r.ivl>=MATURE?'<span class="badge q">освоено</span>':"");
  const pos=inMix()?`${MIX.i+1} / ${MIX.items.length}`:`${S.qi+1} / ${S.queue.length}`;
  card.innerHTML=`<div class="chead"><span class="dtag">${wire(b)}${esc(b.n)}</span><span class="day">День ${q.day} · ${esc(DAYS[q.day]||"")}</span>${multi?'<span class="badge">выберите два</span>':""}${S.focus?`<span class="badge">${esc(S.focus)}</span>`:""}${badge}<span class="pos">${pos}</span></div>
    <div class="qbody"><h2 class="q">${esc(q.q)}</h2>${q.fig?drawFig(q.fig):""}${q.c?`<pre class="cli">${esc(q.c)}</pre>`:""}<div class="opts">${opts}</div></div>${res}`;
  linkTerms(card);
  renderAsk();

  const restart=inMix()?"":`<button class="btn ghost spacer" data-act="restart">${S.focus?"К обычной очереди":"Начать сессию заново"}</button>`;
  ctr.innerHTML = S.answered
    ? (S.ok?restart:`<button class="btn primary" data-act="next">${!inMix()&&S.qi+1>=S.queue.length?"К итогам":"Дальше →"}</button>${restart}`)
    : `${multi?'<button class="btn primary" data-act="submit">Проверить</button>':""}<button class="btn" data-act="show">Показать ответ</button><button class="btn ghost" data-act="skip">Пропустить</button>${restart}`;
}
function renderSummary(){
  const acc=S.asked?Math.round(S.right/S.asked*100):0, c=counts(), nd=nextDue();
  const rows=BLOCKS.map((b,i)=>{
    if(!sel.has(i)) return "";
    const p=BANK.filter(q=>q.b===i); if(!p.length) return "";
    const l=p.filter(q=>learned(q.id)).length, m=p.filter(q=>mastered(q.id)).length;
    return `<div class="drow" style="--w:${b.w}"><div class="dn">${wire(b)}${esc(b.n)}</div><div class="dv">${l}/${p.length} · освоено ${m}</div><div class="bar"><i style="width:${(l/p.length*100).toFixed(1)}%"></i></div></div>`;
  }).join("");
  $("card").innerHTML=`<div class="sum"><h2>${S.focus?`Тренировка «${esc(S.focus)}» завершена`:S.ahead?"Досрочное повторение завершено":"Сессия завершена"}</h2>
    <div class="score"><span class="big">${acc}%</span><span class="sub">${S.right} из ${S.asked} верно · лучшая серия ${S.best}${nd?` · следующее повторение через ${fmtWhen(nd-Date.now())}`:""}</span></div>
    ${pingBlock(acc>=85?"cheer":acc>=50?"happy":"sad",acc>=85?"sumHi":acc>=50?"sumMid":"sumLow")}
    <div class="dstats">${rows}</div></div>`;
  const more=c.due+c.fresh;
  $("controls").innerHTML=(more?`<button class="btn primary" data-act="restart">Продолжить · ${more}</button>`:(nd?'<button class="btn primary" data-act="ahead">Повторить досрочно</button>':""))
    +'<button class="btn ghost" data-mode="mix">Микс</button><button class="btn ghost" data-mode="prog">Прогресс и достижения</button>';
}
