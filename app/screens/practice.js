/* Тренажёр CCNA · практика: генераторы задач и проверка ответов */
"use strict";

/* ═══ Практика: генераторы задач ══════════════════════ */
const PR={task:null,domTask:null,checked:false,t0:0,vals:[],sels:[],picked:new Set(),res:null,count:0,streak:0,note:""};
const PTOPICS=D.topics.concat([["case","кейсы"],["match","сопоставление"]]);
function prNew(){
  const topic=["case","match"].includes(P.ui.topic)?"mix":P.ui.topic;
  PR.task=D.gen(topic,{stype:P.ui.stype,srange:P.ui.srange});
  Object.assign(PR,{checked:false,res:null,vals:[],sels:[],picked:new Set(),note:"",t0:Date.now()}); PR.count++;
}
function prNext(){
  if(inMix()){ mixNext(); return; }
  prNew(); render(); const el=$("pf0"); if(el) el.focus({preventScroll:true});
}
function prRead(){
  const t=PR.task; if(!t||PR.domTask!==t||PR.checked) return;
  PR.vals=(t.fields||[]).map((_,i)=>{const el=$("pf"+i);return el?el.value:(PR.vals[i]||"");});
  PR.sels=(t.selects||[]).map((_,i)=>{const el=$("ps"+i);return el?el.value:(PR.sels[i]||"");});
}
function prPick(i){
  const t=PR.task; if(!t||PR.checked||!t.choice) return;
  prRead();
  if(t.choice.multi){ PR.picked.has(i)?PR.picked.delete(i):PR.picked.add(i); render(); }
  else { PR.picked=new Set([i]); if(!(t.fields||[]).length&&!(t.selects||[]).length) prCheck(false); else render(); }
}
function prCheck(showOnly){
  const t=PR.task; if(!t||PR.checked) return;
  prRead();
  if(!showOnly){
    const fe=(t.fields||[]).findIndex((_,i)=>!String(PR.vals[i]||"").trim());
    const se=(t.selects||[]).findIndex((_,i)=>PR.sels[i]==="");
    const ce=!!t.choice&&!PR.picked.size;
    if(fe>=0||se>=0||ce){
      PR.note=ce&&fe<0&&se<0?"Выберите вариант ответа.":"Заполните все поля.";
      render(); const el=fe>=0?$("pf"+fe):se>=0?$("ps"+se):null; if(el) el.focus(); return;
    }
  }
  const pf=(t.fields||[]).map((f,i)=>!showOnly&&D.check(f,PR.vals[i]));
  const ps=(t.selects||[]).map((s,i)=>!showOnly&&PR.sels[i]!==""&&+PR.sels[i]===s.ans);
  const pc=!t.choice||(!showOnly&&PR.picked.size===t.choice.ans.length&&t.choice.ans.every(i=>PR.picked.has(i)));
  const ok=!showOnly&&pf.every(Boolean)&&ps.every(Boolean)&&pc, ms=Date.now()-PR.t0;
  PR.checked=true; PR.note=""; PR.res={ok,ms,showOnly:!!showOnly,pf,ps};
  const by=P.sub.by[t.topic]||(P.sub.by[t.topic]={n:0,ok:0,ms:0,best:0});
  P.sub.n++; by.n++; bump("p"); mixResult(ok);
  if(ok){ P.sub.ok++; P.sub.ms+=ms; P.sub.best=P.sub.best?Math.min(P.sub.best,ms):ms; by.ok++; by.ms+=ms; by.best=by.best?Math.min(by.best,ms):ms; PR.streak++; bump("pr"); }
  else PR.streak=0;
  stopTimer(); save(); render(); showResult(); if(ok) pingCelebrate(PR.streak);
}
let tick=null;
function stopTimer(){if(tick){clearInterval(tick);tick=null;}}
function startTimer(){stopTimer(); tick=setInterval(()=>{const el=$("prTime"); if(el&&PR.task&&!PR.checked) el.textContent=fmtS(Date.now()-PR.t0);},100);}

