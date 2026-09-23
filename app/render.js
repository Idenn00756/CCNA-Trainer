/* Тренажёр CCNA · общая отрисовка: выбор экрана, шапка, показатели, подсказки клавиш */
"use strict";

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
  if(m==="home"||m==="train"){ const c=counts(), st=streaks(); g.innerHTML=goal+gauge("Повторить",c.due,c.due?"due":"")+gauge("Серия",st.cur); }
  else if(m==="mix"){ const len=MIX.items.length, answered=MIX.res.filter(x=>x!==undefined).length; g.innerHTML=goal+gauge("Готово",`${Math.min(MIX.i,len)}/${len}`)+gauge("Верно",pct(MIX.res.filter(Boolean).length,answered)); }
  else if(m==="cards"){ const c=counts(); g.innerHTML=goal+gauge("Повторить",c.due,c.due?"due":"")+gauge("Изучено",c.learned+"/"+c.total); }
  else if(v==="case"){ const L=caseList(); g.innerHTML=goal+gauge("Решено",L.filter(c=>P.cases[c.id]&&P.cases[c.id].done).length+"/"+L.length); }
  else if(m==="lect"){
    const L=lectList(), guided=L.filter(courseEnabled);
    g.innerHTML=goal+gauge("Прочитано",L.filter(l=>P.read[l.id]).length+"/"+L.length)
      +(guided.length?gauge("Освоено",guided.filter(l=>P.course[l.day]?.reviewPassedAt).length+"/"+guided.length):"");
  }
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
  if(m==="home"||m==="train"||m==="prog"){ tb.innerHTML=""; return; }
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
    :v==="lect"?'<span>Первые 15 дней: лекция → проверка → ситуация → повторение</span><span><kbd>Esc</kbd> к списку</span><span>подчёркнутые термины открывают пояснение</span>'
    :v==="home"?'<span>кнопка сверху продолжает с того места, где вы остановились</span><span>шестерёнка справа — блоки курса, цель дня и оформление</span>'
    :v==="train"?'<span>выберите один вид упражнений или смешанную сессию</span>'
    :'<span>день засчитывается в серию, когда выполнена вся дневная цель</span>';
}
function render(){
  const m=P.ui.mode, v=effView();
  document.body.dataset.screen=m;
  closeGloss();
  renderNav();
  if(v!=="prac") stopTimer();
  const cliEl=$("cliIn"), cliKey=C.i+":"+C.step, cliVal=cliEl?cliEl.value:"";
  const caseEl=$("caseIn"), caseKey=CS.id+":"+CS.step, caseVal=caseEl?caseEl.value:"";
  if(m==="mix"&&!MIX.built) buildMix();                      // сессия собирается до панели, чтобы счётчик был верным
  renderToolbar();
  if(m==="home") renderHome();
  else if(m==="train") renderTraining();
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
  if(SET_OPEN) closeSettings();
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
