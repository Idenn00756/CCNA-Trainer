/* Тренажёр CCNA · дневная статистика, цель дня и серии дней */
"use strict";

/* ═══ Дневная статистика и цель ═════════════════════════ */
const dayKey=t=>{const x=new Date(t);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0");};
function bump(f){
  const k=dayKey(Date.now()), d=P.days[k]||(P.days[k]={c:0,cr:0,p:0,pr:0,k:0});
  d[f]=(d[f]||0)+1;
  const keys=Object.keys(P.days).sort(); while(keys.length>150) delete P.days[keys.shift()];
}
function dayRatio(d){
  const gc=+P.goal.cards||0, gp=+P.goal.prac||0;
  if(!d||!(gc+gp)) return 0;
  return (Math.min(d.c||0,gc)+Math.min(d.p||0,gp))/(gc+gp);
}
function streaks(){
  const now=new Date(), t=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  let cur=0, i=dayRatio(P.days[dayKey(t)])>=1?0:1;          // сегодня ещё не закрыто — считаем со вчера
  for(;;i++){ const d=new Date(t); d.setDate(t.getDate()-i); if(dayRatio(P.days[dayKey(d)])>=1) cur++; else break; }
  let best=0, run=0, prev=null;
  Object.keys(P.days).sort().forEach(k=>{
    if(dayRatio(P.days[k])>=1){ const dt=new Date(k+"T00:00:00"); run=prev&&Math.round((dt-prev)/DAY)===1?run+1:1; best=Math.max(best,run); prev=dt; }
    else { run=0; prev=null; }
  });
  return {cur,best:Math.max(best,cur)};
}
