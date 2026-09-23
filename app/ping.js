/* Тренажёр CCNA · Пинг — персонаж-помощник.
   Рисуется одной фигурой в акцентном цвете: округлое тело с «пиком сигнала» сверху,
   выразительные глаза и рот. Настроение меняет только лицо и добавляет класс анимации,
   поэтому персонаж остаётся узнаваемым в любом размере — от 24 пикселей до крупного блока.
   Подключается после core.js: пользуется P, counts(), streaks(), dayRatio() во время вызова. */
"use strict";
const PING_NAME="Пинг";

/* ═══ Рисунок ═════════════════════════════════════════ */
const FOX_BASE='<path fill="#be592e" d="M4 3L18 13h12L44 3l-4 29-16 14L8 32z"/><path fill="#faefd9" d="M8 9l12 9h8l12-9-5 22-11 10-11-10z"/><path d="M10 12l5 9m-2-10 5 10m20-9-5 9m2-10-5 10" fill="none" stroke="#695444" stroke-width="1.2"/><path fill="#292820" d="M20 33h8l-4 5z"/><path class="signal-tip" d="M41 2h4l-1 5-4-1z"/>';
const PING_ART={idle:'<path class="fox-eye" d="M13 24l8 2-5 4zm22 0-8 2 5 4z"/>',happy:'<path d="M14 27q3-5 6 0m8 0q3-5 6 0" fill="none" stroke="#292820" stroke-width="2"/>',think:'<path class="fox-eye" d="M13 24l8 2-5 4z"/><path d="M28 27h6" stroke="#292820" stroke-width="2"/>',sad:'<path class="fox-eye" d="M14 28l6-3v4zm20 0-6-3v4z"/>',sleep:'<path d="M14 27h6m8 0h6" stroke="#292820" stroke-width="2"/>'};
PING_ART.cheer=PING_ART.happy;
const pingSvg=(mood,extra)=>`<span class="pingface mood-${mood in PING_ART?mood:"idle"}${extra?" "+extra:""}"><svg class="pingsvg signal-fox" viewBox="0 0 48 48" aria-hidden="true">${FOX_BASE}${PING_ART[mood]||PING_ART.idle}</svg></span>`;
/* огонёк серии дней */
const pingFlame=()=>`<svg class="flame" viewBox="0 0 24 28" aria-hidden="true"><path class="f1" d="M12 0c1.6 5.2-1.4 7.2-3.6 9.6C6 12.2 4 14.6 4 18.2 4 23.6 8 28 12 28s8-4.4 8-9.8c0-4.4-2.6-6.6-5.2-9.4C12.6 6.4 11 4 12 0z"/><path class="f2" d="M12 11c.9 2.8-1 4-2 5.4-.9 1.2-1.6 2.4-1.6 4 0 2.8 1.9 5.2 3.9 5.2s3.9-2.4 3.9-5.2c0-2.3-1.3-3.5-2.6-5-1-1.1-1.9-2.3-1.6-4.4z"/></svg>`;

