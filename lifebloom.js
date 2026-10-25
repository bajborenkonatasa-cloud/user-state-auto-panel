// LifeBloom 0.1 — independent, chat-scoped family journal for User Persona Studio.
// No model requests. No prompt injection. No automatic changes from uncertain prose.
const STORE='ups_lifebloom_v1_';
let env=null;
const empty=()=>({avatar:'',avatarX:50,avatarY:30,avatarZoom:125,rpLabel:'',rpDate:'',universe:'standard',contraception:'unspecified',cycleMode:'manual',partner:'',status:'none',conceptionDate:'',pregnancyOutcome:'',week:'',due:'',cycleDay:'',cycleLength:'28',cycleStart:'',gestation:'40',babies:'1',notes:'',children:[],people:[],candidates:[],dismissed:[],lastScanned:0,lastLiveMessage:0,liveAuto:true,auto:true});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function key(){const x=env.ids(),n=env.names().userName;return STORE+encodeURIComponent([x.charId,x.chatId,n].join('::'));}
function load(){try{return {...empty(),...JSON.parse(localStorage.getItem(key())||'{}')};}catch{return empty();}}
function peopleFor(d){
 const people=Array.isArray(d.people)?d.people:[];
 const name=String(env.names().charName||'').trim();
 if(name && name!=='{{char}}' && !people.some(p=>p.source==='card'&&p.name===name)){
   people.unshift({id:'card:'+String(env.ids().charId),name,role:'main',source:'card',mood:'',thought:'',avatar:'',visible:true});
   d.people=people;save(d);
 }
 return people;
}
function personCard(p){const role=p.role==='main'?'💕 ГЛАВНЫЙ ГЕРОЙ':p.role==='child'?'🧸 РЕБЁНОК':'✨ ВАЖНЫЙ NPC';return `<div class="lb-person" data-person="${esc(p.id)}"><div class="lb-person-face">${p.avatar?`<img src="${esc(p.avatar)}" alt="">`:esc(p.role==='child'?'🧸':p.role==='main'?'💗':'✨')}</div><div class="lb-person-info"><div class="lb-person-role">${role}</div><b>${esc(p.name)}</b>${p.mood?`<small>${esc(p.mood)}</small>`:''}${p.thought?`<div class="lb-person-thought">${esc(p.reactionEmoji||"😌🫶🏻")} «${esc(p.thought)}»</div>`:''}</div></div>`;}

function save(d){try{localStorage.setItem(key(),JSON.stringify(d));}catch(e){alert('Не удалось сохранить LifeBloom: '+e.message);}}
const input=(id,label,value='',type='text')=>`<label class="lb-field"><span>${label}</span><input id="lb_${id}" type="${type}" value="${esc(value)}"></label>`;
function scan(d,full=false){const chat=env.ctx().chat||[];const start=full?0:Math.min(d.lastScanned,chat.length);const found=[];
 for(let i=start;i<chat.length;i++){const m=chat[i],s=String(m?.mes||'').replace(/<[^>]*>/g,' ').slice(0,12000);if(!s.trim())continue;
 const patterns=[['pregnancy',/(?:я беременна|ты беременна|она беременна|подтвержден[ао] беременность|тест показал две полоски)/i],['birth',/(?:\bродила\b|появил[аи]сь на свет|родился (?:сын|мальчик)|родилась (?:дочь|девочка))/i],['family',/(?:наш[аи] (?:сын|дочь|реб[её]нок)|у нас (?:родился|родилась) (?:сын|дочь))/i]];
 for(const [type,re] of patterns)if(re.test(s)){const quote=s.match(re)?.[0]||'';const id=i+':'+type;if(!d.candidates.some(c=>c.id===id)&&!(d.dismissed||[]).includes(id))found.push({id,type,quote,excerpt:s.slice(Math.max(0,s.search(re)-65),Math.min(s.length,s.search(re)+115)),index:i});}
 }d.candidates=[...d.candidates,...found].slice(-80);d.lastScanned=chat.length;save(d);return found.length;}
