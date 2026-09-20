/* Тренажёр CCNA · режимы: микс, карточки, практика (задачи, кейсы, сопоставление), команды, прогресс;
   общая отрисовка, события и запуск. Использует объявления из core.js. */
"use strict";

/* ═══ Вопросы к Claude по карточке ════════════════════ */
const ASK_PRESET={simple:"Объясни правильный ответ проще, как новичку, можно с аналогией из жизни.",
  why:"Объясни, почему мой ответ неверный и в чём ошибка рассуждения.",
  example:"Приведи короткий практический пример, где это встречается в реальной сети или на экзамене."};
let ASK={qid:null,open:false,log:[],busy:false,ctl:null};
function resetAsk(qid){ if(ASK.ctl) ASK.ctl.abort(); ASK={qid,open:false,log:[],busy:false,ctl:null}; }
function cardContext(q){
  const picked=S.picked.size?[...S.picked].map(i=>LET[i]+") "+q.o[i]).join("; "):"ответ не выбран — ученик нажал «Показать ответ»";
  return `Карточка тренажёра (день ${q.day} курса — ${DAYS[q.day]||""}).
Вопрос: ${q.q}
${q.c?"Вывод или конфигурация:\n"+q.c+"\n":""}${q.fig?figText(q.fig)+"\n":""}Варианты:
${q.o.map((o,i)=>LET[i]+") "+o).join("\n")}
Верный ответ: ${q.a.map(i=>LET[i]).join(", ")}
Разбор в приложении: ${strip(q.why)}
Ответ ученика: ${picked} — ${S.ok?"верно":"неверно"}.`;
}
function askAnswerHtml(t){
  return (t.content?fmtAnswer(t.content):(t.pending?'<span class="ask-wait">Claude думает — обычно это до минуты</span>':""))
    +(t.note?`<div class="ask-note">${esc(t.note)}</div>`:"");
}
function renderAsk(){
  const w=$("askwrap"); if(!w) return;
  const q=S.queue[S.qi];
  if(!q||!S.answered||!SAMPLE){ w.innerHTML=""; return; }
  if(ASK.qid!==q.id) resetAsk(q.id);
  if(SAMPLE_OFF&&!ASK.log.length){ w.innerHTML=""; return; }
  if(!ASK.open){ w.innerHTML='<button class="btn askbtn" data-act="askopen">Спросить Claude об этой карточке</button>'; return; }
  const chips=[["simple","Объясни проще"]].concat(S.ok?[]:[["why","Почему мой ответ неверный?"]],[["example","Пример из практики"]]);
  const log=ASK.log.map((t,i)=>t.role==="user"?`<div class="ask-q">${esc(t.show)}</div>`
    :`<div class="ask-a"${i===ASK.log.length-1?' id="askLast"':""}>${askAnswerHtml(t)}</div>`).join("");
  const controls=SAMPLE_OFF?"":ASK.busy?'<div class="ask-row"><button class="btn" data-act="askstop">Остановить</button></div>'
    :`<div class="ask-chips">${chips.map(([k,l])=>`<button class="mini chipq" data-ask="${k}">${l}</button>`).join("")}</div>
      <div class="ask-row"><input id="askIn" placeholder="Свой вопрос по этой карточке" autocomplete="off" enterkeyhint="send" aria-label="Вопрос к Claude"><button class="btn" data-act="asksend">Спросить</button></div>`;
  w.innerHTML=`<div class="askbox"><div class="ask-h"><b>Вопрос к Claude</b><span>ответ тратит лимиты вашего аккаунта и может содержать ошибки</span></div>${log?`<div class="ask-log">${log}</div>`:""}${controls}</div>`;
  const lg=w.querySelector(".ask-log"); if(lg) lg.scrollTop=lg.scrollHeight;
}
async function askCard(textShow){
  const q=S.queue[S.qi];
  if(!SAMPLE||SAMPLE_OFF||ASK.busy||!q||!S.answered||!String(textShow).trim()) return;
  const first=!ASK.log.some(t=>t.role==="user");
  ASK.log.push({role:"user",show:textShow,content:first?`${RULES}\n\n${cardContext(q)}\n\nВопрос ученика: ${textShow}`:textShow});
  const turns=ASK.log.filter(t=>t.role==="user"||t.content).map(t=>({role:t.role,content:t.content}));
  const input=turns.length>9?[turns[0]].concat(turns.slice(-8)):turns;
  const ans={role:"assistant",content:"",pending:true}; ASK.log.push(ans);
  const ctl=new AbortController(), mine=ASK;
  ASK.busy=true; ASK.ctl=ctl; P.asks=(P.asks||0)+1; save(); renderAsk();
  try{
    const r=await SAMPLE(input,{cache:false,signal:ctl.signal,onText:({text})=>{
      ans.content=text; ans.pending=false;
      const el=$("askLast"); if(el&&ASK===mine) el.innerHTML=askAnswerHtml(ans);
    }});
    ans.content=r.text; if(r.truncated) ans.note="Ответ обрезан — попробуйте спросить уже.";
  }catch(e){ ans.content=(e&&e.text)||""; ans.note=sampleErr(e); }
  finally{ ans.pending=false; if(ASK===mine){ ASK.busy=false; ASK.ctl=null; renderAsk(); } }
}

/* ═══ Режим «Микс» ════════════════════════════════════
   Одна сессия из карточек, задач, команд, кейсов и сопоставлений */
