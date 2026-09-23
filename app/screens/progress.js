/* Тренажёр CCNA · экран «Прогресс»: цель, достижения, календарь, слабые места */
"use strict";

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
  const guided=LESSONS.filter(courseEnabled), mastered=guided.filter(l=>P.course[l.day]?.reviewPassedAt).length;
  const dueReviews=guided.filter(l=>{const r=P.course[l.day]||{};return r.practicePassedAt&&!r.reviewPassedAt&&r.reviewDue<=Date.now();}).length;
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
      +wrow("Освоено в учебном маршруте",dueReviews?`пора повторить ${dueReviews} ${plural(dueReviews,"урок","урока","уроков")}`:"лекция, проверка, ситуация и повторение",`${mastered}/${guided.length}`,guided.length?mastered/guided.length:0,'<button class="mini" data-mode="lect">Продолжить</button>')
    }</div></section>
    <section class="pg-sec"><div class="pg-h">Команды IOS</div><div class="wlist">${wrow("Решено задач",`без ошибок и подсказок — ${cliClean}`,`${cliDone}/${CLI.length}`,CLI.length?cliDone/CLI.length:0,'<button class="mini" data-mode="cli">Открыть</button>')}</div></section>
  </div>`;
  $("controls").innerHTML="";
}
