/* Тренажёр CCNA · главный экран: цель дня, серия, разделы */
"use strict";

/* ═══ Главный экран ═══════════════════════════════════ */
const meterHtml=(label,v,g)=>`<div class="meter"><div class="mt-h"><span>${label}</span><b>${v}${g?` / ${g}`:""}</b></div><div class="mt-bar"><i style="width:${g?Math.min(100,v/g*100).toFixed(1):(v?100:0)}%"></i></div></div>`;
// одна кнопка «Продолжить»: незаконченный микс → повторение → новая лекция → тренировка
function homeNext(){
  if(MIX.built&&MIX.items.length&&MIX.i<MIX.items.length)
    return {act:"mix",title:"Продолжить тренировку",label:`Задание ${MIX.i+1} из ${MIX.items.length}`,sub:"Смешанная сессия ждёт тебя"};
  const c=counts();
  if(c.due) return {act:"cards",title:"Повторить изученное",label:`Повторить ${c.due} ${plural(c.due,"карточку","карточки","карточек")}`,sub:"Для этих карточек подошёл срок повторения"};
  const u=lectList().find(l=>!P.read[l.id]);
  if(u) return {act:"lect",title:u.t,label:`Открыть лекцию дня ${u.day}`,sub:"Следующая непрочитанная лекция"};
  return {act:"train",title:"Выбрать тренировку",label:"К упражнениям",sub:"Задачи, команды и диагностика в одном месте"};
}
function homeGo(){
  const n=homeNext();
  if(n.act==="mix") setMode("mix");
  else if(n.act==="cards"){ buildQueue(); setMode("cards"); }
  else if(n.act==="lect"){ const u=lectList().find(l=>!P.read[l.id]); if(u) lectOpen(u.id); setMode("lect"); }
  else setMode("train");
}
