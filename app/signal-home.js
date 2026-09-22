/* Signal dashboard. Reuses existing course state and event delegation. */
function renderHome(){
  const c=counts(), L=lectList(), st=streaks(), n=homeNext();
  const next=L.find(l=>!P.read[l.id])||L[0], read=L.filter(l=>P.read[l.id]).length;
  const today=P.days[dayKey(Date.now())]||{}, ratio=Math.min(1,dayRatio(today));
  const links=[["lect","Лекции","Читать и разбираться",read+" / "+L.length],["cards","Карточки","Закрепить знания",c.due+" к повторению"],["prac","Практика","Подсети, кейсы, сопоставления","→"],["cli","Команды IOS","Настроить сеть в консоли","→"]];
  $("card").innerHTML=`<div class="home">
    <div class="signal-intro"><span class="eyebrow">Твой план на сегодня</span><h2>Продолжим разбираться в сетях</h2><p>Понимание, практика и повторение — в твоём темпе.</p></div>
    <div class="signal-grid"><div class="signal-main">
      <section class="signal-hero"><span class="eyebrow">Пинг / CCNA · следующий шаг</span><h3>${esc(next?next.t:"От знаний к практике")}</h3><p>${esc(n.sub)}</p><button class="btn primary" data-act="go">${esc(n.label)} →</button><div class="signal-hero-art">${pingSvg("idle")}</div></section>
      <section class="signal-panel"><h3>Путь к пониманию</h3><div class="signal-path">${[["lect","Понять"],["prac","Рассчитать"],["cli","Настроить"],["case","Найти сбой"]].map(([m,t],i)=>`<button ${m==="case"?'data-act="signalcase"':`data-mode="${m}"`}><i>${i+1}</i><span>${t}</span></button>`).join("")}</div></section>
      <section class="signal-panel"><h3>Твоя учебная мастерская</h3><div class="rows">${links.map(([m,t,s,v])=>`<button class="row" data-mode="${m}"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true">${NAV_IC[m]}</svg></span><span class="row-t"><b>${t}</b><span>${s}</span></span><span class="val">${v}</span></button>`).join("")}</div></section>
    </div><aside class="signal-aside">
      <section class="signal-panel"><h3>Сегодня · ${Math.round(ratio*100)}% цели</h3>${meterHtml("Карточки",today.c||0,+P.goal.cards||0)}${meterHtml("Практика",today.p||0,+P.goal.prac||0)}<button class="mini" data-act="settings">Настроить цель →</button></section>
      ${pingStatusBlock()}
      <div class="duo"><div class="stat"><div class="stat-t"><b>${st.cur}</b><span>${plural(st.cur,"день","дня","дней")} подряд</span></div></div><div class="stat"><div class="stat-t"><b>${c.learned}</b><span>карточек изучено</span></div></div></div>
      <section class="signal-panel"><h3>Материалы курса</h3><a class="signal-source" href="https://www.youtube.com/playlist?list=PLxbwE86jKRgMpuZuLBivzlM8s2Dk5lXBQ" target="_blank" rel="noopener">Jeremy’s IT Lab ↗<small>Видеокурс и лабораторные</small></a><button class="btn" data-mode="lect">Открыть лекции · ${L.length}</button></section>
    </aside></div></div>`;
  $("controls").innerHTML="";
}
document.addEventListener("click",e=>{if(e.target.closest('[data-act="signalcase"]')){P.ui.topic="case";setMode("prac");}});