const MIX={items:[],i:0,res:[],built:false,counted:false};
const inMix=()=>P.ui.mode==="mix";
const MIX_TYPE={card:"карточка",prac:"задача",cli:"команды",case:"кейс",match:"сопоставление"};
function mixResult(ok){ if(inMix()&&MIX.res[MIX.i]===undefined) MIX.res[MIX.i]=!!ok; }
function mixRequeue(item){ MIX.items.splice(Math.min(MIX.i+4,MIX.items.length),0,item); }
function buildMix(){
  const now=Date.now(), p=pool();
  const due=shuffle(p.filter(q=>P.cards[q.id]&&P.cards[q.id].due<=now)), fresh=shuffle(p.filter(q=>!P.cards[q.id]));
  const cards=due.concat(fresh).slice(0,10).map(q=>({type:"card",q}));
  const drill=["subnet","bin","route","mac","packet"], score=k=>{const b=P.sub.by[k];return b&&b.n?b.ok/b.n:-1;};
  const prac=drill.map(k=>[k,score(k)+Math.random()*0.05]).sort((a,b)=>a[1]-b[1]).slice(0,3).map(([k])=>({type:"prac",topic:k}));
  const pickTodo=(list,doneOf,n)=>{const todo=list.filter(x=>!doneOf(x));return (todo.length?todo:shuffle(list.slice())).slice(0,n);};
  const cl=pickTodo(cliList(),t=>P.cli[t.id]&&P.cli[t.id].done,2).map(t=>({type:"cli",id:t.id}));
  const cs=pickTodo(caseList(),c=>P.cases[c.id]&&P.cases[c.id].done,2).map(c=>({type:"case",id:c.id}));
  const mt=shuffle(matchList().slice()).slice(0,2).map(m=>({type:"match",id:m.id}));
  const others=shuffle(prac.concat(cl,cs,mt)), items=[]; let o=0;
  cards.forEach((c,i)=>{ items.push(c); if(i%2===1&&o<others.length) items.push(others[o++]); });
  while(o<others.length) items.push(others[o++]);
  Object.assign(MIX,{items,i:0,res:[],built:true,counted:false});
  mixMount();
}
function mixMount(){
  const it=MIX.items[MIX.i]; if(!it) return;
  if(it.type==="card"){ Object.assign(S,{queue:[it.q],qi:0,picked:new Set(),answered:false,ok:null,ahead:false,focus:""}); resetAsk(null); }
  else if(it.type==="prac"){ PR.task=D.gen(it.topic,{stype:"all",srange:"24"}); Object.assign(PR,{checked:false,res:null,vals:[],sels:[],picked:new Set(),note:"",t0:Date.now()}); }
  else if(it.type==="cli"){ const L=cliList(), k=L.findIndex(t=>t.id===it.id); cliOpen(k<0?0:k); }
  else if(it.type==="case") caseOpen(CASES.find(c=>c.id===it.id));
  else if(it.type==="match") matchOpen(MATCH.find(m=>m.id===it.id));
}
function mixNext(){
  if(MIX.res[MIX.i]===undefined) MIX.res[MIX.i]=false;              // пропущенное считается несделанным
  MIX.i++;
  if(MIX.i>=MIX.items.length){ if(!MIX.counted){ MIX.counted=true; P.mix.n=(P.mix.n||0)+1; save(); } }
  else mixMount();
  render(); window.scrollTo({top:0});
  const v=effView(); if(v==="cli") focusCli(); else if(v==="case") focusCase();
}
function renderMix(){
  if(!MIX.built) buildMix();
  if(!MIX.items.length){
    $("card").innerHTML='<div class="empty"><b>Нечего собрать</b><span>В выбранных блоках нет заданий. Включите блоки выше.</span></div>';
    $("controls").innerHTML=""; return;
  }
  if(MIX.i>=MIX.items.length){ renderMixSummary(); return; }
  const t=MIX.items[MIX.i].type;
  if(t==="card") renderCards(); else if(t==="prac") renderPractice(); else if(t==="cli") renderCli(); else if(t==="case") renderCase(); else renderMatch();
}
function renderMixSummary(){
  const types=[["card","Карточки"],["prac","Задачи"],["cli","Команды"],["case","Кейсы"],["match","Сопоставление"]];
  const rows=types.map(([t,l])=>{
    const idx=MIX.items.map((it,i)=>it.type===t?i:-1).filter(i=>i>=0); if(!idx.length) return "";
    const ok=idx.filter(i=>MIX.res[i]).length;
    return `<div class="wrow"><div class="w-name">${l}<span>${ok} из ${idx.length} без ошибок</span></div><div class="w-bar"><i style="width:${(ok/idx.length*100).toFixed(1)}%"></i></div><div class="w-val">${pct(ok,idx.length)}</div><span></span></div>`;
  }).join("");
  const total=MIX.items.length, ok=MIX.res.filter(Boolean).length, sh=total?ok/total*100:0;
  $("card").innerHTML=`<div class="sum"><h2>Микс пройден</h2>
    <div class="score"><span class="big">${pct(ok,total)}</span><span class="sub">${ok} из ${total} заданий без ошибок · цель дня ${Math.round(Math.min(1,dayRatio(P.days[dayKey(Date.now())]))*100)}%</span></div>
    ${pingBlock(sh>=85?"cheer":sh>=50?"happy":"sad",sh>=85?"mixHi":sh>=50?"mixMid":"mixLow")}
    <div class="wlist">${rows}</div></div>`;
  $("controls").innerHTML='<button class="btn primary" data-act="mixnew">Собрать новый микс</button><button class="btn ghost" data-mode="prog">Прогресс и достижения</button>';
}

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

