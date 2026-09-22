/* Тренажёр CCNA · подсветка терминов в тексте и всплывающее пояснение */
"use strict";

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
