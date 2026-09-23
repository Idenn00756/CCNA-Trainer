/* Тренажёр CCNA · четыре основных раздела и заголовки экранов */
"use strict";

/* ═══ Нижняя навигация ════════════════════════════════ */
const NAV_IC={
 home:'<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/>',
 train:'<path d="M5 7h14M5 12h14M5 17h9"/><circle cx="18" cy="17" r="2"/>',
 mix:'<path d="M4 7h3l10 10h3M4 17h3l3-3M14 10l3-3h3"/>',
 lect:'<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5z"/><path d="M5 20.5V5.5"/>',
 cards:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18"/>',
 prac:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 4v16M4 12h16"/>',
 cli:'<rect x="3.5" y="5" width="17" height="14" rx="3"/><path d="M7.5 10l2.5 2-2.5 2M12.5 14.5h4"/>',
 prog:'<path d="M4 19V9M10 19V5M16 19v-7M21 19H3"/>',
 more:'<circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/>'
};
const NAV=[["home","Сегодня"],["lect","Лекции"],["train","Тренировка"],["prog","Прогресс"]];
const TRAINING_MODES=["train","mix","cards","prac","cli"];
const TITLES={home:["Сегодня","Твой план занятий"],train:["Тренировка","Выбери, что хочешь отработать"],mix:["Микс","задания вперемешку"],lect:["Лекции","теория по дням курса"],
  cards:["Карточки","интервальное повторение"],prac:["Практика","задачи, кейсы, сопоставление"],cli:["Команды IOS","ввод в консоли"],prog:["Прогресс","серия, достижения, слабые места"]};
function renderNav(){
  const m=P.ui.mode, nav=$("modes"); if(!nav) return;
  nav.innerHTML=NAV.map(([k,l])=>{
    const on=k==="train"?TRAINING_MODES.includes(m):k===m;
    return `<button class="tb" data-mode="${k}" aria-pressed="${on}"><svg viewBox="0 0 24 24" aria-hidden="true">${NAV_IC[k]}</svg>${l}</button>`;
  }).join("");
  const t=TITLES[m]||TITLES.home;
  $("scrTitle").textContent=t[0]; $("scrSub").textContent=t[1];
}
