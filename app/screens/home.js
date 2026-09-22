/* Тренажёр CCNA · главный экран: цель дня, серия, разделы */
"use strict";

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
  const gc=+P.goal.cards||0, gp=+P.goal.prac||0, n=homeNext(), ratio=Math.min(1,dayRatio(P.days[tk]));
  const lread=L.filter(l=>P.read[l.id]).length;
  const cl=cliList(), cliDone=cl.filter(t=>P.cli[t.id]&&P.cli[t.id].done).length;
  const R=34, C=2*Math.PI*R;                                   // кольцо дневной цели
  const rows=[
    ["cards","Карточки","интервальное повторение",c.due||"—"],
    ["lect","Лекции","теория по дням курса",`${lread}/${L.length}`],
    ["prac","Практика","подсети, кейсы, сопоставление",P.sub.n?pct(P.sub.ok,P.sub.n):"—"],
    ["cli","Команды IOS","ввод в консоли",`${cliDone}/${cl.length}`]
  ].map(([m,t,s,v])=>`<button class="row" data-mode="${m}"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true">${NAV_IC[m]}</svg></span><span class="row-t"><b>${t}</b><span>${s}</span></span><span class="val">${v}</span></button>`).join("");
  // полоса курса: закрашены дни выбранных блоков цветом их жилы
  const maxDay=63, segs=BLOCKS.map((b,i)=>{
    const days=BANK.filter(q=>q.b===i).map(q=>q.day);
    const w=(days.length?Math.max(...days)-Math.min(...days)+1:0)/maxDay*100;
    return `<i style="width:${w.toFixed(1)}%;background:${sel.has(i)?b.w:"var(--card-3)"}"></i>`;
  }).join("");
  const stage=[...sel].sort((a,b)=>a-b).map(i=>BLOCKS[i]&&BLOCKS[i].d).filter(Boolean).join(", ");
  $("card").innerHTML=`<div class="home">
    <div class="hello"><button class="ava" data-act="ping" aria-label="Пинг">${pingSvg(pingMood())}</button>
      <div><h2>${st.cur?`${st.cur} ${plural(st.cur,"день","дня","дней")} подряд`:"С возвращением"}</h2><span>${esc(pingGoalLeft().c?`до цели дня — ${pingGoalLeft().c} ${plural(pingGoalLeft().c,"карточка","карточки","карточек")}`:"цель дня выполнена")}</span></div></div>

    <div class="goalcard">
      <div class="ring"><svg viewBox="0 0 78 78" width="78" height="78" aria-hidden="true">
        <circle class="track" cx="39" cy="39" r="${R}" fill="none" stroke-width="8"/>
        <circle class="fill" cx="39" cy="39" r="${R}" fill="none" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C*(1-ratio)).toFixed(1)}"/>
      </svg><span class="rv">${Math.round(ratio*100)}%</span></div>
      <div class="goal-t"><b>Цель дня</b><span>${d.c||0} из ${gc} карточек${gp?` · ${d.p||0} из ${gp} задач`:""}</span></div>
    </div>

    <button class="btn primary" data-act="go" style="text-align:left">${esc(n.label)}</button>
    <span class="tlabel" style="padding:0 2px">${esc(n.sub)}</span>

    <div class="duo">
      <div class="stat gold">${pingFlame()}<div class="stat-t"><b>${st.cur}</b><span>${plural(st.cur,"день","дня","дней")} подряд</span></div></div>
      <div class="stat"><div class="stat-t"><b>${c.learned}</b><span>карточек изучено</span></div></div>
    </div>

    <div class="rows">${rows}</div>

    <div class="coursebar">
      <div class="ch"><span>Блоки курса</span><b>${esc(stage||"не выбраны")}</b></div>
      <div class="cbar">${segs}</div>
      <button class="mini" data-act="settings" style="align-self:flex-start;padding-left:0">Изменить состав</button>
    </div>

    ${pingStatusBlock()}</div>`;
  linkTerms($("card"));
  $("controls").innerHTML="";
}
