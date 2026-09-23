/* Тренажёр CCNA · общие данные и мелкие помощники: ссылки на банки, режимы, форматирование */
"use strict";

const BLOCKS=window.BLOCKS||[], DAYS=window.DAYS||{}, BANK=window.BANK||[], CLI=window.CLI||[];
const G=window.GLOSSARY||[], D=window.DRILLS, CASES=window.CASES||[], MATCH=window.MATCH||[], MATCH_GEN=window.MATCH_GEN||{};
const LESSONS=window.LESSONS||[];
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const strip=h=>String(h).replace(/<[^>]+>/g,"");
const LET=["A","B","C","D","E","F","G","H"];
const DAY=864e5, MATURE=21, LS="ccna-trainer-v3";
const MODES=[["home","Сегодня"],["lect","Лекции"],["train","Тренировка"],["mix","Микс"],["cards","Карточки"],["prac","Практика"],["cli","Команды"],["prog","Прогресс"]];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function plural(n,one,few,many){const a=n%10,b=n%100;if(a===1&&b!==11)return one;if(a>=2&&a<=4&&(b<10||b>=20))return few;return many;}
const wire=b=>`<span class="wire${b.st?" st":""}" style="--w:${b.w}"></span>`;
const fmtS=ms=>(ms/1000).toFixed(1).replace(".",",")+" с";
const pct=(a,b)=>b?Math.round(a/b*100)+"%":"—";
