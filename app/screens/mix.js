/* Тренажёр CCNA · режим «Микс»: сборка смешанной сессии и её итоги */
"use strict";

/* ═══ Режим «Микс» ════════════════════════════════════
   Одна сессия из карточек, задач, команд, кейсов и сопоставлений */
const MIX={items:[],i:0,res:[],built:false,counted:false};
const inMix=()=>P.ui.mode==="mix";
const MIX_TYPE={card:"карточка",prac:"задача",cli:"команды",case:"кейс",match:"сопоставление"};
function mixResult(ok){ if(inMix()&&MIX.res[MIX.i]===undefined) MIX.res[MIX.i]=!!ok; }
function mixRequeue(item){ MIX.items.splice(Math.min(MIX.i+4,MIX.items.length),0,item); }
function buildMix(){
  const now=Date.now(), p=pool();
  const due=shuffle(p.filter(q=>P.cards[q.id]&&P.cards[q.id].due<=now)), fresh=shuffle(p.filter(q=>!P.cards[q.id]));
  const cards=due.concat(fresh).slice(0,10).map(q=>({type:"card",q}));
  const drill=["subnet","bin","route","mac","packet"], score=k=>{const b=P.sub.by[k];return b&&b.n?b.ok/b.n:-1;};
  const prac=drill.map(k=>[k,score(k)+Math.random()*0.05]).sort((a,b)=>a[1]-b[1]).slice(0,3).map(([k])=>({type:"prac",topic:k}));
  const pickTodo=(list,doneOf,n)=>{const todo=list.filter(x=>!doneOf(x));return (todo.length?todo:shuffle(list.slice())).slice(0,n);};
  const cl=pickTodo(cliList(),t=>P.cli[t.id]&&P.cli[t.id].done,2).map(t=>({type:"cli",id:t.id}));
  const cs=pickTodo(caseList(),c=>P.cases[c.id]&&P.cases[c.id].done,2).map(c=>({type:"case",id:c.id}));
  const mt=shuffle(matchList().slice()).slice(0,2).map(m=>({type:"match",id:m.id}));
  const others=shuffle(prac.concat(cl,cs,mt)), items=[]; let o=0;
  cards.forEach((c,i)=>{ items.push(c); if(i%2===1&&o<others.length) items.push(others[o++]); });
  while(o<others.length) items.push(others[o++]);
  Object.assign(MIX,{items,i:0,res:[],built:true,counted:false});
  mixMount();
}
function mixMount(){
  const it=MIX.items[MIX.i]; if(!it) return;
  if(it.type==="card"){ Object.assign(S,{queue:[it.q],qi:0,picked:new Set(),answered:false,ok:null,ahead:false,focus:""}); resetAsk(null); }
  else if(it.type==="prac"){ PR.task=D.gen(it.topic,{stype:"all",srange:"24"}); Object.assign(PR,{checked:false,res:null,vals:[],sels:[],picked:new Set(),note:"",t0:Date.now()}); }
  else if(it.type==="cli"){ const L=cliList(), k=L.findIndex(t=>t.id===it.id); cliOpen(k<0?0:k); }
  else if(it.type==="case") caseOpen(CASES.find(c=>c.id===it.id));
  else if(it.type==="match") matchOpen(MATCH.find(m=>m.id===it.id));
}
function mixNext(){
  if(MIX.res[MIX.i]===undefined) MIX.res[MIX.i]=false;              // пропущенное считается несделанным
  MIX.i++;
  if(MIX.i>=MIX.items.length){ if(!MIX.counted){ MIX.counted=true; P.mix.n=(P.mix.n||0)+1; save(); } }
  else mixMount();
  render(); window.scrollTo({top:0});
  const v=effView(); if(v==="cli") focusCli(); else if(v==="case") focusCase();
}
function renderMix(){
  if(!MIX.built) buildMix();
  if(!MIX.items.length){
    $("card").innerHTML='<div class="empty"><b>Нечего собрать</b><span>В выбранных блоках нет заданий. Включите блоки выше.</span></div>';
    $("controls").innerHTML=""; return;
  }
  if(MIX.i>=MIX.items.length){ renderMixSummary(); return; }
  const t=MIX.items[MIX.i].type;
  if(t==="card") renderCards(); else if(t==="prac") renderPractice(); else if(t==="cli") renderCli(); else if(t==="case") renderCase(); else renderMatch();
}
function renderMixSummary(){
  const types=[["card","Карточки"],["prac","Задачи"],["cli","Команды"],["case","Кейсы"],["match","Сопоставление"]];
  const rows=types.map(([t,l])=>{
    const idx=MIX.items.map((it,i)=>it.type===t?i:-1).filter(i=>i>=0); if(!idx.length) return "";
    const ok=idx.filter(i=>MIX.res[i]).length;
    return `<div class="wrow"><div class="w-name">${l}<span>${ok} из ${idx.length} без ошибок</span></div><div class="w-bar"><i style="width:${(ok/idx.length*100).toFixed(1)}%"></i></div><div class="w-val">${pct(ok,idx.length)}</div><span></span></div>`;
  }).join("");
  const total=MIX.items.length, ok=MIX.res.filter(Boolean).length, sh=total?ok/total*100:0;
  $("card").innerHTML=`<div class="sum"><h2>Микс пройден</h2>
    <div class="score"><span class="big">${pct(ok,total)}</span><span class="sub">${ok} из ${total} заданий без ошибок · цель дня ${Math.round(Math.min(1,dayRatio(P.days[dayKey(Date.now())]))*100)}%</span></div>
    ${pingBlock(sh>=85?"cheer":sh>=50?"happy":"sad",sh>=85?"mixHi":sh>=50?"mixMid":"mixLow")}
    <div class="wlist">${rows}</div></div>`;
  $("controls").innerHTML='<button class="btn primary" data-act="mixnew">Собрать новый микс</button><button class="btn ghost" data-mode="prog">Прогресс и достижения</button>';
}
