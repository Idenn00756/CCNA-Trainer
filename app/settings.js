/* Тренажёр CCNA · меню настроек: блоки курса, цель дня, тема, сброс */
"use strict";

/* ═══ Настройки ═══════════════════════════════════════ */
let SET_OPEN=false;
function applyTheme(){
  const t=P.ui.theme||"system", r=document.documentElement;
  if(t==="system") r.removeAttribute("data-theme"); else r.setAttribute("data-theme",t);
}
function openSettings(){ SET_OPEN="set"; renderSettings(); }
function closeSettings(){ SET_OPEN=false; const o=$("ovl"), p=$("setp"); if(o) o.hidden=true; if(p){ p.hidden=true; p.innerHTML=""; } }
function renderSettings(){
  const o=$("ovl"), p=$("setp"); if(!o||!p||SET_OPEN!=="set") return;
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