/* ═══ Практика: кейсы «найди неисправность» ═══════════ */
const CS={id:null,stage:"diag",pick:-1,ok:null,step:0,lines:[],err:0,stepErr:0,hints:0};
const caseList=()=>CASES.filter(c=>sel.has(c.b)).sort((a,b)=>a.day-b.day||a.id.localeCompare(b.id));
const caseCur=()=>CASES.find(c=>c.id===CS.id);
function caseOpen(c){ Object.assign(CS,{id:c?c.id:null,stage:"diag",pick:-1,ok:null,step:0,lines:[],err:0,stepErr:0,hints:0}); }
function caseFirstOpen(){ const L=caseList(); caseOpen(L.find(c=>!(P.cases[c.id]&&P.cases[c.id].done))||L[0]||null); }
function focusCase(){ const el=$("caseIn"); if(el) el.focus({preventScroll:true}); const tm=$("cterm"); if(tm) tm.scrollTop=tm.scrollHeight; }
function caseFinish(){
  const c=caseCur(); if(!c) return;
  CS.stage="done";
  const prev=P.cases[c.id];
  P.cases[c.id]={done:true,diag:!!CS.ok||!!(prev&&prev.diag),err:CS.err,hints:CS.hints,at:Date.now()};
  save();
}
function casePick(i){
  const c=caseCur(); if(!c||CS.stage!=="diag"||CS.pick!==-1) return;
  CS.pick=i; CS.ok=i===c.a; bump("p"); if(CS.ok) bump("pr"); mixResult(CS.ok);
  if(!c.fix) caseFinish(); else save();
  render(); showResult();
}
function caseHint(silent){
  const c=caseCur(); if(!c||CS.stage!=="fix") return;
  CS.hints++; CS.lines.push({k:"hint",c:"! подсказка: "+c.fix.steps[CS.step][2]});
  if(!silent){ render(); focusCase(); }
}
function caseEnter(raw){
  const c=caseCur(); if(!c||CS.stage!=="fix") return;
  const typed=String(raw).trim(), v=typed.toLowerCase().replace(/\s+/g," ");
  if(!v) return;
  if(v==="?"){ caseHint(); return; }
  const st=c.fix.steps[CS.step];
  if(st[1].test(v)){ CS.lines.push({k:"ok",p:st[0],c:typed}); CS.step++; CS.stepErr=0; if(CS.step>=c.fix.steps.length) caseFinish(); }
  else {
    CS.err++; CS.stepErr++;
    CS.lines.push({k:"ok",p:st[0],c:typed});
    CS.lines.push({k:"err",c:"% Эта команда не подходит для текущего шага."+(CS.stepErr<3?" Введите ? для подсказки.":"")});
    if(CS.stepErr===3) caseHint(true);
  }
  render(); if(CS.stage==="done") showResult("#card .casefix .verdict"); else focusCase();
}
function caseNext(){
  if(inMix()){ mixNext(); return; }
  const L=caseList(), k=L.findIndex(c=>c.id===CS.id);
  caseOpen(L.length?L[(k+1)%L.length]:null); render(); window.scrollTo({top:0});
}
function renderCase(){
  if(!CS.id||!caseCur()) caseFirstOpen();
  const c=caseCur(), card=$("card");
  if(!c){
    card.innerHTML='<div class="empty"><b>Здесь пока нет кейсов</b><span>Для выбранных блоков кейсов нет. Включите другие блоки выше.</span></div>';
    $("controls").innerHTML=""; return;
  }
  const b=BLOCKS[c.b], L=caseList(), rec=P.cases[c.id], answered=CS.pick!==-1;
  const opts=c.o.map((t,i)=>{
    let cls="opt", mark="";
    if(answered){ if(i===c.a){cls+=" ok";mark="✓";} else if(i===CS.pick){cls+=" bad";mark="✕";} else cls+=" dim"; }
    return `<button class="${cls}" data-ci="${i}"${answered?" disabled":""}><span class="key">${LET[i]}</span><span class="otext">${esc(t)}</span><span class="mark">${mark}</span></button>`;
  }).join("");
  const outs=(c.outs||[]).map(([l,o])=>`<div class="out"><span class="out-l">${esc(l)}</span><pre class="cli">${esc(o)}</pre></div>`).join("");
  let diag="";
  if(answered){
    const others=c.o.map((_,i)=>(i!==c.a&&i!==CS.pick&&c.no&&c.no[i])?`<li><span class="k">${LET[i]}</span><span>${c.no[i]}</span></li>`:"").join("");
    const say=CS.ok?pingRow("happy","caseOk"):(CS.pick>=0?pingRow("sad","caseBad"):pingRow("idle","show"));
    diag=`<div class="res ${CS.ok?"ok":"bad"}"><div class="verdict"><span class="vi">${CS.ok?"✓":"✕"}</span>${CS.ok?"Диагноз верный":(CS.pick>=0?"Неверно":"Ответ")} — ${LET[c.a]}</div>${say}<p class="why">${c.why}</p>${
      CS.pick>=0&&!CS.ok?`<div class="yours"><span class="lbl">Ваш ответ — ${LET[CS.pick]}</span>${(c.no&&c.no[CS.pick])||""}</div>`:""}${
      others?`<details class="others"><summary>Почему не остальные</summary><ul>${others}</ul></details>`:""}</div>`;
  }
  let fix="";
  if(c.fix&&CS.stage!=="diag"){
    const hist=(CS.lines.length?"":'<div class="hintline">! вводите команды по одной и нажимайте Enter; сокращения IOS принимаются</div>')
      +CS.lines.map(l=>l.k==="ok"?`<div><span class="pr">${esc(l.p)}</span> <span class="cmd">${esc(l.c)}</span></div>`
        :l.k==="err"?`<div class="err">${esc(l.c)}</div>`:`<div class="hintline">${esc(l.c)}</div>`).join("");
    const input=CS.stage==="fix"?`<div class="termin"><span class="pr">${esc(c.fix.steps[CS.step][0])}</span><input id="caseIn" aria-label="Команда IOS" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="send"></div>`:"";
    const done=CS.stage==="done"?`<div class="verdict" style="color:var(--ok)"><span class="vi" style="background:var(--ok)">✓</span>Неисправность устранена${CS.err||CS.hints?` · ошибок ${CS.err}, подсказок ${CS.hints}`:""}</div>${pingRow("cheer","caseFix")}<p class="why">${c.fix.why}</p>`:"";
    fix=`<div class="casefix"><span class="stepchip"><b>Шаг 2</b> · исправление</span><div class="dtask">${esc(c.fix.t)}</div><div class="term" id="cterm">${hist}${input}</div>${done}</div>`;
  }
  const pos=inMix()?`${MIX.i+1} / ${MIX.items.length}`:`${Math.max(1,L.findIndex(x=>x.id===c.id)+1)} / ${L.length}`;
  card.innerHTML=`<div class="chead"><span class="dtag">${wire(b)}${esc(b.n)}</span><span class="day">День ${c.day} · ${esc(DAYS[c.day]||"")}</span><span class="badge">кейс</span>${rec&&rec.done?'<span class="badge q">решён</span>':""}<span class="pos">${pos}</span></div>
    <div class="qbody"><h2 class="q">${esc(c.title)}</h2><p class="case-story">${esc(c.story)}</p>${c.fig?drawFig(c.fig):""}<div class="outs">${outs}</div>
    <span class="stepchip"><b>Шаг 1</b> · диагноз</span><div class="dtask">${esc(c.q)}</div><div class="opts">${opts}</div></div>${diag}${fix}`;
  linkTerms(card);
  const ctr=$("controls");
  if(!answered) ctr.innerHTML='<button class="btn" data-act="casereveal">Не знаю — показать ответ</button><button class="btn ghost" data-act="casenext">Пропустить</button>';
  else if(c.fix&&CS.stage==="diag") ctr.innerHTML='<button class="btn primary" data-act="casefix">Исправить неисправность →</button><button class="btn ghost" data-act="casenext">Пропустить исправление</button>';
  else if(CS.stage==="fix") ctr.innerHTML='<button class="btn" data-act="casehint">Подсказать</button><button class="btn ghost" data-act="casenext">Пропустить</button>';
  else ctr.innerHTML=`<button class="btn primary" data-act="casenext">${inMix()?"Дальше →":"Следующий кейс →"}</button>`;
  const tm=$("cterm"); if(tm) tm.scrollTop=tm.scrollHeight;
}

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

