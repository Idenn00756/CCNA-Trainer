/* Тренажёр CCNA · показ разбора на экране и кнопка отзыва */
"use strict";

/* ═══ Разбор в поле зрения и отзывы ═══════════════════ */
// после ответа подтягиваем разбор к верху экрана, если он оказался ниже середины
function showResult(sel){
  requestAnimationFrame(()=>{
    const r=document.querySelector(sel||"#card .res"); if(!r) return;
    const top=r.getBoundingClientRect().top;
    if(top>window.innerHeight*0.55) window.scrollBy({top:top-Math.min(110,window.innerHeight*0.15),behavior:"smooth"});
  });
}
let COMMENTS=null, COMMENTS_OFF=false;
function decorateFeedback(){
  if(!COMMENTS||COMMENTS_OFF) return;
  const h=document.querySelector("#card .chead"); if(!h||h.querySelector(".fb")) return;
  h.insertAdjacentHTML("beforeend",'<button class="mini fb" data-act="feedback" aria-label="Оставить отзыв об этом задании">Отзыв</button>');
}
async function openFeedback(){
  if(!COMMENTS||COMMENTS_OFF) return;
  try{ await COMMENTS.openComposer({element:$("card")}); }
  catch(e){ if(e&&(e.code==="unavailable"||e.code==="not_granted"||e.code==="forbidden")){ COMMENTS_OFF=true; document.querySelectorAll(".fb").forEach(b=>b.remove()); } }
}