// Lightweight, local, first-person reaction captions. These are stylized guesses, not model thoughts.
const reactionStyles=[
 [/Раздраж|злост/i,['😤🫠','Мне сейчас лучше дать немного пространства.']],
 [/Ревнует/i,['😒🤏🏻','И почему меня это так задевает?..']],
 [/Взволнован/i,['🥺🤝','Надеюсь, с ней всё будет хорошо.']],
 [/Устал/i,['😮‍💨👌🏻','Мне бы передохнуть... Но сначала убедиться, что с ней всё хорошо.']],
 [/Доволен/i,['😁🫶🏻','Вот это мгновение хочется запомнить.']],
 [/Испуган/i,['😳🫣','Только бы всё обошлось.']],
 [/Расстроен/i,['🥹💔','Не хочу, чтобы она видела меня таким.']],
 [/Нежный/i,['☺️😌','Хочу побыть рядом с ней ещё немного.']],
 [/Страстный/i,['😏🔥','Как же сильно она на меня действует...']],
 [/Удивлён/i,['🤭👀','Вот этого я точно не ожидал!']],
 [/Голоден/i,['🤤🍪','Интересно, найдётся что-нибудь вкусное?']],
 [/Озорной/i,['😏👌🏻','Кажется, у меня появилась маленькая идея...']]
];
function styledReaction(mood){return reactionStyles.find(([re])=>re.test(mood||''))?.[1]||['😌✨','Интересно, что будет дальше...'];}
// LifeBloom live reader: local-only, reads existing model replies, never changes other Studio tabs.
function updateLive(d, recent=false){
 if(d.liveAuto===false)return false;
 const chat=env.ctx()?.chat||[];
 const people=peopleFor(d);
 let changed=false;
 const start=recent?Math.max(0,chat.length-8):Math.max(0,Math.min(Number(d.lastLiveMessage)||0,chat.length));
 const moodRules=[
  [/раздраж|злост|злится|ярост|бешен|рычит|огрыза|сердит|негодован/i,'😤 Раздражён'],
  [/ревност|ревнует|собственнич|не жела(?:ет|л) делить/i,'😒 Ревнует'],
  [/тревог|встревож|волну|беспоко|опасени|напряж[её]н/i,'😟 Взволнован'],
  [/устал|изнемож|измотан|сонлив|зевнул/i,'😮‍💨 Устал'],
  [/улыб|сме[её]тся|хохоч|радост|счастлив|доволен/i,'😊 Доволен'],
  [/испуг|ужас|боится|страх|панику/i,'😨 Испуган'],
  [/плач|слез|рыда|хныч|огорч|груст|печал/i,'🥺 Расстроен'],
  [/нежн|ласков|забот|обнима|прижимает|целует/i,'🥰 Нежный'],
  [/страст|желани|влечени|возбужд|томлен|жажд/i,'❤️‍🔥 Страстный'],
  [/удивл|изумл|ошеломл|пораж[её]н/i,'😳 Удивлён'],
  [/голод|хочет есть|печень|сладост/i,'🍪 Голоден'],
  [/шалит|проказ|хитр|озорн|шкод|подшуч/i,'😏 Озорной']
 ];
 for(let i=start;i<chat.length;i++){
  const m=chat[i];if(!m||m.is_user||m.is_system)continue;
  // Convert HTML, RP formatting and JSON-like tool blocks to searchable prose.
  const raw=String(m.mes||'').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/\*\*/g,' ').slice(0,50000);
  if(!raw.trim())continue;
  const chunks=raw.split(/[\n.!?。]+/).map(t=>t.trim()).filter(t=>t.length>3).slice(0,350);
  for(const p of people){
   const name=String(p.name||'').trim();if(!name)continue;
   const names=[name];if(name.toLowerCase()==='roen')names.push('Роен','Роэн','Роэнa','Роена');
   if(name.toLowerCase()==='калеб')names.push('Калеба','Калебом');
   if(name.toLowerCase()==='каел')names.push('Каэл','Каэла','Kael');
   const escaped=names.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
   const nameRe=new RegExp('(?:^|[^\\p{L}])(?:'+escaped+')(?:$|[^\\p{L}])','iu');
   let best=null;
   for(const chunk of chunks){
    if(!nameRe.test(chunk))continue;
    const match=moodRules.find(([re])=>re.test(chunk));
    if(match)best={mood:match[1],chunk};
    const explicit=chunk.match(/(?:подумал[а]?|мысленно|про себя|мысль|хочет|собирается|решил[а]?)[^«“"\n]{0,65}[«“"]([^»”"]{5,130})[»”"]/i);
    if(explicit){const t=explicit[1].trim();if(t&&p.thought!==t){p.thought=t; p.reactionEmoji="😏👌🏻";p.liveNote=false;changed=true;}}
   }
   if(best){
    if(p.mood!==best.mood){p.mood=best.mood;changed=true;}
    // Use an actual excerpt as a scene note; never fabricate a quoted internal monologue.
    const [emojis,caption]=styledReaction(best.mood);if(p.thought!==caption||p.reactionEmoji!==emojis||!p.liveNote){p.thought=caption;p.reactionEmoji=emojis;p.liveNote=true;changed=true;}
   }
  }
 }
 if(d.lastLiveMessage!==chat.length){d.lastLiveMessage=chat.length;changed=true;}
 if(changed)save(d);
 return changed;
}
function normalizeDate(v){
 const s=String(v||'').trim();let m;
 if((m=/^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s)))return validDate(+m[1],+m[2],+m[3]);
 if((m=/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(s)))return validDate(+m[3],+m[2],+m[1]);
 return '';
}
function validDate(y,m,d){const t=new Date(y,m-1,d,12);return t.getFullYear()===y&&t.getMonth()===m-1&&t.getDate()===d?`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`:'';}
function storyDateFromLabel(label){const m=String(label||'').match(/(?:^|[^\d])(\d{1,2}[./]\d{1,2}[./]\d{4}|\d{4}-\d{1,2}-\d{1,2})(?!\d)/);return m?normalizeDate(m[1]):'';}
function cycleLength(d){return Math.max(20,Math.min(45,Number(d.cycleLength)||28));}
function daysBetween(a,b){const x=new Date(a+'T12:00:00'),y=new Date(b+'T12:00:00');return Number.isFinite(+x)&&Number.isFinite(+y)?Math.round((y-x)/86400000):null;}
function addDays(s,n){const d=new Date(s+'T12:00:00');if(!Number.isFinite(+d))return '';d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}
// Story clock follows explicit narrated transitions, not the device clock.
function storyDelta(raw){
 const text=String(raw||'').replace(/<!--\s*LIFEBLOOM[\s\S]*?-->/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
 const numbers={один:1,одна:1,одну:1,два:2,две:2,три:3,четыре:4,пять:5,шесть:6,семь:7,восемь:8,девять:9,десять:10};
 const unitDays=u=>/^д|^сут/i.test(u)?1:/^нед/i.test(u)?7:/^мес/i.test(u)?30:365;
 const re=/(?:спустя|прошл[ои]|прошло|минул[ои]|пролетел[ои]|истекл[ои]|через|по\s+прошествии)\s+(\d{1,3}|один|одна|одну|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять)\s+(день|дня|дней|сутки|суток|неделю|недели|недель|месяц|месяца|месяцев|год|года|лет)|(?:на\s+следующ(?:ий|ее)\s+(?:день|утро)|следующ(?:им|ее)\s+(?:днём|утром)|день\s+спустя|наутро|на\s+следующее\s+утро|наступил\s+новый\s+день|прошла\s+ночь)/giu;
 let last=null,match;
 while((match=re.exec(text))){
  const before=text.slice(Math.max(0,match.index-65),match.index);
  if(/(?:если|возможно|может|планир|собира|хочет|мечта|представ|будет|могл[аои]? бы|не прошло)/iu.test(before))continue;
  const n=match[1]?(Number(match[1])||numbers[match[1].toLowerCase()]):1;
  const days=n*(match[2]?unitDays(match[2]):1);
  if(days>0&&days<=36500)last=days;
 }
 return last;
}
function messageStoryDate(raw){
 const text=String(raw||'');
 const tagged=text.match(/\[RP_DATE[:\s]+(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[./]\d{1,2}[./]\d{4})/i);
 if(tagged)return normalizeDate(tagged[1]);
 // Only explicit scene date markers, not arbitrary dates mentioned in dialogue.
 const labelled=text.match(/(?:дата\s+(?:ролевой|истории|сцены)|story\s*date)\s*[:—-]\s*(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[./]\d{1,2}[./]\d{4})/i);
 return labelled?normalizeDate(labelled[1]):'';
}
// Extract a scene date from the decorated roleplay header, including HTML text.
function bannerStoryDate(raw){
 const t=String(raw||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
 const m=t.match(/(?:^|[\s📅🗓])(?:[📅🗓]\s*)?(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+(\d{4})\s*(?:г\.?|\||[·,])/iu);
 if(!m)return '';
 const months=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
 return validDate(+m[3],months.indexOf(m[2].toLowerCase())+1,+m[1]);
}
function notifyOnce(d,id,body){if((d.alertHistory||[]).includes(id))return;d.alertHistory=[...(d.alertHistory||[]),id].slice(-200);d.notices=[...(d.notices||[]),{id,body}].slice(-35);d.unreadNotice=id;}
function registerIntimacy(d,date,source='manual'){
 if(!date)return false;
 const id='exposure:'+date;
 if((d.exposures||[]).some(x=>x.id===id))return false;
 const day=currentCycleDay(d),len=cycleLength(d),ov=len-14;
 d.exposures=[...(d.exposures||[]),{id,date,day,possible:day!==null&&day>=ov-5&&day<=ov+1,source,result:'pending'}].slice(-50);
 notifyOnce(d,id,'🌸 Событие близости записано. Через 14 сюжетных дней станет доступна проверка тестом; беременность не устанавливается автоматически.');return true;
}
function refreshPregnancyChecks(d){
 if(!d.rpDate||d.status==='pregnant')return;
 for(const x of d.exposures||[]){if(x.result!=='pending')continue;const elapsed=daysBetween(x.date,d.rpDate);if(elapsed!==null&&elapsed>=14)notifyOnce(d,'test:'+x.id,'🧪 Прошло 14 сюжетных дней после близости ('+x.date+'). Можно провести сюжетный тест и записать результат вручную.');}
}
function currentCycleDay(d){
 const len=cycleLength(d);
 if(d.cycleMode==='manual' && Number(d.cycleDay)>0)return ((Number(d.cycleDay)-1)%len)+1;
 if(d.rpDate&&d.cycleStart){const diff=daysBetween(d.cycleStart,d.rpDate);if(diff!==null)return ((diff%len)+len)%len+1;}
 const day=Number(d.cycleDay);return day>0?((day-1)%len)+1:null;
}
function refreshStoryAlerts(d){
 const day=currentCycleDay(d),len=Math.max(20,Math.min(45,Number(d.cycleLength)||28));
 if(!day||d.status==='pregnant')return;
 const ov=Math.max(1,len-14),toPeriod=(len-day+1)%len;
 const messages=[];
 if(day===ov)messages.push('🌸 Сегодня ориентировочный день овуляции (сюжет).');
 if(day===ov-3)messages.push('🌸 Примерно через 3 дня овуляция (сюжет).');
 if(toPeriod===3)messages.push('🌙 Примерно через 3 дня ожидаются месячные (сюжет).');
 if(day===1)messages.push('🌙 Начало нового условного цикла.');
 const stamp=(d.rpDate||'без даты')+':'+day+':'+d.status;
 for(const body of messages){const id='cycle:'+stamp+':'+body;if((d.alertHistory||[]).includes(id))continue;
  d.alertHistory=[...(d.alertHistory||[]),id].slice(-120);
  d.notices=[...(d.notices||[]),{id,body}].slice(-25);d.unreadNotice=id;
 }
}
function advanceStoryDays(d,days){
 const len=cycleLength(d);
 if(d.cycleDay && Number(d.cycleDay)>0)d.cycleDay=String(((Number(d.cycleDay)-1+days)%len+len)%len+1);
 if(d.rpDate)d.rpDate=addDays(d.rpDate,days);
 refreshPregnancyChecks(d);
 if(d.cycleStart && d.rpDate && d.cycleDay)d.cycleStart=addDays(d.rpDate,-(Number(d.cycleDay)-1));
}
function syncStoryTime(d){
 const chat=env.ctx()?.chat||[];
 let cursor=Number.isInteger(d.timeScanCursor)?d.timeScanCursor:chat.length;
 if(cursor>chat.length)cursor=chat.length; // Don't replay old time skips after chat edits.
 let changed=false;
 for(let i=cursor;i<chat.length;i++){
  const m=chat[i];if(!m||m.is_system)continue;
  const raw=String(m.mes||'').slice(0,30000);
  const date=messageStoryDate(raw)||bannerStoryDate(raw);
  let delta=null;
  if(date && d.rpDate){const difference=daysBetween(d.rpDate,date);if(difference!==null&&difference>0&&difference<=36500)delta=difference;}
  else if(date && !d.rpDate){d.rpDate=date;changed=true;}
  if(delta===null && !date)delta=storyDelta(raw);
  if(!delta)continue;
  // A model may repeat the user's previous time skip in its reply.
  const fingerprint=raw.replace(/<[^>]*>/g,' ').trim().slice(0,250);
  if(d.lastTimeSkip?.days===delta && i===d.lastTimeSkip.message+1 && m.is_user===false && d.lastTimeSkip.isUser===true)continue;
  if(!d.rpDate && !d.cycleDay)continue;
  advanceStoryDays(d,delta);
  d.lastTimeSkip={days:delta,message:i,fingerprint,isUser:!!m.is_user};changed=true;
 }
 if(d.timeScanCursor!==chat.length){d.timeScanCursor=chat.length;changed=true;}
 if(changed){refreshStoryAlerts(d);refreshPregnancyChecks(d);save(d);}
 return changed;
}
function pregnancyMetrics(d){if(d.status!=='pregnant'||!d.conceptionDate||!d.rpDate)return null;const elapsed=daysBetween(d.conceptionDate,d.rpDate);if(elapsed===null||elapsed<0)return null;const gest=Math.max(20,Math.min(60,Number(d.gestation)||40));return {weeks:Math.floor((elapsed+14)/7),days:(elapsed+14)%7,due:addDays(d.conceptionDate,gest*7-14)};}
function storyCalendar(d){
 const base=normalizeDate(d.rpDate)||'2026-10-08';const [year,month]=base.split('-').map(Number);
 const first=(new Date(year,month-1,1).getDay()+6)%7;
 const days=new Date(year,month,0).getDate();const names=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
 let cells='<div class="lb-cal-week">'+['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(x=>`<span>${x}</span>`).join('')+'</div><div class="lb-cal-grid">';
 for(let i=0;i<first;i++)cells+='<span></span>';
 for(let n=1;n<=days;n++){
  const date=validDate(year,month,n),diff=d.cycleStart?daysBetween(d.cycleStart,date):null;
  const len=cycleLength(d),cycle=diff===null?null:((diff%len)+len)%len+1;
  const fertile=cycle!==null&&cycle>=len-19&&cycle<=len-13;
  const phase=cycle!==null&&cycle<=5?'lb-cal-period':fertile?'lb-cal-fertile':'';
  const events=(d.exposures||[]).some(e=>e.date===date);
  cells+=`<button type="button" class="lb-cal-day ${phase} ${date===d.rpDate?'lb-cal-today':''}" data-lb-cal-date="${date}"><b>${n}</b><small>${cycle||'·'}${events?' ♥':''}</small></button>`;
 }
 cells+='</div>';
 return `<div class="lb-card lb-calendar"><h3>🗓️ Календарь истории и цикла</h3><div class="lb-muted">Только сюжетные даты. Не использует календарь телефона. Нажми день, чтобы перейти к нему.</div><div class="lb-cal-nav"><button type="button" data-lb-cal-month="-1">‹</button><b>${names[month-1]} ${year}</b><button type="button" data-lb-cal-month="1">›</button></div>${cells}<div class="lb-muted">🩷 Менструальные дни · 🌸 ориентировочное фертильное окно · ♥ записанное событие. Число под датой — день цикла.</div><div class="lb-muted">Текущая дата истории: ${esc(d.rpDate||'не задана')}. День цикла: ${currentCycleDay(d)||'—'}.</div></div>`;
}
function setStoryDate(d,date){const old=d.rpDate;if(old&&date&&d.cycleDay){const delta=daysBetween(old,date);if(delta!==null){const len=cycleLength(d);d.cycleDay=String(((Number(d.cycleDay)-1+delta)%len+len)%len+1);}}d.rpDate=date;if(d.cycleDay)d.cycleStart=addDays(date,-(Number(d.cycleDay)-1));refreshPregnancyChecks(d);}
function summary(d){const len=cycleLength(d),day=currentCycleDay(d);let cycle=day?`День ${day} / ${len}`:'—',preg='—';if(d.status==='pregnant'){const metrics=pregnancyMetrics(d);const weeks=metrics?.weeks??Number(d.week);preg=Number.isFinite(weeks)&&weeks>0?`${weeks} нед.`:'Ожидание';}return {cycle,preg};}
function fertility(d){const len=cycleLength(d),day=currentCycleDay(d);if(!day)return '🌙 Укажи день цикла или сюжетные даты, чтобы увидеть условную фазу.';const ov=Math.max(1,len-14),from=Math.max(1,ov-5),to=Math.min(len,ov+1);const phase=day<=5?'Менструальная фаза':day<from?'Фолликулярная фаза':day<=to?'Условное фертильное окно': 'Лютеиновая фаза';return `${d.universe==='omegaverse'?'🐺 Омегаверс · ':'🌸 '}${phase} · день ${day}/${len}. Ориентировочная овуляция: день ${ov}; сюжетное фертильное окно: дни ${from}–${to}. ${d.universe==='omegaverse'?'Правила мира задаются автором.':'Это условный расчёт для ролевой, не медицинский прогноз и не метод контрацепции.'}`;}
function render(){const root=document.getElementById('ups_tab_lifebloom');if(!root)return;const d=load();syncStoryTime(d);readModelSnapshot(d);const user=env.names().userName,stats=summary(d),people=peopleFor(d);const cyclePhase=(()=>{const m=fertility(d).match(/(?:🌸|🐺 Омегаверс · )(.+?) · день/);return m?m[1].replace(/ фаза$/i, ""):"";})();root.innerHTML=`<div class="ups_section_kicker">🌸 LIFE BLOOM</div><div class="ups_intro">Только твоя персона · отдельная история для каждого чата. Всё под твоим контролем.</div>
${d.heroLive?.mood||d.heroLive?.feeling?`<div class="lb-live-hero">🌷 ${esc([d.heroLive.mood,d.heroLive.feeling].filter(Boolean).join(' · '))}</div>`:''}<div class="lb-hero"><div class="lb-avatar" style="--ax:${Number(d.avatarX??50)}%;--ay:${Number(d.avatarY??30)}%;--az:${Number(d.avatarZoom??125)/100}">${d.avatar?`<img src="${esc(d.avatar)}" alt="Аватар">`:'🌷'}</div><div><div class="lb-overline">МОЯ ГЕРОИНЯ</div><div class="lb-name">${esc(user)}</div><div class="lb-muted">Её история, её выбор, её семья</div><label class="lb-upload">📷 Свой портрет <input id="lb_avatarFile" type="file" accept="image/*" hidden></label><button class="lb-mini" id="lb_avatarClear">Убрать</button><div class="lb-position">Кадр: <label>↔ <input id="lb_avatarX" type="range" min="0" max="100" value="${Number(d.avatarX??50)}"></label><label>↕ <input id="lb_avatarY" type="range" min="0" max="100" value="${Number(d.avatarY??30)}"></label><label>＋ <input id="lb_avatarZoom" type="range" min="100" max="250" value="${Number(d.avatarZoom??125)}"></label></div></div></div><div class="lb-stats"><div><small>🌙 Цикл</small><b>${esc(stats.cycle)}</b>${cyclePhase?`<em class="lb-stat-phase">${esc(cyclePhase)}</em>`:""}</div><div><small>💗 Материнство</small><b>${esc(stats.preg)}</b></div><div><small>🧸 Дети</small><b>${d.children.length}</b></div></div>
${d.heroLive?.physical||d.heroLive?.desire?`<div class="lb-card lb-wellbeing"><h3>🌷 Состояние Ханаби</h3><div class="lb-grid"><div>💗 Желание близости<br><b>${esc(d.heroLive.desire||'—')}</b></div><div>🌸 Самочувствие<br><b>${esc(d.heroLive.physical||'—')}</b></div></div></div>`:''}${d.whisper?`<div class="lb-card lb-whisper"><h3>💌 Шёпот истории</h3><i>${esc(d.whisper)}</i></div>`:''}<div class="lb-card"><h3>🕰️ Время истории</h3>${input('rpLabel','Дата и место по плашке ролевой (любой календарь)',d.rpLabel)}<details class="lb-advanced"><summary>Обычный календарь (необязательно)</summary>${input('rpDate','Дата ролевой (ДД.ММ.ГГГГ или ГГГГ-ММ-ДД)',d.rpDate)}</details><div class="lb-muted">Впиши дату из ролевой. Для фантастического календаря достаточно одной строки.</div></div><div class="lb-card"><h3>🌙 Ритмы жизни</h3><div class="lb-grid">${input('cycleDay','День цикла',d.cycleDay,'number')}${input('cycleLength','Длина цикла (дни)',d.cycleLength,'number')}</div><details class="lb-advanced"><summary>Дата начала цикла (необязательно)</summary>${input('cycleStart','Первый день последнего цикла (ДД.ММ.ГГГГ)',d.cycleStart)}</details><div class="lb-muted">Указанный вручную день цикла имеет приоритет. Дата начала цикла не сбросит его в день 1. Расчёт ведётся исключительно по дате ролевой. Если в мире необычный календарь, используй ручной день цикла. Расчёт условный, для сюжета.</div><button class="lb-btn" type="button" id="lb_nextDay">🌙 Следующий сюжетный день (+1)</button><div class="lb-muted">Если плашку рисует отдельное расширение и её дата отсутствует в тексте сообщения, используй календарь ниже. Автоматически учитываются явные переходы времени («на следующее утро», «спустя два дня») и метки [RP_DATE]. Если день в истории сменился без явной фразы, нажми +1. Счётчик не зависит от часов телефона.</div><div class="lb-muted" id="lb_fertility">${fertility(d)}</div><div class="lb-grid"><label class="lb-field"><span>Вселенная</span><select id="lb_universe"><option value="standard">Обычная</option><option value="omegaverse">Омегаверс</option></select></label><label class="lb-field"><span>Контрацепция (сюжет)</span><select id="lb_contraception"><option value="unspecified">Не указана</option><option value="none">Нет</option><option value="barrier">Барьерная</option><option value="hormonal">Гормональная</option><option value="fictional">Фэнтези / другая</option></select></label></div></div>
${storyCalendar(d)}<div class="lb-card"><h3>🧪 Сюжетное зачатие и тест</h3><div class="lb-muted">Время берётся только из даты ролевой. Записывай событие без контрацепции вручную или через подтверждённые сюжетные данные. Через 14 сюжетных дней появится напоминание о тесте. Положительный результат требует твоего выбора — система не объявляет беременность случайно.</div><button class="lb-btn" id="lb_exposure">💕 Добавить событие (с подтверждением)</button><div class="lb-muted">${(d.exposures||[]).slice(-8).reverse().map(x=>`<div class="lb-event">${esc(x.date)} · день ${esc(x.day||'неизвестен')} · ${x.possible?'🌸 условное фертильное окно':'вне рассчитанного окна / неизвестно'} · ${esc(x.result)} <button class="lb-btn" data-delete-exposure="${esc(x.id)}">🗑 Удалить</button> ${x.result==='pending'?`<button class="lb-btn" data-test="${esc(x.id)}">🧪 Результат теста</button>`:''}</div>`).join('')||'Событий пока нет.'}</div></div><div class="lb-card"><h3>🩷 Материнство</h3><label class="lb-field"><span>Состояние</span><select id="lb_status"><option value="none">Не указано</option><option value="pregnant">Беременна</option><option value="postpartum">После родов</option><option value="other">Другое</option></select></label><div class="lb-grid">${input('week','Неделя беременности',d.week,'number')}${input('due','Предполагаемая дата родов',d.due,'date')}</div><div class="lb-grid">${input('gestation','Срок беременности (недель)',d.gestation,'number')}${input('babies','Количество малышей',d.babies,'number')}</div>${input('partner','Отец / партнёр',d.partner)}${input('conceptionDate','Предполагаемое зачатие (сюжетная дата)',d.conceptionDate,'date')}<div class="lb-muted">${pregnancyMetrics(d)?`Срок: ${pregnancyMetrics(d).weeks} нед. ${pregnancyMetrics(d).days} дн. · ПДР: ${pregnancyMetrics(d).due}`:'При известной дате зачатия срок и ПДР рассчитываются по сюжетной дате.'}</div><label class="lb-field"><span>Завершение беременности</span><select id="lb_pregnancyOutcome"><option value="">Без изменений</option><option value="clear">Отменить ошибочную запись</option><option value="miscarriage">Выкидыш (сюжет)</option><option value="abortion">Прерывание (сюжет)</option></select></label><details class="lb-advanced"><summary>Дополнительные сведения (необязательно)</summary><label class="lb-field"><span>Сюжетные особенности, симптомы или пожелания</span><textarea id="lb_notes" rows="2">${esc(d.notes)}</textarea></label></details><button class="lb-btn lb-primary" id="lb_save">💾 Сохранить изменения</button></div>
<div class="lb-card"><h3>🧸 Мои дети <span class="lb-count">${d.children.length}</span></h3><div id="lb_children">${d.children.length?d.children.map((c,i)=>`<div class="lb-child"><span>✦ <b>${esc(c.name||'Без имени')}</b><small>${esc([c.sex,c.birthday,c.father].filter(Boolean).join(' · '))}${c.description?` · ${esc(c.description)}`:''}${c.personality?` · Характер: ${esc(c.personality)}`:''}</small></span><button data-del="${i}" title="Удалить">✕</button></div>`).join(''):'<div class="lb-muted">Пока нет записей. Добавь ребёнка вручную.</div>'}</div><div class="lb-grid">${input('childName','Имя ребёнка')}${input('childSex','Пол')}</div><div class="lb-grid">${input('childBirth','Дата рождения','', 'date')}${input('childFather','Отец')}</div>${input('childDescription','Описание ребёнка')}${input('childPersonality','Характер / привычки')}<button class="lb-btn" id="lb_add">＋ Добавить ребёнка</button></div>
<details class="lb-card lb-advanced"><summary>🔎 Восстановление событий из старой истории</summary><label class="lb-switch"><input id="lb_auto" type="checkbox" ${d.auto?'checked':''}> Анализировать новые сообщения без запросов к модели</label><div class="lb-muted">Распознавание осторожное: найденное событие остаётся предложением и никогда не меняет семейную историю без подтверждения.</div><button class="lb-btn" id="lb_scan">↻ Просмотреть доступную историю</button><div class="lb-muted">${d.lastScanned} сообщений просмотрено · ${d.candidates.length} предложений</div><div id="lb_candidates">${d.candidates.slice(-15).reverse().map(c=>`<div class="lb-event"><div class="lb-overline">${c.type==='pregnancy'?'ВОЗМОЖНАЯ БЕРЕМЕННОСТЬ':c.type==='birth'?'ВОЗМОЖНЫЕ РОДЫ':'СЕМЕЙНОЕ СОБЫТИЕ'} · сообщение ${c.index+1}</div><div>${esc(c.excerpt)}</div><button class="lb-btn" data-dismiss="${esc(c.id)}">Проверено · убрать</button></div>`).join('')}</div></details>`;
 // LifeBloom 0.3: visual dashboard and separate settings drawer. Existing handlers remain intact.
 const hero=root.querySelector('.lb-hero');
 const statsEl=root.querySelector('.lb-stats');
 const heading=root.querySelector('.ups_section_kicker');
 const intro=root.querySelector('.ups_intro');
 if(intro)intro.remove();
 const dashboard=document.createElement('div');dashboard.className='lb-dashboard';
 const toolbar=document.createElement('div');toolbar.className='lb-toolbar';
 toolbar.innerHTML='<div><button type="button" id="lb_help" title="Информация">ⓘ</button><button type="button" id="lb_settings" title="Настройки">⚙</button></div>';
 heading?.after(toolbar);
 const settings=document.createElement('div');settings.className='lb-settings';settings.hidden=true;
 const settingsHeader=document.createElement('div');settingsHeader.className='lb-settings-header';settingsHeader.innerHTML='<b>⚙ Настройки LifeBloom</b><button type="button" id="lb_settingsClose">✕</button>';
 const themeRow=document.createElement('label');themeRow.className='lb-field';themeRow.innerHTML='<span>Тема оформления</span><select id="lb_theme"><option value="hanabi">💜 Hanabi</option><option value="moon">🌙 Лунная</option><option value="rose">🌸 Розовая</option><option value="minimal">✧ Минимализм</option></select>';
 settings.append(settingsHeader,themeRow);const liveToggle=document.createElement('label');liveToggle.className='lb-switch';liveToggle.innerHTML=`<input type="checkbox" id="lb_liveAuto" ${d.liveAuto!==false?'checked':''}> 🌸 Автоматически читать ответы модели`;settings.append(liveToggle);const reread=document.createElement('button');reread.className='lb-btn';reread.textContent='↻ Обновить из истории';reread.onclick=()=>{const x=load();readModelSnapshot(x);render();};const manualRefresh=document.createElement('details');manualRefresh.className='lb-advanced';const refreshSummary=document.createElement('summary');refreshSummary.textContent='Дополнительные действия';manualRefresh.append(refreshSummary,reread);settings.append(manualRefresh);liveToggle.querySelector('input').onchange=e=>{const x=load();x.liveAuto=e.target.checked;save(x);};
 const avatarPosition=root.querySelector('.lb-position');if(avatarPosition)settings.append(avatarPosition);
 const upload=root.querySelector('.lb-upload');if(upload)settings.append(upload);
 const clear=root.querySelector('#lb_avatarClear');if(clear)settings.append(clear);
 // Keep narrative cards on the beautiful dashboard, not in the technical settings.
 const wellbeing=root.querySelector('.lb-wellbeing');
 const whisper=root.querySelector('.lb-whisper');
 [...root.querySelectorAll('.lb-card')].forEach(card=>{if(card!==wellbeing&&card!==whisper)settings.append(card);});
 const liveDetails=document.createElement('section');liveDetails.className='lb-story-glance';
 if(wellbeing){
   const desire=d.heroLive?.desire||'';
   const physical=d.heroLive?.physical||'';
   wellbeing.remove();
   const fields=[desire?`<span>💗 ${esc(desire)}</span>`:'',physical?`<span>🌷 ${esc(physical)}</span>`:''].filter(Boolean);
   const status=document.createElement('div');status.className='lb-glance-status';status.innerHTML=fields.join('');
   liveDetails.append(status);
 }
 if(whisper){
   whisper.remove();
   const note=document.createElement('details');note.className='lb-glance-whisper';
   note.innerHTML=`<summary>💌 Шёпот истории <span>⌄</span></summary><div>${esc(d.whisper)}</div>`;
   liveDetails.append(note);
 }
 if(liveDetails.children.length)hero?.append(liveDetails);

 root.append(settings);
 const circle=document.createElement('section');circle.className='lb-circle';
 const visible=people.filter(p=>p.visible!==false);
 circle.innerHTML=`<div class="lb-circle-head">✦ БЛИЗКИЕ В ИСТОРИИ <small>${visible.length}</small></div>${visible.length?visible.map(personCard).join(''):'<div class="lb-circle-empty">Здесь появятся главные герои, дети и важные NPC 🌸</div>'}`;
 statsEl?.after(circle);
 const registry=document.createElement('div');registry.className='lb-card lb-registry';
 registry.innerHTML=`<h3>💕 Круг персонажей</h3><div class="lb-muted">Главный герой из карточки добавляется автоматически. Для карточки с двумя героями добавь второго здесь. NPC и дети — только важные для истории.</div><div class="lb-grid">${input('personName','Имя') }<label class="lb-field"><span>Роль</span><select id="lb_personRole"><option value="main">Главный герой</option><option value="npc">Важный NPC</option><option value="child">Ребёнок / подопечный</option></select></label></div><button class="lb-btn" id="lb_personAdd">＋ Добавить</button><div id="lb_registryRows">${people.map(p=>`<div class="lb-reg-row"><b>${esc(p.name)}</b><small>${p.role==='main'?'Главный':p.role==='child'?'Ребёнок':'NPC'}</small><label><input type="checkbox" data-person-visible="${esc(p.id)}" ${p.visible!==false?'checked':''}> Видно</label><label class="lb-person-upload" title="Загрузить портрет">📷<input type="file" accept="image/*" data-person-avatar="${esc(p.id)}" hidden></label><button data-person-edit="${esc(p.id)}">✎</button><button data-person-remove="${esc(p.id)}">✕</button></div>`).join('')}</div>`;
 settings.append(registry);
 registry.querySelector('#lb_personAdd').onclick=()=>{const x=load(),name=registry.querySelector('#lb_personName').value.trim(),role=registry.querySelector('#lb_personRole').value;if(!name)return alert('Укажи имя');if((x.people||[]).some(p=>p.name.toLowerCase()===name.toLowerCase()))return alert('Такое имя уже есть');x.people=[...(x.people||[]),{id:'person:'+Date.now(),name,role,source:'manual',visible:true,mood:'',thought:'',avatar:''}];save(x);render();};
 registry.querySelectorAll('[data-person-visible]').forEach(el=>el.onchange=()=>{const x=load(),p=(x.people||[]).find(p=>p.id===el.dataset.personVisible);if(p)p.visible=el.checked;save(x);render();});
 registry.querySelectorAll('[data-person-remove]').forEach(el=>el.onclick=()=>{if(!confirm('Убрать персонажа из LifeBloom?'))return;const x=load();x.people=(x.people||[]).filter(p=>p.id!==el.dataset.personRemove);save(x);render();});
 registry.querySelectorAll('[data-person-avatar]').forEach(el=>el.onchange=async()=>{
  const file=el.files?.[0];if(!file)return;
  if(file.size>8*1024*1024)return alert('Выбери портрет до 8 МБ');
  const url=URL.createObjectURL(file);const img=new Image();
  try{
   await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
   const canvas=document.createElement('canvas');const size=320;canvas.width=size;canvas.height=size;
   const ctx=canvas.getContext('2d');const scale=Math.max(size/img.width,size/img.height);
   const w=img.width*scale,h=img.height*scale;ctx.drawImage(img,(size-w)/2,(size-h)/2,w,h);
   const x=load(),p=(x.people||[]).find(p=>p.id===el.dataset.personAvatar);
   if(!p)return;p.avatar=canvas.toDataURL('image/jpeg',.78);save(x);render();
  }catch(e){alert('Не удалось загрузить портрет: '+e.message);}finally{URL.revokeObjectURL(url);}
 });
 registry.querySelectorAll('[data-person-edit]').forEach(el=>el.onclick=()=>{const x=load(),p=(x.people||[]).find(p=>p.id===el.dataset.personEdit);if(!p)return;const mood=prompt('Настроение (можно с эмодзи)',p.mood||'');if(mood===null)return;const thought=prompt('Короткая мысль о Ханаби / её семье',p.thought||'');if(thought===null)return;p.mood=mood.slice(0,100);p.thought=thought.slice(0,220);p.liveNote=false;save(x);render();});
 // Phase is displayed once, inside the cycle statistic.
 const setSettings=(open)=>{settings.hidden=!open;root.classList.toggle('lb-editing',open);};
 toolbar.querySelector('#lb_settings').onclick=()=>setSettings(true);
 settingsHeader.querySelector('#lb_settingsClose').onclick=()=>setSettings(false);
 toolbar.querySelector('#lb_help').onclick=()=>alert('LifeBloom хранит данные отдельно для каждого чата. Расчёты выполняются локально без запросов к модели. Сюжетная дата задаётся вручную, события из чата требуют подтверждения. Все поля редактируются в ⚙.');
 const themeSelect=themeRow.querySelector('select');themeSelect.value=d.theme||'hanabi';
 const applyTheme=v=>{root.dataset.lbTheme=v;};applyTheme(themeSelect.value);
 themeSelect.onchange=()=>{const x=load();x.theme=themeSelect.value;save(x);applyTheme(x.theme);};
 root.querySelector('#lb_status').value=d.status;root.querySelector('#lb_universe').value=d.universe||'standard';root.querySelector('#lb_contraception').value=d.contraception||'unspecified';
 root.querySelector('#lb_avatarFile').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>3*1024*1024)return alert('Выбери изображение до 3 МБ');const img=new Image();const url=URL.createObjectURL(file);try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});const canvas=document.createElement('canvas');const scale=Math.min(1,700/Math.max(img.width,img.height));canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,canvas.width,canvas.height);const x=load();x.avatar=canvas.toDataURL('image/jpeg',0.75);x.avatarX=50;x.avatarY=30;save(x);render();}catch{alert('Не удалось открыть изображение')}finally{URL.revokeObjectURL(url)}};
 for(const axis of ['X','Y'])root.querySelector('#lb_avatar'+axis).oninput=e=>{const x=load();x['avatar'+axis]=Number(e.target.value);save(x);root.querySelector('.lb-avatar').style.setProperty('--a'+axis.toLowerCase(),e.target.value+'%');};
 root.querySelector('#lb_avatarZoom').oninput=e=>{const x=load();x.avatarZoom=Number(e.target.value);save(x);root.querySelector('.lb-avatar').style.setProperty('--az',x.avatarZoom/100);};
 root.querySelector('#lb_avatarClear').onclick=()=>{const x=load();x.avatar='';save(x);render();};
 root.querySelector('#lb_exposure').onclick=()=>{const x=load();if(!x.rpDate){alert('Сначала укажи дату ролевой и сохрани её.');return;}const date=prompt('Дата события в истории (ГГГГ-ММ-ДД). Отмена ничего не записывает.',x.rpDate);if(date===null)return;const normalized=normalizeDate(date);if(!normalized){alert('Неверная дата.');return;}if(!confirm('Подтвердить запись близости без защиты на '+normalized+'?'))return;if(registerIntimacy(x,normalized)){save(x);}render();};
 root.querySelectorAll('[data-delete-exposure]').forEach(b=>b.onclick=()=>{if(!confirm('Удалить ошибочную запись близости?'))return;const x=load();x.exposures=(x.exposures||[]).filter(e=>e.id!==b.dataset.deleteExposure);save(x);render();});
 root.querySelectorAll('[data-lb-cal-date]').forEach(b=>b.onclick=()=>{const x=load();const date=b.dataset.lbCalDate;if(!confirm('Установить дату ролевой '+date+'?'))return;setStoryDate(x,date);refreshStoryAlerts(x);save(x);render();});
 root.querySelectorAll('[data-lb-cal-month]').forEach(b=>b.onclick=()=>{const x=load();const base=normalizeDate(x.rpDate)||'2026-10-08';const [y,m]=base.split('-').map(Number);const date=new Date(y,m-1+Number(b.dataset.lbCalMonth),1);const target=validDate(date.getFullYear(),date.getMonth()+1,Math.min(Number(base.slice(8)),new Date(date.getFullYear(),date.getMonth()+1,0).getDate()));setStoryDate(x,target);save(x);render();});
 root.querySelectorAll('[data-test]').forEach(b=>b.onclick=()=>{const x=load(),e=(x.exposures||[]).find(v=>v.id===b.dataset.test);if(!e)return;const days=x.rpDate?daysBetween(e.date,x.rpDate):null;if(days===null||days<14){alert('До сюжетного теста должно пройти минимум 14 дней.');return;}const answer=prompt('Результат сюжетного теста: + (положительный), - (отрицательный), ? (неопределённый)','?');if(!['+','-','?'].includes(answer))return;e.result=answer==='+'?'positive':answer==='-'?'negative':'uncertain';if(answer==='+'){if(confirm('Подтвердить беременность Ханаби в этой истории?')){x.status='pregnant';x.conceptionDate=e.date;x.week='';}}save(x);render();});
 root.querySelector('#lb_nextDay').onclick=()=>{const x=load();if(!x.cycleDay){alert('Сначала задай день цикла и сохрани.');return;}advanceStoryDays(x,1);refreshStoryAlerts(x);save(x);render();};
 root.querySelector('#lb_save').onclick=()=>{const x=load();for(const f of ['rpLabel','rpDate','cycleDay','cycleLength','cycleStart','week','due','gestation','babies','partner','notes','conceptionDate'])x[f]=root.querySelector('#lb_'+f).value;
 const rpRaw=x.rpDate.trim(), startRaw=x.cycleStart.trim();
 x.rpDate=normalizeDate(rpRaw)||storyDateFromLabel(x.rpLabel)||bannerStoryDate(x.rpLabel);
 if(rpRaw&&!normalizeDate(rpRaw)){alert('Неверная дата ролевой. Используй ДД.ММ.ГГГГ или ГГГГ-ММ-ДД.');return;}
 x.cycleStart=normalizeDate(startRaw);
 if(startRaw&&!x.cycleStart){alert('Неверная дата начала цикла.');return;}
 const day=Number(x.cycleDay),len=cycleLength(x);
 if(x.cycleDay!==''&&(!Number.isInteger(day)||day<1||day>len)){alert('День цикла должен быть от 1 до '+len);return;}
 if(x.cycleDay!==''){x.cycleMode='manual';if(x.rpDate)x.cycleStart=addDays(x.rpDate,-(day-1));}
 else if(x.cycleStart){x.cycleMode='date';}
 x.status=root.querySelector('#lb_status').value;const outcome=root.querySelector('#lb_pregnancyOutcome').value;if(outcome){if(!confirm('Подтвердить изменение беременности? Запись будет сохранена в истории сюжета.'))return;x.pregnancyOutcome=outcome;x.status='none';x.week='';x.due='';x.conceptionDate='';}x.universe=root.querySelector('#lb_universe').value;x.contraception=root.querySelector('#lb_contraception').value;if(!x.timeScanCursor)x.timeScanCursor=(env.ctx()?.chat||[]).length;refreshStoryAlerts(x);save(x);render();};
 root.querySelector('#lb_add').onclick=()=>{const x=load(),name=root.querySelector('#lb_childName').value.trim();if(!name)return alert('Укажи имя ребёнка');x.children.push({name,sex:root.querySelector('#lb_childSex').value,birthday:root.querySelector('#lb_childBirth').value,father:root.querySelector('#lb_childFather').value,description:root.querySelector('#lb_childDescription').value,personality:root.querySelector('#lb_childPersonality').value});save(x);render();};
 root.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{if(!confirm('Удалить запись о ребёнке?'))return;const x=load();x.children.splice(Number(b.dataset.del),1);save(x);render();});
 root.querySelectorAll('[data-dismiss]').forEach(b=>b.onclick=()=>{const x=load();x.candidates=x.candidates.filter(c=>c.id!==b.dataset.dismiss);x.dismissed=[...(x.dismissed||[]),b.dataset.dismiss].slice(-500);save(x);render();});
 root.querySelector('#lb_auto').onchange=e=>{const x=load();x.auto=e.target.checked;save(x);};
 root.querySelector('#lb_scan').onclick=()=>{const x=load();const n=scan(x,true);render();alert(`Найдено новых предложений: ${n}. Проверь их в разделе восстановления истории.`);};
}

