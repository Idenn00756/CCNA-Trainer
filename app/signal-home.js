/* A short home screen with one next action and two clear destinations. */
"use strict";
function renderHome(){
  const c=counts(), L=lectList(), st=streaks(), n=homeNext();
  const read=L.filter(l=>P.read[l.id]).length;
  const today=P.days[dayKey(Date.now())]||{}, ratio=Math.min(1,dayRatio(today));
  $("card").innerHTML=`<div class="home signal-home">
    <div class="signal-intro"><span class="eyebrow">Сегодня</span><h2>Продолжим разбираться в сетях</h2><p>Один следующий шаг — и ты снова в деле.</p></div>
    <div class="signal-grid"><div class="signal-main">
      <section class="signal-hero"><span class="eyebrow">Следующий шаг</span><h3>${esc(n.title)}</h3><p>${esc(n.sub)}</p><button class="btn primary" data-act="go">${esc(n.label)} →</button><div class="signal-hero-art">${pingSvg("idle")}</div></section>
      <section class="signal-panel"><h3>Выбери занятие</h3><div class="signal-destinations">
        <button data-mode="lect"><span class="signal-dest-icon"><svg viewBox="0 0 24 24" aria-hidden="true">${NAV_IC.lect}</svg></span><b>Лекции</b><small>Читать курс · ${read} из ${L.length}</small><i>→</i></button>
        <button data-mode="train"><span class="signal-dest-icon"><svg viewBox="0 0 24 24" aria-hidden="true">${NAV_IC.train}</svg></span><b>Тренировка</b><small>Карточки, задачи и команды</small><i>→</i></button>
      </div></section>
    </div><aside class="signal-aside">
      <section class="signal-panel"><h3>Сегодня · ${Math.round(ratio*100)}% цели</h3>${meterHtml("Карточки",today.c||0,+P.goal.cards||0)}${meterHtml("Практика",today.p||0,+P.goal.prac||0)}<button class="mini" data-mode="prog">Посмотреть прогресс →</button></section>
      <div class="duo"><div class="stat"><div class="stat-t"><b>${st.cur}</b><span>${plural(st.cur,"день","дня","дней")} подряд</span></div></div><div class="stat"><div class="stat-t"><b>${c.learned}</b><span>карточек изучено</span></div></div></div>
      ${pingStatusBlock()}
      <section class="signal-panel"><h3>Материалы курса</h3><a class="signal-source" href="https://www.youtube.com/playlist?list=PLxbwE86jKRgMpuZuLBivzlM8s2Dk5lXBQ" target="_blank" rel="noopener">Jeremy’s IT Lab ↗<small>Видеокурс и лабораторные</small></a></section>
    </aside></div></div>`;
  $("controls").innerHTML="";
}