/* ═══ Реплики ═════════════════════════════════════════ */
const PING_SAY={
 ok:["Верно! Так и запоминается.","Точно в цель.","Есть — пакет доставлен.",
     "Верно. Оцените, легко ли вспомнилось: от этого зависит следующий показ.",
     "Хорошо! Ещё одна карточка идёт в долгую память.",
     "Правильно. Спокойный темп работает лучше спешки.",
     "Отлично. Такие ответы и растят серию."],
 streak:["{n} верных подряд — красиво!","Серия {n}. Разгоняемся.","Уже {n} без промаха. Так держать!","{n} подряд — связь стабильная."],
 bad:["Ничего страшного: ошибка — это просто ещё одно повторение.",
      "Спокойно. Эту карточку я верну через пару заданий.",
      "Так бывает. Прочитайте разбор — и дальше.",
      "Не переживайте: понять важнее, чем угадать.",
      "Бывает. Зато теперь запомнится крепче.",
      "Ошиблись — значит, нашли пробел. Это полезная находка."],
 show:["Честный ход. Смотрим разбор вместе.","Иногда посмотреть ответ полезнее, чем гадать.","Хорошо, что не стали угадывать. Читаем разбор."],
 pracOk:["Есть решение! Считаете уверенно.","Верно. Ещё пара таких — и будет на автомате.","Точно. Скорость придёт сама, главное — метод."],
 pracBad:["Не сходится. Посмотрите разбор по шагам — там видно, где свернули.",
          "Почти. Сверьтесь с разбором и берите следующую.",
          "Такие задачи и ловят на экзамене. Разберём — и дальше."],
 caseOk:["Диагноз верный — инженерное мышление работает.","Так и есть. Теперь давайте починим.","В точку! Осталось выполнить настройку."],
 caseBad:["Причина другая, но подход верный: смотреть вывод команд.","Мимо. Зато теперь видно, какой вывод о чём говорит."],
 caseFix:["Связь восстановлена! Отличная работа.","Готово — неисправность устранена.","Сеть снова живая. Красиво."],
 matchOk:["Все пары без ошибок — чисто!","Идеально разложено по полочкам."],
 matchErr:["Готово. Ошибки здесь не страшны — зато пары запомнились."],
 cliOk:["Настроено. Команды входят в пальцы.","Готово. Каждая такая задача — плюс к уверенности в консоли."],
 cliClean:["Без единой ошибки и подсказки — как настоящий инженер.","Чисто с первого раза! Отличная память на синтаксис."],
 sumHi:["Сильная сессия! Это уже понимание, а не удача.","Очень хороший результат. Так и выглядит готовность к экзамену."],
 sumMid:["Хорошая работа. Слабые места я запомнил — вернёмся к ним.","Нормальный результат. Ошибки вернутся карточками — и станут знанием."],
 sumLow:["Главное — дошли до конца. Ошибки сегодня превращаются в знания завтра.","Тяжёлая сессия, зато честная. Эти карточки теперь под особым присмотром."],
 mixHi:["Микс взят почти без потерь. Сильно!","Разные типы заданий подряд — и такой результат. Отлично."],
 mixMid:["Хороший микс. Самое полезное — что задания шли вперемешку.","Неплохо. Именно так и проверяется, что тема понята, а не заучена."],
 mixLow:["Микс был непростым — зато сразу видно, что подтянуть.","Ничего. Соберём новый: слабые темы я поставлю вперёд."],
 sleep:["В выбранных блоках всё повторено. Включите ещё блок — или загляните в практику.",
        "Повторять пока нечего: интервалы ещё не подошли. Можно потренировать задачи."],
 mile:["Молодец — в том же духе!","Отличный ритм, так держать!","Идёт как по маслу!","Красиво! Не сбавляйте темп.","Вы поймали волну — продолжаем."],
 mileBig:["Вот это серия! Это уже уверенное знание, а не везение.","Мощно! Примерно так и сдают экзамен.","Длинная серия без единой ошибки — снимаю шляпу."],
 tip:["Лучше 15 минут каждый день, чем два часа раз в неделю.",
      "Проговаривайте ответ вслух — так видно, понимаете вы или просто узнаёте.",
      "Термины с пунктиром можно нажать — открою короткое пояснение.",
      "В миксе задания идут вперемешку: мозг не привыкает к однотипным вопросам.",
      "Не бойтесь оценки «трудно» — честная оценка настраивает повторения точнее.",
      "Если тема не идёт, спросите Claude прямо в карточке.",
      "Считая подсети, сначала запишите маску в двоичном виде — ошибок будет меньше.",
      "Десять карточек перед сном — и память закрепит их за ночь."]
};
let pingLast={};                                        // последняя реплика набора — чтобы не повторяться подряд
function pingPick(key,vars){
  const a=PING_SAY[key]; if(!a||!a.length) return "";
  let i=Math.floor(Math.random()*a.length);
  if(a.length>1&&i===pingLast[key]) i=(i+1)%a.length;
  pingLast[key]=i;
  return a[i].replace(/\{(\w+)\}/g,(m,k)=>(vars&&vars[k]!==undefined)?vars[k]:m);
}
const pingOn=()=>P.ui.ping!==false;
const pingRow=(mood,key,vars)=>pingOn()?`<div class="pingsay">${pingSvg(mood)}<span>${esc(pingPick(key,vars))}</span></div>`:"";
function pingBlock(mood,key,vars){
  if(!pingOn()) return "";
  return `<div class="pingbig">${pingSvg(mood)}<div class="pingb-t"><b>${PING_NAME}</b><p>${esc(pingPick(key,vars))}</p></div></div>`;
}

/* ═══ Поздравление с серией верных ответов ════════════ */
const PING_NUM={3:"Три",5:"Пять",10:"Десять",15:"Пятнадцать",20:"Двадцать",25:"Двадцать пять",30:"Тридцать"};
const pingMile=n=>n===3||n===5||(n>5&&n%5===0);            // 3, 5, 10, 15, 20 …
let pingCelT=null;
function pingCelebrate(n){
  if(!pingOn()||!pingMile(n)) return;
  const old=document.querySelector(".pstreak"); if(old) old.remove();
  clearTimeout(pingCelT);
  const el=document.createElement("div");
  el.className="pstreak"+(document.querySelector(".toast")?" up":"");
  el.setAttribute("role","status");
  el.innerHTML=`${pingSvg("cheer")}<div class="pst-t"><b>${esc((PING_NUM[n]||n)+" подряд!")}</b><span>${esc(pingPick(n>=10?"mileBig":"mile"))}</span></div>`;
  el.addEventListener("click",()=>el.remove());
  document.body.appendChild(el);
  pingCelT=setTimeout(()=>{ el.classList.add("out"); setTimeout(()=>el.remove(),320); },2300);
}