/* ═══ Режим «Команды» ═════════════════════════════════ */
const C={i:-1,step:0,lines:[],err:0,stepErr:0,hints:0,done:false};
const cliList=()=>CLI.filter(t=>sel.has(t.b)).sort((a,b)=>a.day-b.day||a.id.localeCompare(b.id));
function cliOpen(i){const L=cliList(); Object.assign(C,{i:L.length?clamp(i,0,L.length-1):-1,step:0,lines:[],err:0,stepErr:0,hints:0,done:false});}
function cliFirstOpen(){const L=cliList(), k=L.findIndex(t=>!(P.cli[t.id]&&P.cli[t.id].done)); cliOpen(k<0?0:k);}
const cliCur=()=>cliList()[C.i];
function focusCli(){const el=$("cliIn"); if(el) el.focus({preventScroll:true}); const tm=$("term"); if(tm) tm.scrollTop=tm.scrollHeight;}
function cliHint(silent){
  const t=cliCur(); if(!t||C.done) return;
  C.hints++; C.lines.push({k:"hint",c:"! подсказка: "+t.steps[C.step][2]});
  if(!silent){render(); focusCli();}
}
function cliEnter(raw){
  const t=cliCur(); if(!t||C.done) return;
  const typed=String(raw).trim(), v=typed.toLowerCase().replace(/\s+/g," ");
  if(!v) return;
  if(v==="?"){ cliHint(); return; }
  const st=t.steps[C.step];
  if(st[1]&&st[1].test(v)){
    C.lines.push({k:"ok",p:st[0],c:typed}); C.step++; C.stepErr=0;
    if(C.step>=t.steps.length){
      C.done=true; bump("k"); mixResult(C.err+C.hints===0);
      const prev=P.cli[t.id], cur={done:true,err:C.err,hints:C.hints,at:Date.now()};
      if(!prev||!prev.done||cur.err+cur.hints<=(prev.err||0)+(prev.hints||0)) P.cli[t.id]=cur;
      save();
    }
  } else {
    C.err++; C.stepErr++;
    C.lines.push({k:"ok",p:st[0],c:typed});
    C.lines.push({k:"err",c:"% Эта команда не подходит для текущего шага."+(C.stepErr<3?" Введите ? для подсказки.":"")});
    if(C.stepErr===3) cliHint(true);
  }
  render(); if(C.done) showResult(); else focusCli();
}
function cliGo(i){ cliOpen(i); render(); focusCli(); }
function cliNextAction(){ if(inMix()){ mixNext(); return; } const L=cliList(); cliGo(C.i+1>=L.length?0:C.i+1); }
function renderCli(){
  const L=cliList();
  if(C.i<0||C.i>=L.length) cliFirstOpen();
  const t=L[C.i], card=$("card");
  if(!t){
    card.innerHTML='<div class="empty"><b>Здесь пока нет задач</b><span>В выбранных блоках нет упражнений на команды. Включите другие блоки выше.</span></div>';
    $("controls").innerHTML=""; return;
  }
  const b=BLOCKS[t.b], rec=P.cli[t.id];
  const hist=(C.lines.length?"":'<div class="hintline">! вводите команды по одной и нажимайте Enter; сокращения IOS принимаются</div>')
    +C.lines.map(l=>l.k==="ok"?`<div><span class="pr">${esc(l.p)}</span> <span class="cmd">${esc(l.c)}</span></div>`
      :l.k==="err"?`<div class="err">${esc(l.c)}</div>`:`<div class="hintline">${esc(l.c)}</div>`).join("");
  const input=C.done?"":`<div class="termin"><span class="pr">${esc(t.steps[C.step][0])}</span><input id="cliIn" aria-label="Команда IOS" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="send"></div>`;
  const clean=!C.err&&!C.hints;
  const res=C.done?`<div class="res ok"><div class="verdict"><span class="vi">✓</span>Задача решена${clean?" без ошибок":` · ошибок ${C.err}, подсказок ${C.hints}`}</div>${clean?pingRow("cheer","cliClean"):pingRow("happy","cliOk")}<p class="why">${t.why}</p></div>`:"";
  const pos=inMix()?`${MIX.i+1} / ${MIX.items.length}`:`${C.i+1} / ${L.length}`;
  card.innerHTML=`<div class="chead"><span class="dtag">${wire(b)}${esc(b.n)}</span><span class="day">День ${t.day} · ${esc(DAYS[t.day]||"")}</span>${rec&&rec.done?'<span class="badge q">решена</span>':""}<span class="pos">${pos}</span></div>
    <div class="qbody"><h2 class="q">${esc(t.t)}</h2><div class="timer"><span>${C.done?"готово":`шаг <b>${C.step+1}</b> из ${t.steps.length}`}</span></div><div class="term" id="term">${hist}${input}</div></div>${res}`;
  linkTerms(card);
  const prev=!inMix()&&C.i>0?'<button class="btn ghost spacer" data-act="cliprev">← Предыдущая</button>':"";
  $("controls").innerHTML=C.done
    ?`<button class="btn primary" data-act="clinext">${inMix()?"Дальше →":"Следующая задача →"}</button>${inMix()?"":'<button class="btn" data-act="cliredo">Решить заново</button>'}${prev}`
    :`<button class="btn" data-act="clihint">Подсказать</button><button class="btn ghost" data-act="clinext">Пропустить</button>${prev}`;
  const tm=$("term"); if(tm) tm.scrollTop=tm.scrollHeight;
}

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

/* ═══ Главный экран ═══════════════════════════════════ */
const meterHtml=(label,v,g)=>`<div class="meter"><div class="mt-h"><span>${label}</span><b>${v}${g?` / ${g}`:""}</b></div><div class="mt-bar"><i style="width:${g?Math.min(100,v/g*100).toFixed(1):(v?100:0)}%"></i></div></div>`;
// одна кнопка «Продолжить»: незаконченный микс → повторение → непрочитанная лекция → новый микс
function homeNext(){
  if(MIX.built&&MIX.items.length&&MIX.i<MIX.items.length)
    return {act:"mix",label:`Продолжить микс · ${MIX.i+1} из ${MIX.items.length}`,sub:"сессия начата и ждёт"};
  const c=counts();
  if(c.due) return {act:"cards",label:`Повторить карточки · ${c.due}`,sub:"подошёл срок повторения — самое полезное на сегодня"};
  const u=lectList().find(l=>!P.read[l.id]);
  if(u&&!c.fresh) return {act:"lect",label:`Читать лекцию дня ${u.day}`,sub:u.t};
  return {act:"newmix",label:"Собрать микс дня",sub:"задания вперемешку: карточки, задачи, команды, кейсы и сопоставления"};
}
function homeGo(){
  const n=homeNext();
  if(n.act==="mix") setMode("mix");
  else if(n.act==="cards"){ buildQueue(); setMode("cards"); }
  else if(n.act==="lect"){ const u=lectList().find(l=>!P.read[l.id]); if(u) lectOpen(u.id); setMode("lect"); }
  else { MIX.built=false; setMode("mix"); }
}
function renderHome(){
  const c=counts(), L=lectList(), st=streaks(), tk=dayKey(Date.now()), d=P.days[tk]||{c:0,p:0};
  const gc=+P.goal.cards||0, gp=+P.goal.prac||0, n=homeNext();
  const lread=L.filter(l=>P.read[l.id]).length;
  const cl=cliList(), cliDone=cl.filter(t=>P.cli[t.id]&&P.cli[t.id].done).length;
  const got=ACH.reduce((s,a)=>s+achState(a).lvl,0);
  const tiles=[
    ["mix","Микс",P.mix.n||0,"пройдено сессий"],
    ["lect","Лекции",`${lread}/${L.length}`,"прочитано"],
    ["cards","Карточки",c.due,`к повторению · изучено ${c.learned} из ${c.total}`],
    ["prac","Практика",P.sub.n||0,`задач решено · точность ${pct(P.sub.ok,P.sub.n)}`],
    ["cli","Команды",`${cliDone}/${cl.length}`,"задач на команды IOS"],
    ["prog","Прогресс",st.cur,`${plural(st.cur,"день","дня","дней")} подряд · достижений ${got}`]
  ].map(([m,name,v,s])=>`<button class="htile" data-mode="${m}"><span class="ht-n">${name}</span><b>${v}</b><span class="ht-s">${esc(s)}</span></button>`).join("");
  const stage=[...sel].sort((a,b)=>a-b).map(i=>BLOCKS[i]&&BLOCKS[i].n).filter(Boolean).join(" · ");
  $("card").innerHTML=`<div class="home">${pingStatusBlock()}
    <div class="hgo"><button class="btn primary big" data-act="go">${esc(n.label)}</button><span class="hgo-s">${esc(n.sub)}</span></div>
    <div class="meters">${meterHtml("Карточки сегодня",d.c||0,gc)}${gp?meterHtml("Задачи сегодня",d.p||0,gp):""}</div>
    <div class="htiles">${tiles}</div>
    <div class="hstage">Этап курса: <b>${esc(stage||"не выбран")}</b><button class="mini" data-act="settings">изменить</button></div></div>`;
  linkTerms($("card"));
  $("controls").innerHTML="";
}

