/* Тренажёр CCNA · вопрос к Claude по открытой карточке */
"use strict";

/* ═══ Вопросы к Claude по карточке ════════════════════ */
const ASK_PRESET={simple:"Объясни правильный ответ проще, как новичку, можно с аналогией из жизни.",
  why:"Объясни, почему мой ответ неверный и в чём ошибка рассуждения.",
  example:"Приведи короткий практический пример, где это встречается в реальной сети или на экзамене."};
let ASK={qid:null,open:false,log:[],busy:false,ctl:null};
function resetAsk(qid){ if(ASK.ctl) ASK.ctl.abort(); ASK={qid,open:false,log:[],busy:false,ctl:null}; }
function cardContext(q){
  const picked=S.picked.size?[...S.picked].map(i=>LET[i]+") "+q.o[i]).join("; "):"ответ не выбран — ученик нажал «Показать ответ»";
  return `Карточка тренажёра (день ${q.day} курса — ${DAYS[q.day]||""}).
Вопрос: ${q.q}
${q.c?"Вывод или конфигурация:\n"+q.c+"\n":""}${q.fig?figText(q.fig)+"\n":""}Варианты:
${q.o.map((o,i)=>LET[i]+") "+o).join("\n")}
Верный ответ: ${q.a.map(i=>LET[i]).join(", ")}
Разбор в приложении: ${strip(q.why)}
Ответ ученика: ${picked} — ${S.ok?"верно":"неверно"}.`;
}
function askAnswerHtml(t){
  return (t.content?fmtAnswer(t.content):(t.pending?'<span class="ask-wait">Claude думает — обычно это до минуты</span>':""))
    +(t.note?`<div class="ask-note">${esc(t.note)}</div>`:"");
}
function renderAsk(){
  const w=$("askwrap"); if(!w) return;
  const q=S.queue[S.qi];
  if(!q||!S.answered||!SAMPLE){ w.innerHTML=""; return; }
  if(ASK.qid!==q.id) resetAsk(q.id);
  if(SAMPLE_OFF&&!ASK.log.length){ w.innerHTML=""; return; }
  if(!ASK.open){ w.innerHTML='<button class="btn askbtn" data-act="askopen">Спросить Claude об этой карточке</button>'; return; }
  const chips=[["simple","Объясни проще"]].concat(S.ok?[]:[["why","Почему мой ответ неверный?"]],[["example","Пример из практики"]]);
  const log=ASK.log.map((t,i)=>t.role==="user"?`<div class="ask-q">${esc(t.show)}</div>`
    :`<div class="ask-a"${i===ASK.log.length-1?' id="askLast"':""}>${askAnswerHtml(t)}</div>`).join("");
  const controls=SAMPLE_OFF?"":ASK.busy?'<div class="ask-row"><button class="btn" data-act="askstop">Остановить</button></div>'
    :`<div class="ask-chips">${chips.map(([k,l])=>`<button class="mini chipq" data-ask="${k}">${l}</button>`).join("")}</div>
      <div class="ask-row"><input id="askIn" placeholder="Свой вопрос по этой карточке" autocomplete="off" enterkeyhint="send" aria-label="Вопрос к Claude"><button class="btn" data-act="asksend">Спросить</button></div>`;
  w.innerHTML=`<div class="askbox"><div class="ask-h"><b>Вопрос к Claude</b><span>ответ тратит лимиты вашего аккаунта и может содержать ошибки</span></div>${log?`<div class="ask-log">${log}</div>`:""}${controls}</div>`;
  const lg=w.querySelector(".ask-log"); if(lg) lg.scrollTop=lg.scrollHeight;
}
async function askCard(textShow){
  const q=S.queue[S.qi];
  if(!SAMPLE||SAMPLE_OFF||ASK.busy||!q||!S.answered||!String(textShow).trim()) return;
  const first=!ASK.log.some(t=>t.role==="user");
  ASK.log.push({role:"user",show:textShow,content:first?`${RULES}\n\n${cardContext(q)}\n\nВопрос ученика: ${textShow}`:textShow});
  const turns=ASK.log.filter(t=>t.role==="user"||t.content).map(t=>({role:t.role,content:t.content}));
  const input=turns.length>9?[turns[0]].concat(turns.slice(-8)):turns;
  const ans={role:"assistant",content:"",pending:true}; ASK.log.push(ans);
  const ctl=new AbortController(), mine=ASK;
  ASK.busy=true; ASK.ctl=ctl; P.asks=(P.asks||0)+1; save(); renderAsk();
  try{
    const r=await SAMPLE(input,{cache:false,signal:ctl.signal,onText:({text})=>{
      ans.content=text; ans.pending=false;
      const el=$("askLast"); if(el&&ASK===mine) el.innerHTML=askAnswerHtml(ans);
    }});
    ans.content=r.text; if(r.truncated) ans.note="Ответ обрезан — попробуйте спросить уже.";
  }catch(e){ ans.content=(e&&e.text)||""; ans.note=sampleErr(e); }
  finally{ ans.pending=false; if(ASK===mine){ ASK.busy=false; ASK.ctl=null; renderAsk(); } }
}