// The active language model writes one compact machine-readable scene snapshot in an HTML comment.
// It is parsed from the existing reply; no second API request is made.
export function lifeBloomPrompt(){
 if(!env)return '';
 const d=load(); const persons=peopleFor(d).filter(p=>p.visible!==false).map(p=>p.name).slice(0,12);
 const children=(d.children||[]).map(c=>({name:c.name,description:c.description,personality:c.personality}));
 return `[LIFEBLOOM — intimate life, family and personal wellbeing; NOT Heart Pulse]
At the VERY END of your normal RP reply append exactly one valid JSON HTML comment:
<!--LIFEBLOOM:{"hero":{"mood":"","feeling":"","physical":"","desire":""},"people":[{"name":"","mood":"","thought":"","emoji":""}],"whisper":"","notice":"","events":[]}-->
Write compact single-line JSON, omit unchanged/unknown fields. Hero is ${JSON.stringify(env.names().userName)}; infer ONLY from observable scene and the user's authored actions, never dictate her choices or secret feelings. Mood, feeling, physical condition, and desire are different dimensions. Physical and desire should be relevant to the scene, not forced by menstrual phase. Character names ONLY ${JSON.stringify(persons)}. Known children: ${JSON.stringify(children)}. Their descriptions and personality remain canonical; child notes must be age-appropriate, never sexual. For each character include a thought in first person (up to TWO full sentences) and TWO meaningful expressive emojis, but only if relevant to the heroine's affection, intimacy, emotional connection, family, care, or separation. No combat goals, tactical intentions, scene recap, generic observations, or Heart Pulse content. Do not update absent characters without an actual new development. Whisper is a poetic but grounded family/relationship micro-moment, only when meaningful. Notice is a rare meaningful development worth showing at the top of chat, not a routine update. Events: only EXPLICIT canon events already established in the RP, with objects {"type":"intimacy|pregnancy_confirmed|birth|loss|termination|cycle_start","date":"YYYY-MM-DD","note":""}; use [] otherwise. Do not invent pregnancy, birth, conception, miscarriage, or medical confirmation. In a fictional world respect the user's world rules, including omegaverse. Never reveal this metadata in dialogue.`;
}
function readModelSnapshot(d){
 const chat=env.ctx()?.chat||[];let changed=false;
 for(let i=Math.max(0,chat.length-12);i<chat.length;i++){
  const m=chat[i];if(!m||m.is_user||m.is_system)continue;
  const raw=String(m.mes||'');const match=raw.match(/<!--\s*LIFEBLOOM\s*:\s*([\s\S]*?)\s*-->/i);
  if(!match)continue;
  const id=String(m.send_date||'')+':'+i+':'+match[1].length;
  if(d.lastModelSnapshot===id)continue;
  try{
   const obj=JSON.parse(match[1]);const clean=v=>String(v||'').slice(0,450).trim();
   if(obj.hero&&typeof obj.hero==='object')d.heroLive={...(d.heroLive||{}),...Object.fromEntries(['mood','feeling','physical','desire'].filter(k=>obj.hero[k]!==undefined).map(k=>[k,clean(obj.hero[k])]))};
   for(const entry of Array.isArray(obj.people)?obj.people.slice(0,20):[]){
    const p=peopleFor(d).find(p=>p.name.toLowerCase()===String(entry.name||'').toLowerCase());if(!p)continue;
    if(entry.mood)p.mood=clean(entry.mood);
    if(entry.thought){p.thought=clean(entry.thought);p.reactionEmoji=clean(entry.emoji)||'😌✨';p.liveNote=false;}
    delete p.intent;delete p.observation;
   }
   if(obj.whisper)d.whisper=clean(obj.whisper);
   for(const event of Array.isArray(obj.events)?obj.events.slice(0,8):[]){if(!['intimacy','pregnancy_confirmed','birth','loss','termination','cycle_start'].includes(event.type))continue;const eventId=id+':'+event.type+':'+String(event.date||'');if(!(d.storyEvents||[]).some(e=>e.id===eventId))d.storyEvents=[...(d.storyEvents||[]),{id:eventId,type:event.type,date:clean(event.date),note:clean(event.note),confirmed:false}].slice(-100);
    if(event.type==='intimacy'&&d.contraception==='none'&&!(d.alertHistory||[]).includes('intimacy:'+eventId)){
      registerIntimacy(d,normalizeDate(event.date)||d.rpDate,'model');
      d.alertHistory=[...(d.alertHistory||[]),'intimacy:'+eventId].slice(-120);
      const noteId='story:'+eventId;d.notices=[...(d.notices||[]),{id:noteId,body:'🌸 В сюжете отмечена близость без контрацепции. Возможность беременности не равна подтверждению: дождись сюжетного теста или подтверди событие вручную.'}].slice(-25);d.unreadNotice=noteId;
    }}
   if(obj.notice){d.notices=[...(d.notices||[]),{id,body:clean(obj.notice)}].slice(-25);d.unreadNotice=id;}
   d.lastModelSnapshot=id;d.lastLiveMessage=chat.length;changed=true;
   // Remove the transport-only metadata from the visible roleplay message.
   m.mes=raw.replace(match[0],'').trimEnd();
  }catch(e){console.warn('[LifeBloom] malformed scene snapshot',e);}
 }
 if(changed)save(d);return changed;
}
function showChatNotice(d){
 let bar=document.getElementById('ups-lifebloom-chat-notice');
 if(!d.unreadNotice){bar?.remove();return;}
 const n=(d.notices||[]).find(x=>x.id===d.unreadNotice);if(!n){bar?.remove();return;}
 if(!bar){bar=document.createElement('div');bar.id='ups-lifebloom-chat-notice';document.body.append(bar);}
 bar.innerHTML='<span>🌸 LifeBloom · '+esc(n.body)+'</span><button type="button" aria-label="Закрыть уведомление">×</button>';
 bar.querySelector('button').onclick=()=>{const x=load();x.unreadNotice='';save(x);bar.remove();};
}
export function setupLifeBloom(environment){env=environment;}
export function lifeBloomTab(){const p=document.createElement('section');p.id='ups_tab_lifebloom';p.className='ups_tabpage';return p;}
export function refreshLifeBloom(){if(env){render();showChatNotice(load());}}
export function onLifeBloomMessage(){if(!env)return;const d=load();if(d.auto)scan(d,false);syncStoryTime(d);readModelSnapshot(load());showChatNotice(load());if(document.getElementById('ups_tab_lifebloom')?.classList.contains('ups_active'))render();}
