/* Тренажёр CCNA · ядро: данные, хранилище, дневная цель, интервальное повторение, схемы,
   термины, доступ к Claude, достижения и синхронизация.
   Подключается перед app.js: объявления верхнего уровня у двух файлов общие. */
"use strict";
const BLOCKS=window.BLOCKS||[], DAYS=window.DAYS||{}, BANK=window.BANK||[], CLI=window.CLI||[];
const G=window.GLOSSARY||[], D=window.DRILLS, CASES=window.CASES||[], MATCH=window.MATCH||[], MATCH_GEN=window.MATCH_GEN||{};
const LESSONS=window.LESSONS||[];
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const strip=h=>String(h).replace(/<[^>]+>/g,"");
const LET=["A","B","C","D","E","F","G","H"];
const DAY=864e5, MATURE=21, LS="ccna-trainer-v3";
const MODES=[["home","Главная"],["mix","Микс"],["lect","Лекции"],["cards","Карточки"],["prac","Практика"],["cli","Команды"],["prog","Прогресс"]];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function plural(n,one,few,many){const a=n%10,b=n%100;if(a===1&&b!==11)return one;if(a>=2&&a<=4&&(b<10||b>=20))return few;return many;}
const wire=b=>`<span class="wire${b.st?" st":""}" style="--w:${b.w}"></span>`;
const fmtS=ms=>(ms/1000).toFixed(1).replace(".",",")+" с";
const pct=(a,b)=>b?Math.round(a/b*100)+"%":"—";

/* ═══ Хранилище ═══════════════════════════════════════ */
function blank(){return {cards:{},cli:{},sub:{n:0,ok:0,ms:0,best:0,by:{}},days:{},goal:{cards:20,prac:10},terms:{},asks:0,ach:{},
  cases:{},match:{n:0,perfect:0,by:{}},mix:{n:0},read:{},
  ui:{mode:"home",sel:[0,1],ordered:false,topic:"mix",stype:"all",srange:"24",ping:true,lesson:"",theme:"system"}};}   // по умолчанию — дни 1–15
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
       read:d.read||{},ui:Object.assign(b.ui,d.ui||{})};
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
      cases:P.cases,match:P.match,mix:P.mix,read:P.read,updated:Date.now()}).catch(()=>{});
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

/* ═══ Схемы сети ══════════════════════════════════════ */
const ICON={
 pc:'<rect x="-14" y="-12" width="28" height="19" rx="2.5" class="dv"/><path d="M-7 11h14M0 7v4" class="dl"/>',
 sw:'<rect x="-21" y="-10" width="42" height="20" rx="3" class="dv"/><path d="M-11 -3h15l-3-3M11 3h-15l3 3" class="dl"/>',
 hub:'<rect x="-21" y="-10" width="42" height="20" rx="3" class="dv"/><path d="M-12 0h0M-4 0h0M4 0h0M12 0h0" class="dl" style="stroke-width:3.4"/>',
 rtr:'<circle r="15" class="dv"/><path d="M-9 -3h14l-3-3M9 3h-14l3 3" class="dl"/>',
 srv:'<rect x="-11" y="-16" width="22" height="32" rx="2.5" class="dv"/><path d="M-6 -9h12M-6 -3h12M-6 3h12" class="dl"/>',
 cloud:'<path d="M-20 10a9 9 0 0 1 1-17 12 12 0 0 1 22-5 10 10 0 0 1 17 13 6 6 0 0 1-3 9z" class="dv"/>',
 ap:'<rect x="-15" y="-2" width="30" height="11" rx="3" class="dv"/><path d="M-8 -7a11 11 0 0 1 16 0M-4 -11a17 17 0 0 1 8 0" class="dl"/>'
};
function drawFig(f){
  const N=f.n||[], out=[];
  (f.e||[]).forEach(e=>{
    const A=N[e[0]], B=N[e[1]]; if(!A||!B) return;
    const dx=B[0]-A[0], dy=B[1]-A[1], L=Math.hypot(dx,dy)||1, ux=dx/L, uy=dy/L;
    let nx=-uy, ny=ux;
    if(ny<0||(Math.abs(ny)<1e-9&&nx>0)){nx=-nx;ny=-ny;}   // нормаль всегда вниз или влево
    out.push(`<line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" class="ed${e[5]?" "+e[5]:""}"/>`);
    const label=(txt,t,off)=>{
      if(!txt) return;
      const x=A[0]+dx*t+nx*off, y=A[1]+dy*t+ny*off;
      const anchor=Math.abs(nx)>0.5?(nx*off>0?"start":"end"):"middle";
      out.push(`<text class="el${e[5]==="hl"?" acc":""}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" dy="0.35em" text-anchor="${anchor}">${esc(txt)}</text>`);
    };
    label(e[2],0.5,-11); label(e[3],0.24,14); label(e[4],0.76,14);
  });
  N.forEach(n=>{
    const [x,y,t,l,s,up]=n, subs=s?String(s).split("\n"):[];
    let g=`<g transform="translate(${x},${y})">${ICON[t]||ICON.pc}`;
    if(up){
      g+=`<text class="dn" y="-24">${esc(l)}</text>`;
      subs.forEach((ss,i)=>{g+=`<text class="ds" y="${-37-13*(subs.length-1-i)}">${esc(ss)}</text>`;});
    } else {
      g+=`<text class="dn" y="30">${esc(l)}</text>`;
      subs.forEach((ss,i)=>{g+=`<text class="ds" y="${43+13*i}">${esc(ss)}</text>`;});
    }
    out.push(g+"</g>");
  });
  return `<div class="figwrap"><svg class="fig" viewBox="0 0 ${f.w} ${f.h}" width="${f.w}" height="${f.h}" style="min-width:${Math.min(f.w,460)}px" role="img" aria-label="Схема сети">${out.join("")}</svg></div>`;
}
// текстовое описание схемы — для вопроса к Claude
function figText(f){
  const N=f.n||[];
  const nodes=N.map(n=>n[3]+(n[4]?` (${String(n[4]).replace(/\n/g,", ")})`:"")).join("; ");
  const edges=(f.e||[]).map(e=>{const a=N[e[0]],b=N[e[1]],lab=[e[3],e[2],e[4]].filter(Boolean).join(" / ");
    return `${a[3]}–${b[3]}${lab?` [${lab}]`:""}${e[5]==="hl"?" (выделено)":""}`;}).join("; ");
  return `Схема: устройства — ${nodes}. Связи — ${edges}.`;
}

