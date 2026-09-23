/* One place for all exercise modes. The existing modes keep their own progress. */
"use strict";

function renderTraining(){
  const due=counts().due;
  const choices=[
    ["cards","Карточки","Вспомнить термины и команды",due?`${due} к повторению`:"Начать"],
    ["drills","Задачи","Подсети, маршруты и путь пакета","Решать"],
    ["cli","Команды IOS","Вводить команды в консоли","Открыть"],
    ["case","Найти неисправность","Разобрать вывод и исправить сеть","Открыть"],
    ["match","Сопоставление","Связать понятия и определения","Открыть"]
  ];
  $("card").innerHTML=`<div class="training-hub">
    <div class="training-head"><span class="eyebrow">Тренировка</span><h2>Что хочешь потренировать?</h2><p>Выбери навык или попробуй всё сразу в смешанной сессии.</p></div>
    <button class="training-feature" data-train="mix"><span class="training-feature-icon"><svg viewBox="0 0 24 24" aria-hidden="true">${NAV_IC.mix}</svg></span><span><b>${MIX.built&&MIX.i<MIX.items.length?"Продолжить смешанную сессию":"Смешанная сессия"}</b><small>Карточки, задачи, команды и диагностика</small></span><strong>→</strong></button>
    <div class="training-choices">${choices.map(([k,title,desc,meta])=>`<button class="training-choice" data-train="${k}"><span class="training-choice-icon"><svg viewBox="0 0 24 24" aria-hidden="true">${NAV_IC[k]||NAV_IC.prac}</svg></span><span class="training-choice-copy"><b>${title}</b><small>${desc}</small></span><span class="training-choice-meta">${meta} →</span></button>`).join("")}</div>
    <div class="training-bottom">Нужна теория? <button data-mode="lect">Открыть лекции →</button></div>
  </div>`;
  $("controls").innerHTML="";
}
