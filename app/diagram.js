/* Тренажёр CCNA · схемы сети: отрисовка SVG и текстовое описание для Claude */
"use strict";

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