/* ═══ Термины: поиск в тексте и всплывающее пояснение ══ */
function stemRe(stem){
  return stem.split(" ").map(part=>{
    const e=part.replace(/[.*+?^${}()|[\]\\\/]/g,"\\$&");
    if(/[А-Яа-яЁё]$/.test(part)){
      const f=part[0], head=/[А-Яа-яЁё]/.test(f)?"["+f.toUpperCase()+f.toLowerCase()+"]"+e.slice(1):e;
      return head+"[А-Яа-яЁё]*";                         // русская основа — любое окончание
    }
    return e+"(?![A-Za-z0-9])";                          // латиница — точное совпадение
  }).join("\\s+");
}
const GI=[]; G.forEach((g,i)=>(g.m||[]).forEach(st=>GI.push({i,len:st.length,src:stemRe(st)})));
GI.sort((a,b)=>b.len-a.len);                              // длинные термины раньше коротких
const GRE=GI.length?new RegExp("(^|[^A-Za-zА-Яа-яЁё0-9])(?:"+GI.map(x=>"("+x.src+")").join("|")+")","g"):null;

function linkTerms(root){
  if(!root||!GRE) return;
  const used=new Set(), nodes=[];
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>{
    const p=n.parentElement;
    if(!p||p.closest("code,pre,button,a,select,label,svg,textarea,.gt,.term,.opts,.askbox,.dgiven,.chead,.match,.pingsay,.pingbig")) return NodeFilter.FILTER_REJECT;
    return /[A-Za-zА-Яа-яЁё]/.test(n.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
  }});
  while(walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node=>{
    const text=node.nodeValue; let m, last=0, frag=null;
    GRE.lastIndex=0;
    while((m=GRE.exec(text))){
      let k=-1; for(let j=2;j<m.length;j++) if(m[j]!==undefined){k=j-2;break;}
      if(k<0) break;
      const gi=GI[k].i, word=m[k+2], start=m.index+m[1].length;
      if(used.has(gi)){ GRE.lastIndex=start+1; continue; }
      used.add(gi);
      if(!frag) frag=document.createDocumentFragment();
      frag.append(text.slice(last,start));
      const s=document.createElement("span");
      s.className="gt"; s.tabIndex=0; s.setAttribute("role","button"); s.dataset.g=gi; s.textContent=word;
      frag.append(s); last=start+word.length; GRE.lastIndex=last;
    }
    if(frag){ frag.append(text.slice(last)); node.replaceWith(frag); }
  });
}