/* ═══ Настройки ═══════════════════════════════════════ */
let SET_OPEN=false;
function applyTheme(){
  const t=P.ui.theme||"system", r=document.documentElement;
  if(t==="system") r.removeAttribute("data-theme"); else r.setAttribute("data-theme",t);
}
function openSettings(){ SET_OPEN=true; renderSettings(); }
function closeSettings(){ SET_OPEN=false; const o=$("ovl"), p=$("setp"); if(o) o.hidden=true; if(p){ p.hidden=true; p.innerHTML=""; } }
function renderSettings(){
  const o=$("ovl"), p=$("setp"); if(!o||!p||!SET_OPEN) return;
  const seg=(attr,list,cur)=>list.map(([k,l])=>`<button data-${attr}="${k}" aria-pressed="${String(cur)===String(k)}">${l}</button>`).join("");
  p.innerHTML=`<div class="set-top"><b>Настройки</b><button class="mini" data-act="setclose" aria-label="Закрыть">Закрыть</button></div>
    <div class="set-sec"><span class="set-h">Этап курса</span>
      <div class="filters">${chipsFor("cards")}</div>
      <div class="toolrow"><button class="mini" data-act="early">Дни 1–15</button><button class="mini" data-act="all">Все блоки</button></div>
      <span class="set-note">Карточки, лекции и задания берутся только из выбранных блоков.</span></div>
    <div class="set-sec"><span class="set-h">Цель дня</span>
      <div class="toolrow"><span class="tlabel">карточек</span><div class="seg">${seg("goalc",[[10,"10"],[20,"20"],[40,"40"]],P.goal.cards)}</div></div>
      <div class="toolrow"><span class="tlabel">задач</span><div class="seg">${seg("goalp",[[0,"без задач"],[5,"5"],[10,"10"],[20,"20"]],P.goal.prac)}</div></div>
      <span class="set-note">День засчитывается в серию, когда выполнена вся дневная цель.</span></div>
    <div class="set-sec"><span class="set-h">Оформление</span>
      <div class="seg">${seg("th",[["system","как в системе"],["light","светлое"],["dark","тёмное"]],P.ui.theme||"system")}</div></div>
    <div class="set-sec"><span class="set-h">Пинг</span>
      <div class="seg">${seg("pingon",[[1,"подсказывает"],[0,"молчит"]],pingOn()?1:0)}</div></div>
    <div class="set-sec"><span class="set-h">Новые карточки</span>
      <div class="seg"><button data-ord="shuffle" aria-pressed="${!P.ui.ordered}">вперемешку</button><button data-ord="course" aria-pressed="${P.ui.ordered}">по дням курса</button></div></div>
    <div class="set-sec"><span class="set-h">Данные</span>
      <button class="btn set-danger" data-act="reset">${resetArmed?"Нажмите ещё раз — прогресс удалится":"Сбросить прогресс"}</button>
      <span class="set-note">Удалит ответы, серию дней и отметки о прочитанных лекциях${db?" — здесь и в облаке":" на этом устройстве"}.</span></div>
    <div class="set-sec"><span class="set-h">О приложении</span>
      <span class="set-note">Карточек ${BANK.length}, лекций ${LESSONS.length}, терминов ${G.length}, задач на команды ${CLI.length}, кейсов ${CASES.length}.<br>Курс: <a href="https://www.youtube.com/playlist?list=PLxbwE86jKRgMpuZuLBivzlM8s2Dk5lXBQ" target="_blank" rel="noopener">Jeremy’s IT Lab — Free CCNA v1.1</a></span>
      ${COMMENTS&&!COMMENTS_OFF?'<button class="mini" data-act="feedback">Оставить отзыв о приложении</button>':""}</div>`;
  o.hidden=false; p.hidden=false;
}