/* ═══ Статус: что сказать про день и что предложить ═══ */
function pingGoalLeft(){
  const d=P.days[dayKey(Date.now())]||{};
  return {c:Math.max(0,(+P.goal.cards||0)-(d.c||0)), p:Math.max(0,(+P.goal.prac||0)-(d.p||0))};
}
function pingLastActive(){
  const tk=dayKey(Date.now());
  const ks=Object.keys(P.days).filter(k=>k<tk&&P.days[k]&&((P.days[k].c||0)+(P.days[k].p||0)+(P.days[k].k||0))>0).sort();
  return ks.length?ks[ks.length-1]:"";
}
function pingWeakDay(){
  const by={};
  BANK.forEach(q=>{const r=P.cards[q.id]; if(!r) return; const o=by[q.day]||(by[q.day]={c:0,n:0}); o.c+=r.c||0; o.n+=(r.c||0)+(r.w||0);});
  let best=null;
  Object.keys(by).forEach(k=>{const o=by[k], acc=o.n?o.c/o.n:1; if(o.n<3||acc>=0.8) return; if(!best||acc<best.acc) best={d:+k,acc};});
  return best;
}
function pingMood(){
  if(dayRatio(P.days[dayKey(Date.now())])>=1) return "cheer";
  const c=counts();
  return (!c.due&&!c.fresh)?"sleep":"idle";
}
function pingStatus(){
  const tk=dayKey(Date.now()), ratio=dayRatio(P.days[tk]), st=streaks(), c=counts(), gl=pingGoalLeft();
  const start=!Object.keys(P.days).length&&!Object.keys(P.cards).length;
  if(start) return {mood:"happy",acts:[["Открыть лекции",'data-mode="lect"']],
    line:`Привет! Я ${PING_NAME}. Буду рядом: подскажу, похвалю и присмотрю за целью дня. Начнём с первой лекции, а затем закрепим её на тренировке.`
      +(window.EDITION==="public"?" Это открытая бета: заметили ошибку или есть идея — нажмите «Отзыв» над заданием.":"")};
  if(ratio>=1) return {mood:"cheer",acts:[["Ещё микс",'data-mode="mix"']],
    line:`Цель дня закрыта${st.cur?`, серия ${st.cur} ${plural(st.cur,"день","дня","дней")}`:""}. Можно отдохнуть — или пройти ещё один микс.`};
  const la=pingLastActive();
  if(la){
    const gap=Math.round((new Date(tk+"T00:00:00")-new Date(la+"T00:00:00"))/DAY);
    if(gap>=3) return {mood:"happy",acts:[["Собрать микс",'data-mode="mix"']],
      line:`Не виделись ${gap} ${plural(gap,"день","дня","дней")} — ничего страшного, серию начнём заново. Короткий микс, и день закрыт.`};
  }
  if(!c.due&&!c.fresh) return {mood:"sleep",line:pingPick("sleep"),acts:[["Практика",'data-mode="prac"']]};
  const parts=[];
  if(gl.c) parts.push(`${gl.c} ${plural(gl.c,"карточка","карточки","карточек")}`);
  if(gl.p) parts.push(`${gl.p} ${plural(gl.p,"задача","задачи","задач")}`);
  const w=pingWeakDay();
  const acts=[["Продолжить в миксе",'data-mode="mix"']];
  if(w) acts.push([`Тренировать день ${w.d}`,`data-act="trainday" data-day="${w.d}"`]);
  return {mood:"idle",acts,
    line:(parts.length?`До цели дня осталось: ${parts.join(" и ")}. `:"")
      +(w?`Слабее всего идёт день ${w.d} — там верных ${Math.round(w.acc*100)}%.`:pingPick("tip"))};
}
function pingStatusBlock(){
  if(!pingOn()) return "";
  const st=pingStatus(), acts=(st.acts||[]).map(a=>`<button class="mini" ${a[1]}>${esc(a[0])}</button>`).join("");
  return `<div class="pingbig">${pingSvg(st.mood)}<div class="pingb-t"><b>${PING_NAME}</b><p>${esc(st.line)}</p>${acts?`<div class="pingb-a">${acts}</div>`:""}</div></div>`;
}

/* ═══ Аватар в шапке и окошко с репликой ══════════════ */
let pingBub=null;                                       // открытое окошко: держим текст, чтобы он не менялся при перерисовке
function pingOpen(){
  const bb=$("pingBubble"); if(!bb||!pingOn()) return;
  pingBub=pingStatus();
  const acts=(pingBub.acts||[]).map(a=>`<button class="mini" ${a[1]}>${esc(a[0])}</button>`).join("");
  bb.innerHTML=`${pingSvg(pingBub.mood)}<div class="pingb-t"><b>${PING_NAME}</b><p>${esc(pingBub.line)}</p>${acts?`<div class="pingb-a">${acts}</div>`:""}</div>
    <button class="gp-x" data-act="pingclose" aria-label="Закрыть">×</button>`;
  bb.hidden=false; renderPing();
}
function pingClose(){ pingBub=null; const bb=$("pingBubble"); if(bb) bb.hidden=true; renderPing(); }
function pingToggle(){ pingBub?pingClose():pingOpen(); }
function renderPing(){
  const av=$("pingAv"); if(!av) return;
  if(!pingOn()){ av.hidden=true; const bb=$("pingBubble"); if(bb) bb.hidden=true; pingBub=null; return; }
  av.hidden=false;
  av.innerHTML=pingSvg(pingBub?pingBub.mood:pingMood());
  av.setAttribute("aria-expanded",String(!!pingBub));
}
