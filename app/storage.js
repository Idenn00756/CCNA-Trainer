/* Тренажёр CCNA · хранилище прогресса: загрузка, миграции, сохранение и слияние с облаком */
"use strict";

/* ═══ Хранилище ═══════════════════════════════════════ */
function blank(){return {cards:{},cli:{},sub:{n:0,ok:0,ms:0,best:0,by:{}},days:{},goal:{cards:20,prac:10},terms:{},asks:0,ach:{},
  cases:{},match:{n:0,perfect:0,by:{}},mix:{n:0},read:{},course:{},
  ui:{mode:"home",sel:[0,1],ordered:false,topic:"mix",stype:"all",srange:"24",ping:true,lesson:"",lessonStage:"read",theme:"light"}};}   // по умолчанию — дни 1–15 и тёплая светлая тема
let P=blank();

// прогресс версии 2: {id:{s,c,w,st}} → записи интервального повторения
function migrateV2(v2){
  if(!v2||typeof v2!=="object") return;
  const now=Date.now();
  for(const k in v2){
    const r=v2[k];
    if(!r||typeof r.s!=="number"||P.cards[k]) continue;
    const st=r.st||0;
    P.cards[k]={s:r.s,c:r.c||0,w:r.w||0,reps:st,lapses:r.w||0,ease:2.5,ivl:st>=2?4:0,due:now};
  }
}
try{
  const raw=localStorage.getItem(LS);
  if(raw){
    const d=JSON.parse(raw)||{}, b=blank();
    P={cards:d.cards||{},cli:d.cli||{},sub:Object.assign(b.sub,d.sub||{}),days:d.days||{},goal:Object.assign(b.goal,d.goal||{}),
       terms:d.terms||{},asks:d.asks||0,ach:d.ach||{},cases:d.cases||{},match:Object.assign(b.match,d.match||{}),mix:Object.assign(b.mix,d.mix||{}),
       read:d.read||{},course:d.course||{},ui:Object.assign(b.ui,d.ui||{})};
    if(!P.sub.by) P.sub.by={};
    if(!P.match.by) P.match.by={};
    if(!d.mix) P.ui.mode="mix";                                  // первое открытие версии с «Миксом»
    if(!d.ui||!d.ui.theme) P.ui.mode="home";                     // первое открытие версии с главным экраном
    if(P.ui.mode==="subnet") P.ui.mode="prac";
    if(!MODES.some(m=>m[0]===P.ui.mode)) P.ui.mode="mix";
  } else {
    const old=localStorage.getItem("ccna-trainer-v2");
    if(old) migrateV2(JSON.parse(old));
  }
}catch(e){P=blank();}

let db=null, dbTimer=null;
function save(){
  checkAch();
  try{localStorage.setItem(LS,JSON.stringify(P));}catch(e){}
  if(!db) return;
  clearTimeout(dbTimer);
  dbTimer=setTimeout(()=>{
    db.doc("progress/v3").set({cards:P.cards,cli:P.cli,sub:P.sub,days:P.days,terms:P.terms,asks:P.asks,ach:P.ach,
      cases:P.cases,match:P.match,mix:P.mix,read:P.read,course:P.course,updated:Date.now()}).catch(()=>{});
  },1500);
}
function mergeRemote(d){
  const rc=d.cards||{};
  for(const k in rc){ const a=rc[k], b=P.cards[k]; if(a&&typeof a.s==="number"&&(!b||a.s>b.s)) P.cards[k]=Object.assign({},a); }
  const rl=d.cli||{};
  for(const k in rl){ const a=rl[k], b=P.cli[k]; if(a&&a.done&&(!b||!b.done||(a.at||0)>(b.at||0))) P.cli[k]=Object.assign({},a); }
  const rk=d.cases||{};
  for(const k in rk){ const a=rk[k], b=P.cases[k]; if(a&&a.done&&(!b||!b.done||(a.at||0)>(b.at||0))) P.cases[k]=Object.assign({},a); }
  const rs=d.sub; if(rs&&typeof rs.n==="number"&&rs.n>P.sub.n) P.sub=JSON.parse(JSON.stringify(rs));
  if(!P.sub.by) P.sub.by={};
  const rm=d.match; if(rm&&typeof rm.n==="number"&&rm.n>P.match.n) P.match=JSON.parse(JSON.stringify(rm));
  if(!P.match.by) P.match.by={};
  if(d.mix&&typeof d.mix.n==="number") P.mix.n=Math.max(P.mix.n||0,d.mix.n);
  const rr=d.read||{};
  for(const k in rr){ if(rr[k]&&(!P.read[k]||rr[k]<P.read[k])) P.read[k]=rr[k]; }   // храним первое прочтение
  const rcourses=d.course||{};
  for(const k in rcourses){
    const a=rcourses[k], b=P.course[k]||{}; if(!a||typeof a!=="object") continue;
    const merged=Object.assign({},b);
    for(const field of ["quizPassedAt","practicePassedAt","reviewPassedAt"])
      if(a[field]&&(!merged[field]||a[field]<merged[field])) merged[field]=a[field];
    for(const field of ["quizAttempts","quizBest","practiceAttempts","reviewAttempts"])
      merged[field]=Math.max(merged[field]||0,a[field]||0);
    merged.reviewDue=merged.reviewPassedAt?merged.reviewDue||a.reviewDue:
      Math.max(merged.reviewDue||0,a.reviewDue||0);
    P.course[k]=merged;
  }
  const rd=d.days||{};
  for(const k in rd){ const a=rd[k], b=P.days[k], sum=x=>x?(x.c||0)+(x.p||0)+(x.k||0):-1; if(a&&sum(a)>sum(b)) P.days[k]=Object.assign({},a); }
  Object.assign(P.terms,d.terms||{});
  P.asks=Math.max(P.asks||0,d.asks||0);
  const ra=d.ach||{};
  for(const k in ra){ const a=ra[k], b=P.ach[k]; if(a&&(!b||a.lvl>b.lvl)) P.ach[k]=Object.assign({},a); }
}

let sel=new Set((P.ui.sel||[]).filter(i=>i>=0&&i<BLOCKS.length));
if(!sel.size) sel=new Set([0,1]);
function saveSel(){P.ui.sel=[...sel].sort((a,b)=>a-b); save();}