/* ═══ Режим «Прогресс» ════════════════════════════════ */
function renderProgress(){
  const tk=dayKey(Date.now()), today=P.days[tk]||{c:0,cr:0,p:0,pr:0,k:0}, st=streaks(), gc=+P.goal.cards, gp=+P.goal.prac;
  const meter=(label,v,g)=>`<div class="meter"><div class="mt-h"><span>${label}</span><b>${v}${g?` / ${g}`:""}</b></div><div class="mt-bar"><i style="width:${g?Math.min(100,v/g*100).toFixed(1):(v?100:0)}%"></i></div></div>`;
  const tc=cardSum("c"), tw=cardSum("w");
  const tiles=[["Серия дней",st.cur],["Лучшая серия",st.best],["Ответов в карточках",tc+tw],["Точность карточек",pct(tc,tc+tw)],["Сессий «Микс»",P.mix.n||0]]
    .map(([l,v])=>`<div class="tile"><span>${l}</span><b>${v}</b></div>`).join("");

  const now=new Date(), t0=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const start=new Date(t0); start.setDate(t0.getDate()-((t0.getDay()+6)%7)-28);
  let cells="";
  for(let i=0;i<35;i++){
    const d=new Date(start); d.setDate(start.getDate()+i);
    const k=dayKey(d), future=d>t0, rec=P.days[k], ratio=dayRatio(rec);
    const lvl=future?"f":ratio>=1?4:ratio>2/3?3:ratio>1/3?2:ratio>0?1:0;
    const lab=d.toLocaleDateString("ru-RU",{day:"numeric",month:"long"});
    const desc=future?`${lab} — ещё впереди`:`${lab}: карточек ${rec?rec.c:0}, задач ${rec?rec.p:0}, цель ${Math.round(ratio*100)}%`;
    cells+=`<button class="hc h${lvl}${k===tk?" today":""}" data-heat="${esc(desc)}" aria-label="${esc(desc)}"${future?" disabled":""}></button>`;
  }
  const trows=[]; for(let i=0;i<14;i++){ const d=new Date(t0); d.setDate(t0.getDate()-i); const rec=P.days[dayKey(d)];
    trows.push(`<tr><td>${d.toLocaleDateString("ru-RU",{day:"numeric",month:"short",weekday:"short"})}</td><td>${rec?rec.c:0}</td><td>${rec?rec.cr:0}</td><td>${rec?rec.p:0}</td><td>${rec?rec.k:0}</td><td>${Math.round(dayRatio(rec)*100)}%</td></tr>`); }

  const byDay={};
  BANK.forEach(q=>{const r=P.cards[q.id]; if(!r) return; const o=byDay[q.day]||(byDay[q.day]={c:0,w:0}); o.c+=r.c||0; o.w+=r.w||0;});
  const weak=Object.keys(byDay).map(d=>{const o=byDay[d],n=o.c+o.w;return {d:+d,c:o.c,n,acc:n?o.c/n:0};})
    .filter(x=>x.n>=3).sort((a,b)=>a.acc-b.acc).slice(0,6);
  const wrow=(name,sub,val,v,act)=>`<div class="wrow"><div class="w-name">${name}<span>${sub}</span></div><div class="w-bar"><i style="width:${(v*100).toFixed(1)}%"></i></div><div class="w-val">${val}</div>${act}</div>`;
  const weakHtml=weak.length?weak.map(x=>wrow(`День ${x.d} · ${esc(DAYS[x.d]||"")}`,`${x.c} из ${x.n} верно`,Math.round(x.acc*100)+"%",x.acc,
      `<button class="mini" data-act="trainday" data-day="${x.d}">Тренировать</button>`)).join("")
    :'<div class="pg-empty">Слабые места появятся, когда по какому-нибудь дню курса наберётся хотя бы три ответа.</div>';
  const errN=BANK.filter(q=>{const r=P.cards[q.id];return r&&r.lapses>0;}).length;

  const topics=D.topics.filter(t=>t[0]!=="mix").map(([k,l])=>{
    const b=P.sub.by[k];
    return b&&b.n?wrow(esc(l),`${b.n} ${plural(b.n,"задача","задачи","задач")}${b.ok?` · среднее ${fmtS(b.ms/b.ok)}`:""}`,pct(b.ok,b.n),b.ok/b.n,`<button class="mini" data-act="traintopic" data-t="${k}">Тренировать</button>`)
      :wrow(esc(l),"ещё не решали","—",0,`<button class="mini" data-act="traintopic" data-t="${k}">Начать</button>`);
  }).join("");
  const casesDone=CASES.filter(c=>P.cases[c.id]&&P.cases[c.id].done).length, casesDiag=CASES.filter(c=>P.cases[c.id]&&P.cases[c.id].diag).length;
  const mt=P.match||{n:0,perfect:0};
  const extra=wrow("Кейсы «найди неисправность»",`решено ${casesDone} из ${CASES.length}, диагноз с первой попытки — ${casesDiag}`,`${casesDone}/${CASES.length}`,CASES.length?casesDone/CASES.length:0,'<button class="mini" data-act="traintopic" data-t="case">Открыть</button>')
    +wrow("Сопоставление",mt.n?`наборов ${mt.n}, без ошибок ${mt.perfect}`:"ещё не решали",mt.n?pct(mt.perfect,mt.n):"—",mt.n?mt.perfect/mt.n:0,'<button class="mini" data-act="traintopic" data-t="match">Открыть</button>');

  const cliDone=CLI.filter(t=>P.cli[t.id]&&P.cli[t.id].done).length, cliClean=CLI.filter(t=>{const r=P.cli[t.id];return r&&r.done&&!r.err&&!r.hints;}).length;
  const lread=LESSONS.filter(l=>P.read[l.id]).length;
  const got=ACH.reduce((s,a)=>s+achState(a).lvl,0), all=ACH.reduce((s,a)=>s+a.tiers.length,0);
  const achs=ACH.map(a=>{
    const s=achState(a), n=a.tiers.length, max=s.lvl>=n, target=max?a.tiers[n-1]:s.next;
    const prog=max?1:a.low?(s.v?Math.min(1,target/s.v):0):Math.min(1,s.v/target);
    const val=max?"максимальный уровень":a.low?(s.v?`лучшее ${fmtS(s.v)} · цель ${fmtS(target)}`:`цель ${fmtS(target)}`):`${s.v} из ${target}`;
    const pips=n>1?`<span class="pips" aria-label="уровень ${s.lvl} из ${n}">${a.tiers.map((_,i)=>`<i class="${i<s.lvl?"on":""}"></i>`).join("")}</span>`:"";
    return `<div class="ach${s.lvl?" got":""}"><span class="medal${s.lvl?" on":""}">${achIcon(a)}</span><div class="ach-b"><div class="ach-t"><b>${esc(a.t)}</b>${pips}</div><span class="ach-d">${esc(a.d)}</span><div class="mt-bar sm"><i style="width:${(prog*100).toFixed(1)}%"></i></div><span class="ach-v">${val}</span></div></div>`;
  }).join("");

  $("card").innerHTML=`<div class="prog">${pingStatusBlock()}
    <section class="pg-sec"><div class="pg-h">Сегодня</div>
      <div class="meters">${meter("Карточки",today.c,gc)}${gp?meter("Практика",today.p,gp):""}</div>
      <div class="tiles">${tiles}</div></section>
    <section class="pg-sec"><div class="pg-h">Достижения · открыто уровней ${got} из ${all}</div><div class="achs">${achs}</div></section>
    <section class="pg-sec"><div class="pg-h">Последние пять недель</div>
      <div class="heat-wrap"><div class="heat-days"><span>пн</span><span></span><span>ср</span><span></span><span>пт</span><span></span><span>вс</span></div><div class="heat">${cells}</div></div>
      <div class="heat-leg"><span>цель не начата</span><i style="background:var(--h0)"></i><i style="background:var(--h1)"></i><i style="background:var(--h2)"></i><i style="background:var(--h3)"></i><i style="background:var(--h4)"></i><span>выполнена</span><span class="heat-read" id="heatRead">Нажмите на день, чтобы увидеть цифры</span></div>
      <details class="pg-table"><summary>Таблицей за 14 дней</summary><div class="tw"><table><thead><tr><th>День</th><th>Карточки</th><th>Верно</th><th>Задачи</th><th>Команды</th><th>Цель</th></tr></thead><tbody>${trows.join("")}</tbody></table></div></details></section>
    <section class="pg-sec"><div class="pg-h">Слабые места в карточках</div><div class="wlist">${weakHtml}</div>
      ${errN?`<div><button class="btn" data-act="trainerr">Повторить карточки с ошибками · ${errN}</button></div>`:""}</section>
    <section class="pg-sec"><div class="pg-h">Практика по темам</div><div class="wlist">${topics}${extra}</div></section>
    <section class="pg-sec"><div class="pg-h">Мини-лекции</div><div class="wlist">${
      wrow("Теория по дням курса",lread?`осталось непрочитанных — ${LESSONS.length-lread}`:"ещё не открывали",`${lread}/${LESSONS.length}`,LESSONS.length?lread/LESSONS.length:0,'<button class="mini" data-mode="lect">Открыть</button>')
    }</div></section>
    <section class="pg-sec"><div class="pg-h">Команды IOS</div><div class="wlist">${wrow("Решено задач",`без ошибок и подсказок — ${cliClean}`,`${cliDone}/${CLI.length}`,CLI.length?cliDone/CLI.length:0,'<button class="mini" data-mode="cli">Открыть</button>')}</div></section>
  </div>`;
  $("controls").innerHTML="";
}

