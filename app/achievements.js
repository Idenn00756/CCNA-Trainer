/* Тренажёр CCNA · достижения и всплывающие уведомления о них */
"use strict";

/* ═══ Достижения ══════════════════════════════════════ */
const AICON={
 frame:'<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M4 10h16"/>',
 check:'<circle cx="12" cy="12" r="8"/><path d="M8.5 12.2l2.4 2.4 4.6-5"/>',
 link:'<path d="M10 14a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7l-1.1 1.1"/><path d="M14 10a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 0 0 5.7 5.7l1.1-1.1"/>',
 flag:'<path d="M6 20V4M6 5h11l-2 4 2 4H6"/>',
 table:'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16M4 14.5h16M10 5v14"/>',
 hourglass:'<path d="M7 4h10M7 20h10M8 4c0 5 8 5 8 8s-8 3-8 8M16 4c0 5-8 5-8 8s8 3 8 8"/>',
 wire:'<path d="M5 19c0-8 14-6 14-14"/><circle cx="5" cy="19" r="1.6"/><circle cx="19" cy="5" r="1.6"/>',
 grid:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 4v16M4 12h16M8 4v8M4 8h8"/>',
 clock:'<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
 bits:'<path d="M6 7v10M10 7h3v10h-3zM17 7v10"/>',
 route:'<circle cx="6" cy="17" r="2"/><circle cx="18" cy="7" r="2"/><path d="M8 17h4a4 4 0 0 0 4-4V9"/>',
 term:'<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M7.5 10l2.5 2-2.5 2M12 14.5h4"/>',
 spark:'<path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5L9 9M15 15l2.5 2.5M17.5 6.5L15 9M9 15l-2.5 2.5"/>',
 book:'<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5z"/><path d="M5 20.5V5.5"/>',
 chat:'<path d="M5 6h14v9H10l-4 3v-3H5z"/>',
 search:'<circle cx="11" cy="11" r="6"/><path d="M15.5 15.5L20 20"/>',
 pairs:'<rect x="3.5" y="4.5" width="7" height="6" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="6" rx="1.5"/><path d="M10.5 7.5H17v6"/>',
 mix:'<path d="M4 7h3l10 10h3M4 17h3l3-3M14 10l3-3h3"/>',
 slides:'<rect x="3.5" y="4.5" width="17" height="12" rx="2"/><path d="M12 16.5v3M8.5 19.5h7M7 9h6M7 12h4"/>'
};
const okOf=k=>{const b=P.sub.by[k];return b?b.ok||0:0;};
const daySum=f=>Object.values(P.days).reduce((s,d)=>s+(d[f]||0),0);
// ответы по записям карточек и по дневной статистике: верный ответ без оценки есть только во второй
const cardSum=f=>{
  let n=0; for(const k in P.cards) n+=P.cards[k][f]||0;
  if(f==="c") return Math.max(n,daySum("cr"));
  if(f==="w") return Math.max(n,daySum("c")-daySum("cr"));
  return n;
};
const ACH=[
 {id:"first",icon:"frame",t:"Первый кадр",d:"Ответ на первую карточку",tiers:[1],v:()=>cardSum("c")+cardSum("w")},
 {id:"right",icon:"check",t:"Коммутатор знаний",d:"Правильных ответов в карточках",tiers:[10,50,200,500],v:()=>cardSum("c")},
 {id:"streak",icon:"link",t:"Без обрыва связи",d:"Дней подряд с выполненной целью",tiers:[3,7,14,30],v:()=>streaks().best},
 {id:"goal",icon:"flag",t:"Норма выполнена",d:"Дней с выполненной дневной целью",tiers:[1,10,30,60],v:()=>Object.values(P.days).filter(d=>dayRatio(d)>=1).length},
 {id:"learned",icon:"table",t:"Таблица знаний",d:"Изученных карточек",tiers:[10,40,80,BANK.length],v:()=>BANK.filter(q=>learned(q.id)).length},
 {id:"mature",icon:"hourglass",t:"Долговременная память",d:"Карточек с интервалом повторения от 21 дня",tiers:[5,25,60],v:()=>BANK.filter(q=>mastered(q.id)).length},
 {id:"wire",icon:"wire",t:"Полная жила",d:"Блоков курса, где изучены все карточки",tiers:[1,4,BLOCKS.length],v:()=>BLOCKS.filter((_,i)=>{const l=BANK.filter(q=>q.b===i);return l.length&&l.every(q=>learned(q.id));}).length},
 {id:"mixer",icon:"mix",t:"Всё и сразу",d:"Завершённых сессий «Микс»",tiers:[1,10,30],v:()=>P.mix.n||0},
 {id:"detective",icon:"search",t:"Сетевой детектив",d:"Решённых кейсов «найди неисправность»",tiers:[1,5,CASES.length||13],v:()=>CASES.filter(c=>P.cases[c.id]&&P.cases[c.id].done).length},
 {id:"pairs",icon:"pairs",t:"Всё по полочкам",d:"Наборов на сопоставление без единой ошибки",tiers:[3,10,30],v:()=>P.match.perfect||0},
 {id:"subnet",icon:"grid",t:"Подсетевой ас",d:"Верно решённых задач по подсетям",tiers:[10,50,150,400],v:()=>okOf("subnet")},
 {id:"speed",icon:"clock",t:"Быстрый расчёт",d:"Лучшее время верной задачи по подсетям",tiers:[20000,12000,8000,5000],low:true,v:()=>{const b=P.sub.by.subnet;return b&&b.best?b.best:0;}},
 {id:"bin",icon:"bits",t:"Двоичный код",d:"Верных переводов между системами счисления",tiers:[10,50,150],v:()=>okOf("bin")},
 {id:"path",icon:"route",t:"Путь пакета",d:"Верных задач: MAC-таблица, выбор маршрута, жизнь пакета",tiers:[10,40,120],v:()=>okOf("mac")+okOf("route")+okOf("packet")},
 {id:"cli",icon:"term",t:"Консольный кабель",d:"Решённых задач на команды IOS",tiers:[5,15,CLI.length],v:()=>CLI.filter(t=>P.cli[t.id]&&P.cli[t.id].done).length},
 {id:"clean",icon:"spark",t:"Без опечаток",d:"Задач на команды без ошибок и подсказок",tiers:[3,10,25],v:()=>CLI.filter(t=>{const r=P.cli[t.id];return r&&r.done&&!r.err&&!r.hints;}).length},
 {id:"lect",icon:"slides",t:"Слушатель курса",d:"Прочитанных мини-лекций",tiers:[1,5,LESSONS.length||15],v:()=>LESSONS.filter(l=>P.read[l.id]).length},
 {id:"terms",icon:"book",t:"Словарь сетевика",d:"Открытых пояснений к терминам",tiers:[5,25,75],v:()=>Object.keys(P.terms).length},
 {id:"curious",icon:"chat",t:"Любопытство",d:"Вопросов, заданных Claude",tiers:[1,10,30],v:()=>P.asks||0}
];
const achIcon=a=>`<svg viewBox="0 0 24 24" aria-hidden="true">${AICON[a.icon]||AICON.spark}</svg>`;
function achState(a){
  const v=a.v(); let lvl=0;
  a.tiers.forEach((t,i)=>{ if(a.low?(v>0&&v<=t):v>=t) lvl=i+1; });
  return {v,lvl,next:a.tiers[lvl]};
}
let ACH_ON=false; const toastQ=[]; let toastBusy=false;
// уже заработанное записывается без уведомлений
function achSilent(){ ACH.forEach(a=>{ const s=achState(a), prev=(P.ach[a.id]&&P.ach[a.id].lvl)||0; if(s.lvl>prev) P.ach[a.id]={lvl:s.lvl,at:Date.now()}; }); }
function checkAch(){
  if(!ACH_ON) return;
  ACH.forEach(a=>{
    const s=achState(a), prev=(P.ach[a.id]&&P.ach[a.id].lvl)||0;
    if(s.lvl>prev){ P.ach[a.id]={lvl:s.lvl,at:Date.now()}; toastQ.push({a,lvl:s.lvl}); }
  });
  if(toastQ.length&&!toastBusy) showToast();
}
function showToast(){
  const it=toastQ.shift(); if(!it){toastBusy=false;return;}
  toastBusy=true;
  const el=document.createElement("div"), n=it.a.tiers.length;
  el.className="toast"; el.setAttribute("role","status");
  el.innerHTML=`<span class="medal on">${achIcon(it.a)}</span><div><span class="toast-l">Новое достижение${n>1?` · уровень ${it.lvl} из ${n}`:""}</span><b>${esc(it.a.t)}</b></div>`;
  document.body.appendChild(el);
  requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add("in")));
  setTimeout(()=>{ el.classList.remove("in"); setTimeout(()=>{ el.remove(); showToast(); },320); },3400);
}
