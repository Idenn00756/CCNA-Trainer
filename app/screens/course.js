/* Guided learning for days 1–15: read, recall, apply, revisit later. */
"use strict";

const COURSE={day:0,stage:"",questions:[],answers:[],i:0,done:false,score:0,practice:null,picked:-1,practiceChecked:false};
const courseEnabled=l=>!!l&&l.day>=1&&l.day<=15&&!!window.COURSE_CHECKS[l.day];
const courseRecord=day=>P.course[day]||(P.course[day]={});
function courseQuestionPool(day){
  const existing=BANK.filter(q=>q.day===day).slice(0,3);
  return existing.concat((window.COURSE_CHECKS[day]?.extra||[])).slice(0,3);
}
function courseStatus(l){
  if(!courseEnabled(l)) return P.read[l.id]?"Прочитано":"Не начато";
  const r=P.course[l.day]||{};
  if(r.reviewPassedAt) return "Освоено";
  if(!P.read[l.id]) return "Начать урок";
  if(!r.quizPassedAt) return "Пройти проверку";
  if(!r.practicePassedAt) return "Решить ситуацию";
  return r.reviewDue<=Date.now()?"Пора повторить":"Повторение завтра";
}
function courseSuggestedStage(l){
  if(!courseEnabled(l)) return "read";
  const r=P.course[l.day]||{};
  if(!P.read[l.id]) return "read";
  if(!r.quizPassedAt) return "check";
  if(!r.practicePassedAt) return "practice";
  if(!r.reviewPassedAt&&r.reviewDue<=Date.now()) return "review";
  return "read";
}
function courseNextLesson(){
  const list=lectList(), now=Date.now();
  return list.find(l=>{const r=P.course[l.day]||{};return courseEnabled(l)&&r.practicePassedAt&&!r.reviewPassedAt&&r.reviewDue<=now;})
    ||list.find(l=>{const r=P.course[l.day]||{};return courseEnabled(l)&&(!P.read[l.id]||!r.quizPassedAt||!r.practicePassedAt);})
    ||list.find(l=>!P.read[l.id])||null;
}
function courseShuffle(q){
  const options=shuffle(q.o.map((text,i)=>({text,correct:Array.isArray(q.a)?q.a.includes(i):i===q.a})));
  return {q:q.q,options,why:q.why||"",correct:options.findIndex(x=>x.correct)};
}
function coursePrepare(l,stage){
  if(COURSE.day===l.day&&COURSE.stage===stage) return;
  const pool=courseQuestionPool(l.day);
  const raw=stage==="review"?[pool[0],pool[2]]:pool;
  Object.assign(COURSE,{day:l.day,stage,questions:raw.filter(Boolean).map(courseShuffle),answers:[],i:0,done:false,score:0,
    practice:courseShuffle(window.COURSE_CHECKS[l.day].practice),picked:-1,practiceChecked:false});
}
function courseOpenStage(stage){
  const l=lectCur(); if(!courseEnabled(l)) return;
  const r=P.course[l.day]||{};
  if(stage==="check"&&!P.read[l.id]) return;
  if(stage==="practice"&&!r.quizPassedAt) return;
  if(stage==="review"&&(!r.practicePassedAt||(!r.reviewPassedAt&&r.reviewDue>Date.now()))) return;
  P.ui.lessonStage=stage; save(); COURSE.day=0; render(); window.scrollTo({top:0});
}
function coursePick(i){
  if(COURSE.done||!COURSE.questions[COURSE.i]||i<0||i>=COURSE.questions[COURSE.i].options.length) return;
  COURSE.answers[COURSE.i]=i; render();
}
function courseQuizBack(){if(COURSE.i>0){COURSE.i--;render();}}
function courseQuizNext(){
  if(COURSE.done||COURSE.answers[COURSE.i]===undefined) return;
  if(COURSE.i+1<COURSE.questions.length){COURSE.i++;render();window.scrollTo({top:0});return;}
  COURSE.score=COURSE.questions.reduce((n,q,i)=>n+(COURSE.answers[i]===q.correct?1:0),0);
  COURSE.done=true;
  const r=courseRecord(COURSE.day), now=Date.now();
  if(COURSE.stage==="review"){
    r.reviewAttempts=(r.reviewAttempts||0)+1;
    if(COURSE.score===COURSE.questions.length) r.reviewPassedAt=now;
    else r.reviewDue=now+DAY;
  }else{
    r.quizAttempts=(r.quizAttempts||0)+1;
    r.quizBest=Math.max(r.quizBest||0,COURSE.score);
    if(COURSE.score>=2&&!r.quizPassedAt) r.quizPassedAt=now;
  }
  save(); render(); window.scrollTo({top:0});
}
function coursePracticePick(i){
  if(COURSE.practiceChecked||!COURSE.practice||i<0||i>=COURSE.practice.options.length) return;
  COURSE.picked=i; render();
}
function coursePracticeCheck(){
  if(COURSE.practiceChecked||COURSE.picked<0) return;
  COURSE.practiceChecked=true;
  const r=courseRecord(COURSE.day);
  r.practiceAttempts=(r.practiceAttempts||0)+1;
  if(COURSE.picked===COURSE.practice.correct&&!r.practicePassedAt){
    r.practicePassedAt=Date.now(); r.reviewDue=r.practicePassedAt+DAY;
  }
  save(); render();
}
function courseRetry(){COURSE.day=0;render();window.scrollTo({top:0});}
function courseSteps(l){
  const r=P.course[l.day]||{}, stage=P.ui.lessonStage||"read", reviewReady=!!r.reviewPassedAt||!!r.practicePassedAt&&r.reviewDue<=Date.now();
  const steps=[["read","Лекция",!!P.read[l.id],true],["check","Проверка",!!r.quizPassedAt,!!P.read[l.id]],
    ["practice","Ситуация",!!r.practicePassedAt,!!r.quizPassedAt],["review","Повторение",!!r.reviewPassedAt,reviewReady]];
  return `<nav class="course-steps" aria-label="Этапы урока">${steps.map(([k,label,done,enabled],i)=>
    `<button data-course-stage="${k}" class="course-step${stage===k?" active":""}${done?" done":""}" ${enabled?"":"disabled"} aria-current="${stage===k?"step":"false"}"><span>${done?"✓":i+1}</span>${label}</button>`).join("")}</nav>`;
}
function courseHeader(l){
  const b=BLOCKS[l.b];
  return `<div class="chead"><span class="dtag">${wire(b)}${esc(b.n)}</span><span class="day">День ${l.day} · ${esc(DAYS[l.day]||"")}</span><span class="badge q">${esc(courseStatus(l))}</span></div>${courseSteps(l)}`;
}
function renderCourseQuiz(l,stage){
  coursePrepare(l,stage);
  const title=stage==="review"?"Повторение без подсказок":"Проверь себя";
  if(COURSE.done){
    const total=COURSE.questions.length, pass=stage==="review"?COURSE.score===total:COURSE.score>=2;
    const answers=COURSE.questions.map((q,i)=>`<div class="course-answer ${COURSE.answers[i]===q.correct?"ok":"bad"}"><b>${i+1}. ${esc(q.q)}</b><span>Твой ответ: ${esc(q.options[COURSE.answers[i]]?.text||"—")}</span><span>Правильно: ${esc(q.options[q.correct].text)}</span><p>${q.why}</p></div>`).join("");
    $("card").innerHTML=`${courseHeader(l)}<div class="course-flow"><span class="eyebrow">${title}</span><h2>${pass?"Этап пройден":"Вернись к сложным вопросам"}</h2><p>${COURSE.score} из ${total} верно${stage==="review"&&!pass?" · повторение снова появится завтра":""}</p><div class="course-answers">${answers}</div></div>`;
    $("controls").innerHTML=(stage==="review"?(pass?'<button class="btn primary" data-act="coursenextday">К следующему дню</button>':'<button class="btn primary" data-course-stage="read">Перечитать лекцию</button>')
      :(pass?'<button class="btn primary" data-course-stage="practice">К ситуации →</button>':'<button class="btn primary" data-act="courseretry">Пройти ещё раз</button>'))
      +'<button class="btn ghost" data-act="llist">К списку</button>';
    return;
  }
  const q=COURSE.questions[COURSE.i], picked=COURSE.answers[COURSE.i];
  if(!q){ $("card").innerHTML=`${courseHeader(l)}<div class="course-flow">Для этого дня пока нет вопросов.</div>`;$("controls").innerHTML='<button class="btn" data-course-stage="read">К лекции</button>';return; }
  $("card").innerHTML=`${courseHeader(l)}<div class="course-flow"><span class="eyebrow">${title} · ${COURSE.i+1} из ${COURSE.questions.length}</span><h2>${esc(q.q)}</h2><p>Ответы и объяснения появятся после всей проверки.</p><div class="course-options">${q.options.map((o,i)=>`<button class="course-option${picked===i?" selected":""}" data-course-choice="${i}" aria-pressed="${picked===i}"><span>${LET[i]}</span>${esc(o.text)}</button>`).join("")}</div></div>`;
  $("controls").innerHTML=`<button class="btn primary" data-act="coursequiznext" ${picked===undefined?"disabled":""}>${COURSE.i+1===COURSE.questions.length?"Показать результат":"Следующий вопрос →"}</button>`
    +(COURSE.i?'<button class="btn ghost" data-act="coursequizback">← Предыдущий</button>':'<button class="btn ghost" data-course-stage="read">К лекции</button>');
}
function renderCoursePractice(l){
  coursePrepare(l,"practice");
  const q=COURSE.practice, picked=COURSE.picked, checked=COURSE.practiceChecked, ok=checked&&picked===q.correct;
  $("card").innerHTML=`${courseHeader(l)}<div class="course-flow"><span class="eyebrow">Ситуация из сети</span><h2>${esc(q.q)}</h2><p>Выбери действие и проверь, почему оно подходит.</p><div class="course-options">${q.options.map((o,i)=>`<button class="course-option${picked===i?" selected":""}${checked&&i===q.correct?" correct":""}" data-course-practice="${i}" aria-pressed="${picked===i}" ${checked?"disabled":""}><span>${LET[i]}</span>${esc(o.text)}</button>`).join("")}</div>${checked?`<div class="course-feedback ${ok?"ok":"bad"}"><b>${ok?"Верно":"Пока неверно"}</b><p>${q.why}</p>${ok?"<p>Повторение откроется через 24 часа. Пока можно перейти к следующему дню.</p>":""}</div>`:""}</div>`;
  $("controls").innerHTML=checked?(ok?'<button class="btn primary" data-act="coursenextday">К следующему дню →</button>':'<button class="btn primary" data-act="courseretry">Попробовать ещё раз</button>')
    :`<button class="btn primary" data-act="coursepracticecheck" ${picked<0?"disabled":""}>Проверить решение</button>`;
  $("controls").innerHTML+='<button class="btn ghost" data-course-stage="read">К лекции</button>';
}
function renderCourseStage(l){
  const stage=P.ui.lessonStage||"read";
  if(stage==="practice") renderCoursePractice(l);
  else if(stage==="check"||stage==="review") renderCourseQuiz(l,stage);
}
