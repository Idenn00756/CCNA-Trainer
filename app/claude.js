/* Тренажёр CCNA · доступ к Claude: правила ответа, форматирование, ошибки */
"use strict";

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
