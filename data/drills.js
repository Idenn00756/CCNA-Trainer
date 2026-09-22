/* Тренажёр CCNA · генераторы практических задач
   Задача: {topic, type, label, day, text, given, code, fig,
            fields:[{label,kind,ans}], choice:{options,ans,multi}, selects:[{label,options,ans}], hint}
   kind: ip | int | prefix | bin | hex */
(function(){
"use strict";
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const pick=a=>a[rnd(0,a.length-1)];
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function plural(n,one,few,many){const a=n%10,b=n%100;if(a===1&&b!==11)return one;if(a>=2&&a<=4&&(b<10||b>=20))return few;return many;}

/* ── адреса ── */
const toIp=n=>[n>>>24,(n>>>16)&255,(n>>>8)&255,n&255].join(".");
const maskOf=p=>p<=0?0:(0xFFFFFFFF<<(32-p))>>>0;
const ipOf=(a,b,c,d)=>(a*16777216+(b<<16)+(c<<8)+d)>>>0;
function parseIp(s){
  const m=String(s).trim().replace(/,/g,".").match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if(!m) return null; const o=m.slice(1).map(Number); if(o.some(v=>v>255)) return null;
  return ipOf(o[0],o[1],o[2],o[3]);
}
function genIp(range){
  const k=rnd(0,2);
  if(range==="8") return k===0?ipOf(rnd(1,126),rnd(0,255),rnd(0,255),rnd(0,255)):k===1?ipOf(rnd(128,191),rnd(0,255),rnd(0,255),rnd(0,255)):ipOf(rnd(192,223),rnd(0,255),rnd(0,255),rnd(0,255));
  return k===0?ipOf(10,rnd(0,255),rnd(0,255),rnd(0,255)):k===1?ipOf(172,rnd(16,31),rnd(0,255),rnd(0,255)):ipOf(192,168,rnd(0,255),rnd(0,255));
}
function netOf(ip,p){const m=maskOf(p), net=(ip&m)>>>0, bc=(net|((~m)>>>0))>>>0; return {m,net,bc};}
const contains=(net,p,ip)=>p===0||((ip&maskOf(p))>>>0)===net;
const mac=()=>{const h=()=>rnd(0,65535).toString(16).padStart(4,"0");return h()+"."+h()+"."+h();};

/* ═══ Подсети (дни 8, 13, 15) ═══════════════════════ */
function blockHint(ip,p){
  const {m,net,bc}=netOf(ip,p), names=["первый","второй","третий","четвёртый"];
  if(p%8===0) return `Маска /${p} = ${toIp(m)} — граница совпадает с октетом. Сеть <b>${toIp(net)}</b>, broadcast <b>${toIp(bc)}</b>.`;
  const k=Math.floor(p/8), sh=24-8*k, mo=(m>>>sh)&255, block=256-mo, v=(ip>>>sh)&255, start=v-(v%block);
  return `Маска /${p} = ${toIp(m)}. Интересный октет — ${names[k]}: 256 − ${mo} = <b>${block}</b>, это размер блока (block size). ${v} попадает в блок ${start}–${start+block-1}, поэтому сеть <b>${toIp(net)}</b>, broadcast <b>${toIp(bc)}</b>.`;
}
function maskHint(p){
  const full=Math.floor(p/8), rest=p%8, oct=[128,192,224,240,248,252,254][rest-1];
  return `/${p}: ${full} ${plural(full,"полный октет","полных октета","полных октетов")} по 255${rest?`, в следующем ${rest} ${plural(rest,"единичный бит","единичных бита","единичных бит")} = ${oct}`:""} → <b>${toIp(maskOf(p))}</b>. Ряд значений октета маски: 128 · 192 · 224 · 240 · 248 · 252 · 254 · 255.`;
}
function genSubnet(o){
  const lo=+o.srange||24;
  const kinds={all:["netbc","range","hosts","need","mask"],netbc:["netbc"],range:["range"],hosts:["hosts","need"],mask:["mask"]}[o.stype]||["netbc"];
  const type=pick(kinds), p=rnd(lo,30), base={topic:"subnet",type:"subnet:"+type};
  if(type==="netbc"||type==="range"){
    let ip=genIp(o.srange); const {net,bc}=netOf(ip,p);
    if(ip===net||ip===bc) ip=(net+1+(bc-net>2?rnd(0,bc-net-2):0))>>>0;
    const given=toIp(ip)+"/"+p;
    if(type==="netbc") return Object.assign(base,{label:"сеть и broadcast",day:13,given,
      text:"Найдите адрес сети (network address) и широковещательный адрес (broadcast address).",
      fields:[{label:"Адрес сети",kind:"ip",ans:net},{label:"Broadcast",kind:"ip",ans:bc}],hint:blockHint(ip,p)});
    return Object.assign(base,{label:"диапазон хостов",day:13,given,
      text:"Найдите первый и последний адреса, которые можно назначить хостам (first / last usable host).",
      fields:[{label:"Первый хост",kind:"ip",ans:(net+1)>>>0},{label:"Последний хост",kind:"ip",ans:(bc-1)>>>0}],
      hint:blockHint(ip,p)+" Первый хост — адрес сети + 1, последний — broadcast − 1."});
  }
  if(type==="hosts"){
    const h=Math.pow(2,32-p)-2;
    return Object.assign(base,{label:"число хостов",day:13,given:"/"+p,
      text:"Сколько адресов в подсети с таким префиксом можно назначить хостам (usable hosts)?",
      fields:[{label:"Хостов",kind:"int",ans:h}],
      hint:`Бит под хосты: 32 − ${p} = ${32-p}. 2<sup>${32-p}</sup> − 2 = <b>${h}</b>. Минус два — адрес сети и broadcast.`});
  }
  if(type==="need"){
    const pp=rnd(Math.max(lo,20),30), cap=Math.pow(2,32-pp)-2, prev=pp<30?Math.pow(2,31-pp)-2:0, n=rnd(prev+1,cap);
    return Object.assign(base,{label:"префикс под хосты",day:15,given:`${n} ${plural(n,"хост","хоста","хостов")}`,
      text:"Какой самый длинный префикс вместит столько хостов? Можно ввести /27, 27 или маску.",
      fields:[{label:"Префикс",kind:"prefix",ans:pp}],
      hint:pp<30?`/${pp} даёт 2<sup>${32-pp}</sup> − 2 = <b>${cap}</b> хостов — хватает. /${pp+1} дал бы только ${prev} — мало.`
        :"/30 даёт 2 хоста — самая маленькая подсеть для хостов, обычно для каналов точка-точка."});
  }
  if(Math.random()<0.5) return Object.assign(base,{label:"префикс → маска",day:8,given:"/"+p,
    text:"Запишите маску в десятичном виде (dotted decimal).",fields:[{label:"Маска",kind:"ip",ans:maskOf(p)}],hint:maskHint(p)});
  return Object.assign(base,{label:"маска → префикс",day:8,given:toIp(maskOf(p)),
    text:"Запишите маску как длину префикса (prefix length).",fields:[{label:"Префикс",kind:"prefix",ans:p}],hint:maskHint(p)});
}

/* ═══ Двоичная и шестнадцатеричная (день 7) ══════════ */
const W=[128,64,32,16,8,4,2,1];
const bin8=n=>n.toString(2).padStart(8,"0");
const hex2=n=>n.toString(16).toUpperCase().padStart(2,"0");
const hexDig=d=>d<10?String(d):"ABCDEF"[d-10]+"("+d+")";
function binHint(n){
  const parts=W.filter(w=>n&w);
  return `${n} = ${parts.length?parts.join(" + "):"0"} → <b>${bin8(n).replace(/(\d{4})(\d{4})/,"$1 $2")}</b>. Веса разрядов октета: 128 · 64 · 32 · 16 · 8 · 4 · 2 · 1 — ставим 1 там, где вес входит в сумму.`;
}
function hexHint(n){
  const hi=n>>4, lo=n&15;
  return `0x${hex2(n)} = ${hexDig(hi)} × 16 + ${hexDig(lo)} = ${hi*16} + ${lo} = <b>${n}</b>. Одна hex-цифра — ровно 4 бита: ${hex2(n)} = ${bin8(n).slice(0,4)} ${bin8(n).slice(4)}.`;
}
function genBin(){
  const k=pick(["d2b","d2b","b2d","b2d","h2d","d2h"]), n=rnd(1,255), base={topic:"bin",type:"bin:"+k};
  if(k==="d2b") return Object.assign(base,{label:"десятичное → двоичное",day:7,given:String(n),
    text:"Переведите число в двоичный вид (8 бит).",fields:[{label:"Двоичное",kind:"bin",ans:n}],hint:binHint(n)});
  if(k==="b2d") return Object.assign(base,{label:"двоичное → десятичное",day:7,given:bin8(n).replace(/(\d{4})(\d{4})/,"$1 $2"),
    text:"Переведите октет из двоичного вида в десятичный.",fields:[{label:"Десятичное",kind:"int",ans:n}],hint:binHint(n)});
  if(k==="h2d") return Object.assign(base,{label:"hex → десятичное",day:null,given:"0x"+hex2(n),
    text:"Переведите шестнадцатеричное число (hexadecimal) в десятичное.",fields:[{label:"Десятичное",kind:"int",ans:n}],hint:hexHint(n)});
  return Object.assign(base,{label:"десятичное → hex",day:null,given:String(n),
    text:"Переведите число в шестнадцатеричный вид (hexadecimal).",fields:[{label:"Hex",kind:"hex",ans:n}],hint:hexHint(n)});
}

/* ═══ Выбор маршрута (день 11) ═══════════════════════ */
function genRoute(){
  const o2=rnd(1,254), base=ipOf(10,o2,0,0), o3=rnd(1,250), n24=ipOf(10,o2,o3,0);
  const sp=rnd(25,28), blk=Math.pow(2,32-sp), sub=(n24+rnd(0,256/blk-1)*blk)>>>0;
  let o3b=rnd(1,250); while(o3b===o3) o3b=rnd(1,250);
  const sib=ipOf(10,o2,o3b,0);
  const hops=shuffle(["10.0.12.2","10.0.13.2","10.0.14.2","10.0.15.2"]);
  const routes=[{net:base,p:16,nh:hops[0]},{net:n24,p:24,nh:hops[1]},{net:sub,p:sp,nh:hops[2]},{net:sib,p:24,nh:hops[3]}];
  const hasDef=Math.random()<0.75;
  if(hasDef) routes.push({net:0,p:0,nh:"203.0.113.1"});
  routes.sort((a,b)=>a.net-b.net||a.p-b.p);

  const host=(net,p)=>(net+rnd(1,Math.pow(2,32-p)-2))>>>0;
  const c=pick(["sub","n24","n24","base","sib","out"]); let dst, guard=0;
  if(c==="sub") dst=host(sub,sp);
  else if(c==="n24"){ do{dst=host(n24,24);}while(contains(sub,sp,dst)&&guard++<50); }
  else if(c==="sib") dst=host(sib,24);
  else if(c==="base"){ do{dst=host(base,16);}while((contains(n24,24,dst)||contains(sib,24,dst))&&guard++<50); }
  else { do{dst=genIp("24");}while(contains(base,16,dst)&&guard++<50); }

  const matches=routes.filter(r=>contains(r.net,r.p,dst));
  const best=matches.length?matches.reduce((a,b)=>b.p>a.p?b:a):null;
  const opts=routes.map(r=>`${toIp(r.net)}/${r.p} → ${r.nh}`).concat(["Пакет будет отброшен"]);
  const ans=best?routes.indexOf(best):opts.length-1;

  const lines=["R1# show ip route",hasDef?"Gateway of last resort is 203.0.113.1 to network 0.0.0.0":"Gateway of last resort is not set",""]
    .concat(routes.map(r=>(r.p===0?"S*   ":"S    ")+`${toIp(r.net)}/${r.p}`.padEnd(19)+`[1/0] via ${r.nh}`));
  const rng=r=>{const {bc}=netOf(r.net,r.p); return `${toIp(r.net)}–${toIp(bc)}`;};
  let hint;
  if(best){
    hint=`Адрес ${toIp(dst)} совпадает с ${matches.length} ${plural(matches.length,"маршрутом","маршрутами","маршрутами")}: ${matches.map(r=>"/"+r.p).join(", ")}. Побеждает самый длинный префикс (longest prefix match) — <b>/${best.p}</b>, пакет уйдёт на <b>${best.nh}</b>.`;
    const missed=routes.filter(r=>r.p>best.p&&!contains(r.net,r.p,dst)&&contains(best.net,best.p,r.net));
    if(missed.length) hint+=` Более точный ${toIp(missed[0].net)}/${missed[0].p} охватывает только ${rng(missed[0])} — адрес в него не входит.`;
  } else hint=`Ни один маршрут не совпадает с ${toIp(dst)}, а маршрута по умолчанию нет — R1 <b>отбросит пакет</b> и отправит источнику ICMP Destination Unreachable.`;
  return {topic:"route",type:"route",label:"выбор маршрута",day:11,given:toIp(dst),
    text:"Какую запись таблицы R1 использует для пакета на этот адрес?",code:lines.join("\n"),
    choice:{options:opts,ans:[ans],multi:false},hint};
}

/* ═══ MAC-таблица (дни 5–6) ═══════════════════════════ */
function genMac(){
  const pcs=[1,2,3,4].map(i=>({name:"PC"+i,port:"Gi0/"+i,mac:mac()}));
  const known=new Set(shuffle([0,1,2,3]).slice(0,rnd(1,3)));
  const s=rnd(0,3), others=[0,1,2,3].filter(i=>i!==s);
  const kOthers=others.filter(i=>known.has(i)), uOthers=others.filter(i=>!known.has(i));
  const kinds=["broadcast"].concat(kOthers.length?["known","known"]:[],uOthers.length?["unknown","unknown"]:[]);
  const kind=pick(kinds);
  const d=kind==="known"?pick(kOthers):kind==="unknown"?pick(uOthers):-1;
  const dstMac=d<0?"ffff.ffff.ffff":pcs[d].mac;
  const fwd=kind==="known"?[d]:others;
  const srcKnown=known.has(s);

  const table=["SW1# show mac address-table","Vlan    Mac Address       Type        Ports","----    -----------       --------    -----"]
    .concat([...known].sort().map(i=>`   1    ${pcs[i].mac}    DYNAMIC     ${pcs[i].port}`));
  const learnOpts=[`${pcs[s].mac} → ${pcs[s].port}`,`${dstMac} → ${pcs[s].port}`,"Ничего нового — запись уже есть"];

  let hint=kind==="known"?`Адрес ${dstMac} есть в таблице на ${pcs[d].port} — кадр уходит только туда (forwarding).`
    :kind==="unknown"?`Адреса ${dstMac} в таблице нет — это unknown unicast: кадр рассылается (flooding) во все порты, кроме входящего ${pcs[s].port}.`
    :`ffff.ffff.ffff — широковещательный адрес: кадр получают все порты VLAN, кроме входящего ${pcs[s].port}.`;
  hint+=srcKnown?` MAC источника ${pcs[s].mac} уже записан на ${pcs[s].port} — таблица не меняется, обновляется только таймер записи.`
    :` Коммутатор изучает MAC источника: появится запись <b>${pcs[s].mac} → ${pcs[s].port}</b>.`;

  return {topic:"mac",type:"mac:"+kind,label:"MAC-таблица",day:6,
    text:`${pcs[s].name} отправляет кадр на ${dstMac}${d<0?" (broadcast)":""}. Отметьте порты, в которые SW1 перешлёт кадр, и выберите, что появится в таблице.`,
    code:table.join("\n"),
    fig:{w:600,h:205,n:[[300,50,"sw","SW1","",1]].concat(pcs.map((p,i)=>[90+140*i,150,"pc",p.name,p.mac])),
      e:pcs.map((p,i)=>[0,i+1,p.port,"","",i===s?"hl":""])},   // подписи портов на серединах линий: у коммутатора они слипаются
    choice:{options:pcs.map(p=>`${p.port} → ${p.name}`),ans:fwd,multi:true,label:"Порты"},
    selects:[{label:"Что появится в таблице",options:learnOpts,ans:srcKnown?2:0}],hint};
}

/* ═══ Жизнь пакета (день 12) ══════════════════════════ */
function genPacket(){
  const a=rnd(1,99), b=rnd(100,200);
  const dev=[
    {n:"PC1",mac:mac(),ip:`192.168.${a}.${rnd(10,99)}`},
    {n:"R1 Gi0/0",mac:mac(),ip:`192.168.${a}.1`},
    {n:"R1 Gi0/1",mac:mac(),ip:"10.0.12.1"},
    {n:"R2 Gi0/0",mac:mac(),ip:"10.0.12.2"},
    {n:"R2 Gi0/1",mac:mac(),ip:`192.168.${b}.1`},
    {n:"PC2",mac:mac(),ip:`192.168.${b}.${rnd(10,99)}`}
  ];
  const fwd=Math.random()<0.5, seg=rnd(0,2), pair=[[0,1],[2,3],[4,5]][seg];
  const sM=fwd?pair[0]:pair[1], dM=fwd?pair[1]:pair[0], sI=fwd?0:5, dI=fwd?5:0;
  const from=fwd?"PC1":"PC2", to=fwd?"PC2":"PC1";
  const macOpts=dev.map(x=>`${x.n} · ${x.mac}`), ipOpts=dev.map(x=>`${x.n} · ${x.ip}`);
  const code=["Устройство   MAC-адрес        IP-адрес"].concat(dev.map(x=>x.n.padEnd(13)+x.mac.padEnd(17)+x.ip)).join("\n");
  const segName=["PC1 – R1","R1 – R2","R2 – PC2"][seg];
  const hl=i=>i===seg?"hl":"";
  const hint=`IP-адреса сквозные (end-to-end): <b>${dev[sI].ip} → ${dev[dI].ip}</b> на всём пути. MAC-адреса действуют только в пределах участка: на участке ${segName} кадр идёт от <b>${dev[sM].n}</b> к <b>${dev[dM].n}</b>. На следующем переходе маршрутизатор снимет кадр и соберёт новый со своими MAC-адресами.`;
  return {topic:"packet",type:"packet",label:"жизнь пакета",day:12,
    text:`${from} отправляет пакет на ${to}. Какие адреса будут в кадре на выделенном участке ${segName}?`,
    code,
    fig:{w:640,h:130,n:[[60,45,"pc","PC1",dev[0].ip],[230,45,"rtr","R1"],[410,45,"rtr","R2"],[580,45,"pc","PC2",dev[5].ip]],
      e:[[0,1,"","","Gi0/0",hl(0)],[1,2,"","Gi0/1","Gi0/0",hl(1)],[2,3,"","Gi0/1","",hl(2)]]},
    selects:[{label:"MAC источника",options:macOpts,ans:sM},{label:"MAC назначения",options:macOpts,ans:dM},
             {label:"IP источника",options:ipOpts,ans:sI},{label:"IP назначения",options:ipOpts,ans:dI}],hint};
}

/* ═══ Проверка и формат ответа ═══════════════════════ */
function check(f,raw){
  const s=String(raw==null?"":raw).trim();
  switch(f.kind){
    case "ip": return parseIp(s)===f.ans;
    case "int": return /^\d[\d\s]*$/.test(s)&&parseInt(s.replace(/\s/g,""),10)===f.ans;
    case "prefix": { const m=s.match(/^\/?\s*(\d{1,2})$/); if(m) return +m[1]===f.ans; const ip=parseIp(s); return ip!==null&&ip===maskOf(f.ans); }
    case "bin": { const t=s.replace(/\s/g,""); return /^[01]{1,8}$/.test(t)&&parseInt(t,2)===f.ans; }
    case "hex": { const t=s.replace(/^0x/i,"").replace(/\s/g,""); return /^[0-9a-f]{1,2}$/i.test(t)&&parseInt(t,16)===f.ans; }
  }
  return false;
}
function fmt(f){
  switch(f.kind){
    case "ip": return toIp(f.ans);
    case "prefix": return "/"+f.ans;
    case "bin": return bin8(f.ans);
    case "hex": return "0x"+hex2(f.ans);
  }
  return String(f.ans);
}

const TOPICS=[["mix","всё вперемешку"],["subnet","подсети"],["bin","двоичная и hex"],["route","выбор маршрута"],["mac","MAC-таблица"],["packet","жизнь пакета"]];
const GEN={subnet:genSubnet,bin:genBin,route:genRoute,mac:genMac,packet:genPacket};
window.DRILLS={
  topics:TOPICS,
  subTypes:[["all","все"],["netbc","сеть и broadcast"],["range","диапазон хостов"],["hosts","число хостов"],["mask","маски"]],
  ranges:[["24","/24–/30"],["16","/16–/30"],["8","/8–/30"]],
  topicName:k=>(TOPICS.find(t=>t[0]===k)||[k,k])[1],
  gen(topic,opts){
    const t=topic==="mix"?pick(["subnet","bin","route","mac","packet"]):topic;
    return (GEN[t]||genSubnet)(opts||{stype:"all",srange:"24"});
  },
  check, fmt
};
})();