function renderPractice(){
  if(!PR.task) prNew();
  prRead();
  const t=PR.task, r=PR.res, by=P.sub.by[t.topic], card=$("card");
  const fields=(t.fields||[]).map((f,i)=>{
    const im=f.kind==="hex"?"text":(f.kind==="ip"||f.kind==="prefix")?"decimal":"numeric";
    return `<div class="fld"><label for="pf${i}">${esc(f.label)}</label><input id="pf${i}" class="${r?(r.pf[i]?"ok":"bad"):""}${f.kind==="ip"||f.kind==="bin"?"":" narrow"}" value="${esc(PR.vals[i]||"")}" inputmode="${im}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"${r?" readonly":""}></div>`;
  }).join("");
  let choice="";
  if(t.choice){
    const c=t.choice;
    choice=(c.multi?`<div class="tlabel">${esc(c.label||"Отметьте все подходящие")} — можно несколько</div>`:"")+`<div class="opts">${c.options.map((o,i)=>{
      let cls="opt", mark="";
      if(r){ if(c.ans.includes(i)){cls+=" ok";mark="✓";} else if(PR.picked.has(i)){cls+=" bad";mark="✕";} else cls+=" dim"; }
      else if(PR.picked.has(i)) cls+=" sel";
      return `<button class="${cls}" data-pi="${i}"${r?" disabled":""}><span class="key">${LET[i]}</span><span class="otext">${esc(o)}</span><span class="mark">${mark}</span></button>`;
    }).join("")}</div>`;
  }
  const sels=(t.selects||[]).map((s,i)=>`<div class="fld wide"><label for="ps${i}">${esc(s.label)}</label><select id="ps${i}" class="${r?(r.ps[i]?"ok":"bad"):""}"${r?" disabled":""}><option value="">— выберите —</option>${
    s.options.map((o,j)=>`<option value="${j}"${String(PR.sels[i])===String(j)?" selected":""}>${esc(o)}</option>`).join("")}</select></div>`).join("");
  let res="";
  if(r){
    const parts=[].concat((t.fields||[]).map(f=>`${esc(f.label)}: <code>${esc(D.fmt(f))}</code>`),
      t.choice?[`${t.choice.multi?esc(t.choice.label||"Ответ"):"Ответ"}: <b>${t.choice.ans.map(i=>esc(t.choice.options[i])).join(", ")}</b>`]:[],
      (t.selects||[]).map(s=>`${esc(s.label)}: <b>${esc(s.options[s.ans])}</b>`));
    const say=r.ok?pingRow("happy","pracOk"):(r.showOnly?pingRow("idle","show"):pingRow("sad","pracBad"));
    res=`<div class="res ${r.ok?"ok":"bad"}"><div class="verdict"><span class="vi">${r.ok?"✓":"✕"}</span>${r.ok?"Верно за "+fmtS(r.ms):(r.showOnly?"Ответ":"Неверно")}</div>${say}<p class="why">${parts.join("<br>")}</p><div class="hintbox">${t.hint}</div></div>`;
  }
  const pos=inMix()?`${MIX.i+1} / ${MIX.items.length}`:`задача ${PR.count}`;
  card.innerHTML=`<div class="chead"><span class="dtag">Практика</span><span class="day">${t.day?`День ${t.day} · ${esc(DAYS[t.day]||"")}`:esc(t.label)}</span>${t.day?`<span class="badge q">${esc(t.label)}</span>`:""}<span class="pos">${pos}</span></div>
    <div class="drill"><div class="dtask">${esc(t.text)}</div>${t.given?`<div class="dgiven">${esc(t.given)}</div>`:""}${t.fig?drawFig(t.fig):""}${t.code?`<pre class="cli">${esc(t.code)}</pre>`:""}
    ${fields?`<div class="dfields">${fields}</div>`:""}${choice}${sels?`<div class="dfields">${sels}</div>`:""}
    ${PR.note?`<div class="pnote">${esc(PR.note)}</div>`:""}
    <div class="timer"><span>Время <b id="prTime">${fmtS(r?r.ms:Date.now()-PR.t0)}</b></span><span>Среднее по теме <b>${by&&by.ok?fmtS(by.ms/by.ok):"—"}</b></span><span>Точность по теме <b>${by?pct(by.ok,by.n):"—"}</b></span></div></div>${res}`;
  PR.domTask=t;
  linkTerms(card);
  $("controls").innerHTML=r?`<button class="btn primary" data-act="prnext">${inMix()?"Дальше →":"Следующая задача →"}</button>`
    :'<button class="btn primary" data-act="prcheck">Проверить</button><button class="btn" data-act="prshow">Показать ответ</button><button class="btn ghost" data-act="prnext">Пропустить</button>';
  if(!r) startTimer();
}
