/* Тренажёр CCNA · интервальное повторение: расчёт следующего показа */
"use strict";

/* ═══ Интервальное повторение (упрощённый SM-2) ════════
   grade: 0 — не знал, 1 — трудно, 2 — хорошо, 3 — легко */
function schedule(r0,grade){
  const r=Object.assign({s:0,c:0,w:0,reps:0,lapses:0,ease:2.5,ivl:0,due:0},r0||{});
  if(grade===0){ r.lapses++; r.reps=0; r.ease=Math.max(1.3,r.ease-0.2); r.ivl=0; }
  else{
    if(r.reps===0) r.ivl = grade===1?1 : grade===2?(r.lapses?1:2) : 4;
    else if(grade===1){ r.ease=Math.max(1.3,r.ease-0.15); r.ivl=Math.max(r.ivl+1,Math.round(r.ivl*1.2)); }
    else if(grade===2){ r.ivl=Math.max(r.ivl+1,Math.round(r.ivl*r.ease)); }
    else { r.ease=Math.min(3,r.ease+0.15); r.ivl=Math.max(r.ivl+2,Math.round(r.ivl*r.ease*1.3)); }
    r.reps++;
  }
  r.due=Date.now()+r.ivl*DAY;
  return r;
}
const learned=id=>{const r=P.cards[id];return !!r&&r.reps>0;};
const mastered=id=>{const r=P.cards[id];return !!r&&r.ivl>=MATURE;};
function fmtIvl(d){if(d<1)return "сегодня";if(d<30)return d+" д";if(d<365)return Math.round(d/30)+" мес";return (d/365).toFixed(1).replace(".",",")+" г";}
function fmtWhen(ms){const h=ms/36e5;if(h<1)return "меньше часа";if(h<24)return Math.round(h)+" ч";return Math.round(h/24)+" д";}
