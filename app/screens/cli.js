/* Тренажёр CCNA · режим «Команды»: ввод команд IOS */
"use strict";

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
