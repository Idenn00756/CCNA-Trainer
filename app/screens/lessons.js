/* Тренажёр CCNA · режим «Лекции»: оглавление, чтение и вопрос к Claude по теме */
"use strict";

/* ═══ Режим «Лекции» ══════════════════════════════════
   Оглавление и мини-лекция по дню курса; одиночный вопрос к Claude по теме */
const lectList=()=>LESSONS.filter(l=>sel.has(l.b)).sort((a,b)=>a.day-b.day||a.id.localeCompare(b.id));
const lectCur=()=>LESSONS.find(l=>l.id===P.ui.lesson);
const LASK={id:null,q:"",text:"",note:"",busy:false,ctl:null};
const LASK_PRESET={simple:"Объясни эту тему проще, как новичку, с житейской аналогией.",
  example:"Приведи короткий практический пример по этой теме: небольшая топология, команды и что видно в выводе.",
  quiz:"Задай мне три вопроса по этой теме — без ответов, чтобы я проверил себя."};
function lessonText(l){
  const body=l.secs.map(s=>[s.h,s.p?strip(s.p):"",(s.list||[]).map(x=>"— "+strip(x)).join("\n"),s.cli||"",s.fig?figText(s.fig):""]
    .filter(Boolean).join("\n")).join("\n\n");
  return `Мини-лекция тренажёра «${l.t}» (день ${l.day} курса — ${DAYS[l.day]||""}).
${strip(l.lead)}

${body}

Запомнить: ${l.key.map(strip).join("; ")}`;
}
function lectOpen(id){ P.ui.lesson=id; Object.assign(LASK,{id:null,q:"",text:"",note:"",busy:false,ctl:null}); save(); }
function lectStep(d){
  const L=lectList(), i=L.findIndex(l=>l.id===P.ui.lesson), n=i<0?null:L[i+d];
  if(n) lectOpen(n.id); else { P.ui.lesson=""; save(); }          // за краем списка — обратно в оглавление
  render(); window.scrollTo({top:0});
}
function lectDone(){
  const l=lectCur(); if(!l) return;
  if(!P.read[l.id]){ P.read[l.id]=Date.now(); save(); }
  lectStep(1);
}
async function askLesson(kind){
  const l=lectCur(), q=LASK_PRESET[kind];
  if(!l||!q||!SAMPLE||SAMPLE_OFF||LASK.busy) return;
  const ctl=new AbortController();
  Object.assign(LASK,{id:l.id,q,text:"",note:"",busy:true,ctl});
  P.asks=(P.asks||0)+1; save(); renderLAsk();
  try{
    const r=await SAMPLE(`${RULES}\n\n${lessonText(l)}\n\nВопрос ученика: ${q}`,
      {signal:ctl.signal,cache:{gcTime:86400000},onText:({text})=>{
        if(LASK.ctl!==ctl) return; LASK.text=text; const box=$("laskAns"); if(box) box.innerHTML=fmtAnswer(text); }});
    if(LASK.ctl===ctl) LASK.text=r.text;
  }catch(e){ if(LASK.ctl===ctl){ LASK.text=(e&&e.text)||LASK.text; LASK.note=sampleErr(e); } }
  finally{ if(LASK.ctl===ctl){ LASK.busy=false; LASK.ctl=null; renderLAsk(); } }
}
function renderLAsk(){
  const w=$("laskwrap"), l=lectCur(); if(!w) return;
  const shown=LASK.id&&l&&LASK.id===l.id&&(LASK.busy||LASK.text||LASK.note);
  if(!l||!SAMPLE||(SAMPLE_OFF&&!shown)){ w.innerHTML=""; return; }
  const chips=[["simple","Объясни проще"],["example","Пример из практики"],["quiz","Проверь меня"]];
  w.innerHTML=`<div class="askbox"><div class="ask-h"><b>Спросить Claude по теме</b><span>ответ тратит лимиты вашего аккаунта и может содержать ошибки</span></div>
    ${shown?`<div class="ask-q">${esc(LASK.q)}</div><div class="ask-a" id="laskAns">${LASK.text?fmtAnswer(LASK.text):'<span class="ask-wait">Claude думает — обычно это до минуты</span>'}${LASK.note?`<div class="ask-note">${esc(LASK.note)}</div>`:""}</div>`:""}
    ${SAMPLE_OFF?"":LASK.busy?'<div class="ask-row"><button class="btn" data-act="laskstop">Остановить</button></div>'
      :`<div class="ask-chips">${chips.map(([k,t])=>`<button class="mini chipq" data-lask="${k}">${t}</button>`).join("")}</div>`}</div>`;
}
function renderLectIndex(L){
  const done=L.filter(x=>P.read[x.id]).length, next=L.find(x=>!P.read[x.id]);
  const rows=L.map(x=>`<button class="lrow${P.read[x.id]?" done":""}" data-lesson="${x.id}">
    <span class="lnum">${x.day}</span><span class="lt"><b>${esc(x.t)}</b><span class="lmeta">${esc(DAYS[x.day]||"")} · ≈${x.min} мин</span></span>
    <span class="lmark">${P.read[x.id]?"✓":"→"}</span></button>`).join("");
  $("card").innerHTML=`<div class="chead"><span class="dtag">Мини-лекции</span><span class="day">теория по дням курса</span><span class="pos">прочитано ${done} / ${L.length}</span></div>
    <div class="lidx">${rows}</div>`;
  $("controls").innerHTML=(next?`<button class="btn primary" data-lesson="${next.id}">${done?"Продолжить чтение":"Начать с первой"}</button>`:"")
    +'<button class="btn ghost" data-mode="mix">К миксу</button>';
}
function renderLessons(){
  const card=$("card"), L=lectList(), l=lectCur();
  if(!L.length){
    card.innerHTML=`<div class="empty">${pingOn()?pingSvg("sleep"):""}<b>Для этих блоков лекций пока нет</b><span>Мини-лекции пока написаны для дней 1–29. Включите выше один из первых четырёх блоков.</span></div>`;
    $("controls").innerHTML='<button class="btn primary" data-act="early">Включить дни 1–15</button>'; return;
  }
  if(!l||!L.some(x=>x.id===l.id)){ renderLectIndex(L); return; }
  const i=L.findIndex(x=>x.id===l.id), b=BLOCKS[l.b], rd=!!P.read[l.id];
  const secs=l.secs.map(s=>`<section class="lsec"><h3>${esc(s.h)}</h3>${s.p?`<p>${s.p}</p>`:""}${
    s.list?`<ul>${s.list.map(x=>`<li>${x}</li>`).join("")}</ul>`:""}${
    s.cli?`<pre class="cli">${esc(s.cli)}</pre>`:""}${s.fig?drawFig(s.fig):""}</section>`).join("");
  card.innerHTML=`<div class="chead"><span class="dtag">${wire(b)}${esc(b.n)}</span><span class="day">День ${l.day} · ${esc(DAYS[l.day]||"")}</span><span class="badge">≈${l.min} мин</span>${rd?'<span class="badge q">прочитано</span>':""}<span class="pos">${i+1} / ${L.length}</span></div>
    <div class="lect"><h2 class="q">${esc(l.t)}</h2><p class="llead">${l.lead}</p>${secs}
    <div class="lkey"><span class="stepchip"><b>Запомнить</b></span><ul>${l.key.map(k=>`<li>${k}</li>`).join("")}</ul></div>
    <div id="laskwrap"></div></div>`;
  linkTerms(card);
  renderLAsk();
  $("controls").innerHTML=(rd?'<button class="btn primary" data-act="lnext">Дальше →</button>'
      :'<button class="btn primary" data-act="ldone">Прочитано · дальше →</button><button class="btn" data-act="lnext">Пропустить</button>')
    +`<button class="btn" data-act="trainday" data-day="${l.day}">Карточки дня ${l.day}</button>`
    +(i>0?'<button class="btn ghost" data-act="lprev">← Назад</button>':"")
    +'<button class="btn ghost spacer" data-act="llist">Все лекции</button>';
}