let gpop=null, gAsk=null, gAnchor=null;
function closeGloss(){
  if(gAsk){gAsk.abort(); gAsk=null;}
  if(gpop){gpop.remove(); gpop=null;}
  if(gAnchor){gAnchor.removeAttribute("aria-expanded"); gAnchor=null;}
}
function openGloss(el){
  const g=G[+el.dataset.g]; if(!g) return;
  closeGloss();
  if(!P.terms[g.t]){ P.terms[g.t]=1; save(); }
  const pop=document.createElement("div");
  pop.className="gpop"; pop.setAttribute("role","dialog"); pop.setAttribute("aria-label",g.t);
  pop.innerHTML=`<div class="gp-h"><b>${esc(g.t)}</b><span class="en">${esc(g.en)}</span><button class="gp-x" data-act="gclose" aria-label="Закрыть">×</button></div>
    <p class="gp-d">${esc(g.d)}</p>
    <div class="gp-f">${g.day?`<span class="day">День ${g.day} · ${esc(DAYS[g.day]||"")}</span>`:"<span></span>"}${SAMPLE&&!SAMPLE_OFF?'<button class="mini" data-act="gask">Подробнее у Claude</button>':""}</div>
    <div class="gp-ans" hidden></div>`;
  pop._g=g;
  document.body.appendChild(pop);
  if(window.innerWidth<=620) pop.classList.add("sheet");
  else {
    const r=el.getBoundingClientRect(), w=pop.offsetWidth, h=pop.offsetHeight;
    let top=r.bottom+8; if(top+h>window.innerHeight-8&&r.top-h-8>0) top=r.top-h-8;
    pop.style.top=(top+window.scrollY)+"px";
    pop.style.left=(clamp(r.left,12,window.innerWidth-w-12)+window.scrollX)+"px";
  }
  gpop=pop; gAnchor=el; el.setAttribute("aria-expanded","true");
  const x=pop.querySelector(".gp-x"); if(x) x.focus({preventScroll:true});
}

/* ═══ Доступ к Claude ═════════════════════════════════ */
let SAMPLE=null, SAMPLE_OFF=false;
const RULES="Ты — репетитор по Cisco CCNA 200-301. Ученик готовится по курсу Jeremy's IT Lab. Отвечай по-русски, коротко (до 150 слов) и простыми словами; ключевые термины давай на русском с английским в скобках, например «корневой мост (root bridge)». Команды IOS пиши в обратных кавычках. Не выдумывай: если в задании есть неточность, скажи об этом прямо. Отвечай только по теме сетей и этого задания.";
function fmtAnswer(s){
  let h=esc(s).replace(/`([^`\n]+)`/g,"<code>$1</code>").replace(/\*\*([^*\n]+)\*\*/g,"<b>$1</b>");
  return h.split(/\n{2,}/).map(p=>"<p>"+p.replace(/\n/g,"<br>")+"</p>").join("");
}
function sampleErr(e){
  const c=e&&e.code;
  if(["not_granted","sampling_disabled","not_declared","capability_disabled","capability_removed"].includes(c)){SAMPLE_OFF=true;return "Claude недоступен на этой странице.";}
  if(c==="cancelled") return "Остановлено.";
  if(c==="rate_limited") return "Слишком много запросов или закончился лимит — попробуйте позже.";
  if(c==="session_expired") return "Войдите в claude.ai заново и повторите.";
  if(c==="refused") return "Claude не ответил на такой вопрос — переформулируйте его.";
  if(c==="prompt_too_large") return "Разговор стал слишком длинным — откройте задание заново.";
  return "Не удалось получить ответ — попробуйте ещё раз.";
}
async function askTerm(){
  if(!gpop||!SAMPLE||SAMPLE_OFF) return;
  const pop=gpop, g=pop._g, box=pop.querySelector(".gp-ans"), btn=pop.querySelector('[data-act="gask"]');
  if(btn) btn.remove();
  box.hidden=false; box.innerHTML='<span class="ask-wait">Claude думает — обычно это до минуты</span>';
  const ctl=new AbortController(); gAsk=ctl; P.asks=(P.asks||0)+1; save();
  try{
    const r=await SAMPLE(`${RULES}\n\nОбъясни термин «${g.t}» (${g.en}) подробнее, чем краткое определение: «${g.d}». Где он встречается в CCNA, с чем его легко спутать и короткий пример. До 120 слов.`,
      {signal:ctl.signal,cache:{gcTime:86400000},onText:({text})=>{ if(gpop===pop) box.innerHTML=fmtAnswer(text); }});
    if(gpop===pop) box.innerHTML=fmtAnswer(r.text);
  }catch(e){ if(gpop===pop) box.innerHTML=((e&&e.text)?fmtAnswer(e.text):"")+`<div class="ask-note">${esc(sampleErr(e))}</div>`; }
  finally{ if(gAsk===ctl) gAsk=null; }
}

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