/* ═══ Разбор в поле зрения и отзывы ═══════════════════ */
// после ответа подтягиваем разбор к верху экрана, если он оказался ниже середины
function showResult(sel){
  requestAnimationFrame(()=>{
    const r=document.querySelector(sel||"#card .res"); if(!r) return;
    const top=r.getBoundingClientRect().top;
    if(top>window.innerHeight*0.55) window.scrollBy({top:top-Math.min(110,window.innerHeight*0.15),behavior:"smooth"});
  });
}
let COMMENTS=null, COMMENTS_OFF=false;
function decorateFeedback(){
  if(!COMMENTS||COMMENTS_OFF) return;
  const h=document.querySelector("#card .chead"); if(!h||h.querySelector(".fb")) return;
  h.insertAdjacentHTML("beforeend",'<button class="mini fb" data-act="feedback" aria-label="Оставить отзыв об этом задании">Отзыв</button>');
}
async function openFeedback(){
  if(!COMMENTS||COMMENTS_OFF) return;
  try{ await COMMENTS.openComposer({element:$("card")}); }
  catch(e){ if(e&&(e.code==="unavailable"||e.code==="not_granted"||e.code==="forbidden")){ COMMENTS_OFF=true; document.querySelectorAll(".fb").forEach(b=>b.remove()); } }
}

