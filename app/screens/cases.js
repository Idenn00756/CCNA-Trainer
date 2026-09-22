/* Тренажёр CCNA · практика: кейсы «найди неисправность» */
"use strict";

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