/* ═══ Общая отрисовка ═════════════════════════════════ */
function effView(){
  const m=P.ui.mode;
  if(m==="mix"){ const it=MIX.items[MIX.i]; return it?({card:"cards",prac:"prac",cli:"cli",case:"case",match:"match"})[it.type]:"mixsum"; }
  if(m==="prac") return P.ui.topic==="case"?"case":P.ui.topic==="match"?"match":"prac";
  return m;
}
const gauge=(l,v,cls)=>`<div class="g${cls?" "+cls:""}"><span class="gl">${l}</span><span class="gv">${v}</span></div>`;
function renderGauges(){
  const m=P.ui.mode, v=effView(), g=$("gauges"), ratio=dayRatio(P.days[dayKey(Date.now())]), goal=gauge("Цель дня",Math.round(Math.min(1,ratio)*100)+"%",ratio>=1?"done":"");
  if(m==="home"){ const c=counts(), st=streaks(); g.innerHTML=goal+gauge("Повторить",c.due,c.due?"due":"")+gauge("Серия",st.cur); }
  else if(m==="mix"){ const len=MIX.items.length, answered=MIX.res.filter(x=>x!==undefined).length; g.innerHTML=goal+gauge("Готово",`${Math.min(MIX.i,len)}/${len}`)+gauge("Верно",pct(MIX.res.filter(Boolean).length,answered)); }
  else if(m==="cards"){ const c=counts(); g.innerHTML=goal+gauge("Повторить",c.due,c.due?"due":"")+gauge("Изучено",c.learned+"/"+c.total); }
  else if(v==="case"){ const L=caseList(); g.innerHTML=goal+gauge("Решено",L.filter(c=>P.cases[c.id]&&P.cases[c.id].done).length+"/"+L.length); }
  else if(m==="lect"){ const L=lectList(); g.innerHTML=goal+gauge("Прочитано",L.filter(l=>P.read[l.id]).length+"/"+L.length); }
  else if(v==="match"){ g.innerHTML=goal+gauge("Наборов",P.match.n||0)+gauge("Без ошибок",P.match.perfect||0); }
  else if(m==="prac"){ const b=P.sub.by[PR.task?PR.task.topic:""]; g.innerHTML=goal+gauge("Точность",b?pct(b.ok,b.n):"—")+gauge("Серия",PR.streak); }
  else if(m==="cli"){ const L=cliList(), done=L.filter(t=>P.cli[t.id]&&P.cli[t.id].done).length; g.innerHTML=goal+gauge("Решено",done+"/"+L.length); }
  else { const st=streaks(); g.innerHTML=goal+gauge("Серия",st.cur)+gauge("Лучшая",st.best); }
  $("railBar").style.width=(Math.min(1,ratio)*100).toFixed(1)+"%";
}
let resetArmed=0;
function chipsFor(kind){
  return BLOCKS.map((b,i)=>{
    let n,d;
    if(kind==="cli"){ const list=CLI.filter(t=>t.b===i); n=list.length; if(!n) return ""; d=list.filter(t=>P.cli[t.id]&&P.cli[t.id].done).length; }
    else if(kind==="case"){ const list=CASES.filter(c=>c.b===i); n=list.length; if(!n) return ""; d=list.filter(c=>P.cases[c.id]&&P.cases[c.id].done).length; }
    else if(kind==="match"){ const list=MATCH.filter(x=>x.b===i); n=list.length; if(!n) return ""; d=list.filter(x=>P.match.by[x.id]&&P.match.by[x.id].perfect).length; }
    else if(kind==="lect"){ const list=LESSONS.filter(x=>x.b===i); n=list.length; if(!n) return ""; d=list.filter(x=>P.read[x.id]).length; }
    else { const list=BANK.filter(q=>q.b===i); n=list.length; d=list.filter(q=>learned(q.id)).length; }
    return `<button class="chip" data-b="${i}" aria-pressed="${sel.has(i)}">${wire(b)}${esc(b.n)}<span class="days">${esc(b.d)}</span><span class="cnt">${d}/${n}</span></button>`;
  }).join("");
}
function renderToolbar(){
  const m=P.ui.mode, v=effView(), tb=$("toolbar"), seg=(attr,list,cur)=>list.map(([k,l])=>`<button data-${attr}="${k}" aria-pressed="${String(cur)===String(k)}">${l}</button>`).join("");
  const presets='<button class="mini" data-act="early">Дни 1–15</button><button class="mini" data-act="all">Все блоки</button>';
  if(m==="home"||m==="prog"){ tb.innerHTML=""; return; }
  if(m==="mix"){
    const len=MIX.items.length, it=MIX.items[MIX.i], done=Math.min(MIX.i,len);
    tb.innerHTML=`<div class="mixbar"><span class="mixcount">${it?`${MIX.i+1} / ${len}`:`${len} / ${len}`}</span><div class="mixtrack"><i style="width:${len?(done/len*100).toFixed(1):0}%"></i></div>${it?`<span class="mtype">${MIX_TYPE[it.type]}</span>`:""}<button class="mini" data-act="mixnew">Собрать заново</button></div>
      <div class="filters">${chipsFor("cards")}</div><div class="toolrow"><span class="tlabel">Задания берутся из выбранных блоков</span>${presets}</div>`;
    return;
  }
  if(m==="lect"){
    const L=lectList();
    tb.innerHTML=`<div class="filters">${chipsFor("lect")}</div>
      <div class="toolrow"><span class="tlabel">Теория по дням курса${L.length?` · прочитано ${L.filter(l=>P.read[l.id]).length} из ${L.length}`:""}</span>${presets}${P.ui.lesson?'<button class="mini" data-act="llist">Все лекции</button>':""}</div>`;
    return;
  }
  if(m==="prac"){
    let extra="";
    if(P.ui.topic==="subnet") extra=`<div class="toolrow"><span class="tlabel">Задачи</span><div class="seg scroll">${seg("stype",D.subTypes,P.ui.stype)}</div><span class="tlabel">Префиксы</span><div class="seg">${seg("srange",D.ranges,P.ui.srange)}</div></div>`;
    else if(v==="case"||v==="match") extra=`<div class="filters">${chipsFor(v)}</div><div class="toolrow">${presets}</div>`;
    tb.innerHTML=`<div class="toolrow"><span class="tlabel">Тема</span><div class="seg scroll">${seg("topic",PTOPICS,P.ui.topic)}</div></div>${extra}`;
    return;
  }
  const row=m==="cards"
    ?`<span class="tlabel">Новые карточки</span><div class="seg"><button data-ord="shuffle" aria-pressed="${!P.ui.ordered}">вперемешку</button><button data-ord="course" aria-pressed="${P.ui.ordered}">по дням курса</button></div>${presets}`
    :`<span class="tlabel">Задачи идут по дням курса</span>${presets}`;
  tb.innerHTML=`<div class="filters">${chipsFor(m==="cli"?"cli":"cards")}</div><div class="toolrow">${row}</div>`;
}
function renderKeys(){
  const v=effView(), k=$("keys");
  k.innerHTML=v==="cards"
    ?'<span><kbd>1</kbd>…<kbd>4</kbd> выбрать</span><span><kbd>Enter</kbd> ответить / дальше</span><span>после верного ответа <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> — оценка</span><span>подчёркнутые термины открывают пояснение</span>'
    :v==="prac"?'<span><kbd>Enter</kbd> следующее поле · проверить · дальше</span><span><kbd>1</kbd>…<kbd>6</kbd> выбрать вариант</span><span>запятая вместо точки тоже подходит</span>'
    :v==="cli"?'<span><kbd>Enter</kbd> выполнить</span><span><kbd>?</kbd> подсказка</span><span>сокращения вроде <kbd>int g0/1</kbd> принимаются</span>'
    :v==="case"?'<span><kbd>1</kbd>…<kbd>4</kbd> диагноз</span><span><kbd>Enter</kbd> выполнить команду / дальше</span><span><kbd>?</kbd> подсказка</span>'
    :v==="match"?'<span>нажмите пару: элемент слева, затем справа</span>'
    :v==="lect"?'<span><kbd>←</kbd> <kbd>→</kbd> листать лекции</span><span><kbd>Esc</kbd> к списку</span><span>подчёркнутые термины открывают пояснение</span>'
    :v==="home"?'<span>кнопка сверху продолжает с того места, где вы остановились</span><span>шестерёнка справа — блоки курса, цель дня и оформление</span>'
    :'<span>день засчитывается в серию, когда выполнена вся дневная цель</span>';
}
function render(){
  const m=P.ui.mode, v=effView();
  closeGloss();
  document.querySelectorAll("#modes [data-mode]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.mode===m)));
  if(v!=="prac") stopTimer();
  const cliEl=$("cliIn"), cliKey=C.i+":"+C.step, cliVal=cliEl?cliEl.value:"";
  const caseEl=$("caseIn"), caseKey=CS.id+":"+CS.step, caseVal=caseEl?caseEl.value:"";
  if(m==="mix"&&!MIX.built) buildMix();                      // сессия собирается до панели, чтобы счётчик был верным
  renderToolbar();
  if(m==="home") renderHome();
  else if(m==="mix") renderMix();
  else if(m==="lect") renderLessons();
  else if(m==="cards") renderCards();
  else if(m==="prac"){ if(v==="case") renderCase(); else if(v==="match") renderMatch(); else renderPractice(); }
  else if(m==="cli") renderCli();
  else renderProgress();
  if(cliVal&&$("cliIn")&&cliKey===C.i+":"+C.step) $("cliIn").value=cliVal;
  if(caseVal&&$("caseIn")&&caseKey===CS.id+":"+CS.step) $("caseIn").value=caseVal;
  renderGauges(); renderKeys(); renderPing(); decorateFeedback();
}
function setMode(m){
  if(!MODES.some(x=>x[0]===m)) return;
  const from=P.ui.mode;
  if(from==="prac") prRead();
  P.ui.mode=m; save();
  if(from==="mix"&&m!=="mix"){ buildQueue(); PR.task=null; cliFirstOpen(); caseFirstOpen(); matchFirstOpen(); }   // вернуть отдельным режимам свои очереди
  if(m==="mix"&&from!=="mix"&&MIX.built&&MIX.i<MIX.items.length) mixMount();
  if(m==="prac"&&PR.task&&!PR.checked) PR.t0=Date.now();
  if(m==="cli"&&C.i<0) cliFirstOpen();
  render(); window.scrollTo({top:0});
  const v=effView(); if(v==="cli") focusCli(); else if(v==="case") focusCase();
}
function selChanged(){ saveSel(); buildQueue(); cliFirstOpen(); caseFirstOpen(); matchFirstOpen(); if(inMix()) MIX.built=false; render(); renderSettings(); }

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

/* ═══ Запуск ══════════════════════════════════════════ */
$("modes").innerHTML=MODES.map(([k,l])=>`<button data-mode="${k}" aria-pressed="${P.ui.mode===k}">${l}</button>`).join("");
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
