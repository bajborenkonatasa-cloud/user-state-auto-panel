// LifeBloom 0.1 — independent, chat-scoped family journal for User Persona Studio.
// No model requests. No prompt injection. No automatic changes from uncertain prose.
const STORE='ups_lifebloom_v1_';
let env=null;
const empty=()=>({avatar:'',avatarX:50,avatarY:30,avatarZoom:125,rpLabel:'',rpDate:'',universe:'standard',contraception:'unspecified',cycleMode:'manual',partner:'',status:'none',week:'',due:'',cycleDay:'',cycleLength:'28',cycleStart:'',gestation:'40',babies:'1',notes:'',children:[],people:[],candidates:[],dismissed:[],lastScanned:0,lastLiveMessage:0,liveAuto:true,auto:true});
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
function personCard(p){const role=p.role==='main'?'💕 ГЛАВНЫЙ ГЕРОЙ':p.role==='child'?'🧸 РЕБЁНОК':'✨ ВАЖНЫЙ NPC';return `<div class="lb-person" data-person="${esc(p.id)}"><div class="lb-person-face">${p.avatar?`<img src="${esc(p.avatar)}" alt="">`:esc(p.role==='child'?'🧸':p.role==='main'?'💗':'✨')}</div><div class="lb-person-info"><div class="lb-person-role">${role}</div><b>${esc(p.name)}</b>${p.mood?`<small>${esc(p.mood)}</small>`:''}${p.thought?`<div class="lb-person-thought">💭 «${esc(p.thought)}»</div>`:''}</div></div>`;}
function save(d){try{localStorage.setItem(key(),JSON.stringify(d));}catch(e){alert('Не удалось сохранить LifeBloom: '+e.message);}}
const input=(id,label,value='',type='text')=>`<label class="lb-field"><span>${label}</span><input id="lb_${id}" type="${type}" value="${esc(value)}"></label>`;
function scan(d,full=false){const chat=env.ctx().chat||[];const start=full?0:Math.min(d.lastScanned,chat.length);const found=[];
 for(let i=start;i<chat.length;i++){const m=chat[i],s=String(m?.mes||'').replace(/<[^>]*>/g,' ').slice(0,12000);if(!s.trim())continue;
 const patterns=[['pregnancy',/(?:я беременна|ты беременна|она беременна|подтвержден[ао] беременность|тест показал две полоски)/i],['birth',/(?:\bродила\b|появил[аи]сь на свет|родился (?:сын|мальчик)|родилась (?:дочь|девочка))/i],['family',/(?:наш[аи] (?:сын|дочь|реб[её]нок)|у нас (?:родился|родилась) (?:сын|дочь))/i]];
 for(const [type,re] of patterns)if(re.test(s)){const quote=s.match(re)?.[0]||'';const id=i+':'+type;if(!d.candidates.some(c=>c.id===id)&&!(d.dismissed||[]).includes(id))found.push({id,type,quote,excerpt:s.slice(Math.max(0,s.search(re)-65),Math.min(s.length,s.search(re)+115)),index:i});}
 }d.candidates=[...d.candidates,...found].slice(-80);d.lastScanned=chat.length;save(d);return found.length;}
// Lightweight, local story signals. Only explicit character-linked statements are applied.
// No extra model calls and no changes to other User Persona Studio sections.
function updateLive(d){
 if(d.liveAuto===false)return false;
 const chat=env.ctx()?.chat||[];
 let changed=false;
 const start=Math.max(0,Math.min(Number(d.lastLiveMessage)||0,chat.length));
 const people=peopleFor(d);
 for(let i=start;i<chat.length;i++){
  const m=chat[i];if(m?.is_user||m?.is_system)continue;
  const raw=String(m?.mes||'').replace(/<[^>]*>/g,' ').slice(0,12000);
  if(!raw.trim())continue;
  const lines=raw.split(/[\n.!?]+/).map(x=>x.trim()).filter(Boolean);
  for(const p of people){
   const escaped=p.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
   const nameRe=new RegExp('(?:^|\\s)'+escaped+'(?:[,:\\s]|$)','i');
   const moods=[[/\b(обеспокоен|встревожен|тревожится|волнуется)\b/i,'😟 Обеспокоен'],[/\b(раздраж[её]н|злится|сердится)\b/i,'😤 Раздражён'],[/\b(счастлив|радост[её]н|улыбается)\b/i,'😊 Радостный'],[/\b(устал|измотан|сонн)\w*/i,'😮‍💨 Устал'],[/\b(ревнует|ревнив)\w*/i,'😒 Ревнует'],[/\b(испуган|боится)\b/i,'😨 Испуган'],[/\b(плачет|рыдает|хнычет)\b/i,'🥺 Расстроен']];
   for(const line of lines){
    if(!nameRe.test(line))continue;
    for(const [re,label] of moods){if(re.test(line)&&p.mood!==label){p.mood=label;changed=true;} }
    // Only a clearly attributed, quoted internal thought is captured.
    const thought=line.match(/(?:подумал[а]?|мысленно произн[её]с|про себя подумал[а]?)\s*[:—-]?\s*[«“"]([^»”"]{4,140})[»”"]/i);
    if(thought&&p.thought!==thought[1]){p.thought=thought[1];changed=true;}
   }
  }
 }
 if(d.lastLiveMessage!==chat.length){d.lastLiveMessage=chat.length;changed=true;}
 if(changed)save(d);
 return changed;
}
function daysBetween(a,b){const x=new Date(a+'T12:00:00'),y=new Date(b+'T12:00:00');return Number.isFinite(+x)&&Number.isFinite(+y)?Math.round((y-x)/86400000):null;}
function addDays(s,n){const d=new Date(s+'T12:00:00');if(!Number.isFinite(+d))return '';d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}
function summary(d){const today=d.rpDate;let cycle='—',preg='—';const len=Math.max(20,Math.min(45,Number(d.cycleLength)||28));if(d.cycleStart&&today){const n=daysBetween(d.cycleStart,today);if(n!==null&&n>=0)cycle=`День ${n%len+1} / ${len}`;}if(d.cycleDay && (!d.cycleStart || !today))cycle=`День ${d.cycleDay} / ${len}`;if(d.status==='pregnant'){const weeks=Number(d.week);preg=weeks>0?`${weeks} нед.`:'Ожидание';}return {cycle,preg};}
function fertility(d){const len=Number(d.cycleLength)||28;let day=Number(d.cycleDay);if(d.rpDate&&d.cycleStart){const n=daysBetween(d.cycleStart,d.rpDate);if(n!==null&&n>=0)day=n%len+1;}if(!day||day<1||day>len)return '🌙 Укажи день цикла или сюжетные даты, чтобы увидеть условную фазу.';const ov=Math.max(1,len-14);const phase=day<=5?'Менструальная фаза':day<ov-5?'Фолликулярная фаза':day<=ov+1?'Условное фертильное окно':'Лютеиновая фаза';return `${d.universe==='omegaverse'?'🐺 Омегаверс · ':'🌸 '}${phase} · день ${day}/${len}. ${d.universe==='omegaverse'?'Течки и запахи определяются правилами твоего мира, а не реальной биологией.':'Фертильное окно приблизительное; это не гарантия зачатия и не метод контрацепции.'}`;}
function render(){const root=document.getElementById('ups_tab_lifebloom');if(!root)return;const d=load();updateLive(d);const user=env.names().userName,stats=summary(d),people=peopleFor(d);root.innerHTML=`<div class="ups_section_kicker">🌸 LIFE BLOOM</div><div class="ups_intro">Только твоя персона · отдельная история для каждого чата. Всё под твоим контролем.</div>
<div class="lb-hero"><div class="lb-avatar" style="--ax:${Number(d.avatarX??50)}%;--ay:${Number(d.avatarY??30)}%;--az:${Number(d.avatarZoom??125)/100}">${d.avatar?`<img src="${esc(d.avatar)}" alt="Аватар">`:'🌷'}</div><div><div class="lb-overline">МОЯ ГЕРОИНЯ</div><div class="lb-name">${esc(user)}</div><div class="lb-muted">Её история, её выбор, её семья</div><label class="lb-upload">📷 Свой портрет <input id="lb_avatarFile" type="file" accept="image/*" hidden></label><button class="lb-mini" id="lb_avatarClear">Убрать</button><div class="lb-position">Кадр: <label>↔ <input id="lb_avatarX" type="range" min="0" max="100" value="${Number(d.avatarX??50)}"></label><label>↕ <input id="lb_avatarY" type="range" min="0" max="100" value="${Number(d.avatarY??30)}"></label><label>＋ <input id="lb_avatarZoom" type="range" min="100" max="250" value="${Number(d.avatarZoom??125)}"></label></div></div></div><div class="lb-stats"><div><small>🌙 Цикл</small><b>${esc(stats.cycle)}</b></div><div><small>💗 Материнство</small><b>${esc(stats.preg)}</b></div><div><small>🧸 Дети</small><b>${d.children.length}</b></div></div>
<div class="lb-card"><h3>🕰️ Время истории</h3>${input('rpLabel','Дата и место по плашке ролевой (любой календарь)',d.rpLabel)}<details class="lb-advanced"><summary>Обычный календарь (необязательно)</summary>${input('rpDate','Дата для расчётов',d.rpDate,'date')}</details><div class="lb-muted">Впиши дату из ролевой. Для фантастического календаря достаточно одной строки.</div></div><div class="lb-card"><h3>🌙 Ритмы жизни</h3><div class="lb-grid">${input('cycleDay','День цикла',d.cycleDay,'number')}${input('cycleLength','Длина цикла (дни)',d.cycleLength,'number')}</div><details class="lb-advanced"><summary>Дата начала цикла (необязательно)</summary>${input('cycleStart','Первый день последнего цикла',d.cycleStart,'date')}</details><div class="lb-muted">Расчёт ведётся исключительно по дате ролевой. Если в мире необычный календарь, используй ручной день цикла. Расчёт условный, для сюжета.</div><div class="lb-muted" id="lb_fertility">${fertility(d)}</div><div class="lb-grid"><label class="lb-field"><span>Вселенная</span><select id="lb_universe"><option value="standard">Обычная</option><option value="omegaverse">Омегаверс</option></select></label><label class="lb-field"><span>Контрацепция (сюжет)</span><select id="lb_contraception"><option value="unspecified">Не указана</option><option value="none">Нет</option><option value="barrier">Барьерная</option><option value="hormonal">Гормональная</option><option value="fictional">Фэнтези / другая</option></select></label></div></div>
<div class="lb-card"><h3>🩷 Материнство</h3><label class="lb-field"><span>Состояние</span><select id="lb_status"><option value="none">Не указано</option><option value="pregnant">Беременна</option><option value="postpartum">После родов</option><option value="other">Другое</option></select></label><div class="lb-grid">${input('week','Неделя беременности',d.week,'number')}${input('due','Предполагаемая дата родов',d.due,'date')}</div><div class="lb-grid">${input('gestation','Срок беременности (недель)',d.gestation,'number')}${input('babies','Количество малышей',d.babies,'number')}</div>${input('partner','Отец / партнёр',d.partner)}<details class="lb-advanced"><summary>Дополнительные сведения (необязательно)</summary><label class="lb-field"><span>Сюжетные особенности, симптомы или пожелания</span><textarea id="lb_notes" rows="2">${esc(d.notes)}</textarea></label></details><button class="lb-btn lb-primary" id="lb_save">💾 Сохранить изменения</button></div>
<div class="lb-card"><h3>🧸 Мои дети <span class="lb-count">${d.children.length}</span></h3><div id="lb_children">${d.children.length?d.children.map((c,i)=>`<div class="lb-child"><span>✦ <b>${esc(c.name||'Без имени')}</b><small>${esc([c.sex,c.birthday,c.father].filter(Boolean).join(' · '))}</small></span><button data-del="${i}" title="Удалить">✕</button></div>`).join(''):'<div class="lb-muted">Пока нет записей. Добавь ребёнка вручную.</div>'}</div><div class="lb-grid">${input('childName','Имя ребёнка')}${input('childSex','Пол')}</div><div class="lb-grid">${input('childBirth','Дата рождения','', 'date')}${input('childFather','Отец')}</div><button class="lb-btn" id="lb_add">＋ Добавить ребёнка</button></div>
<div class="lb-card"><h3>🔎 События из ролевой</h3><label class="lb-switch"><input id="lb_auto" type="checkbox" ${d.auto?'checked':''}> Анализировать новые сообщения без запросов к модели</label><div class="lb-muted">Распознавание осторожное: найденное событие остаётся предложением и никогда не меняет семейную историю без подтверждения.</div><button class="lb-btn" id="lb_scan">↻ Просмотреть доступную историю</button><div class="lb-muted">${d.lastScanned} сообщений просмотрено · ${d.candidates.length} предложений</div><div id="lb_candidates">${d.candidates.slice(-15).reverse().map(c=>`<div class="lb-event"><div class="lb-overline">${c.type==='pregnancy'?'ВОЗМОЖНАЯ БЕРЕМЕННОСТЬ':c.type==='birth'?'ВОЗМОЖНЫЕ РОДЫ':'СЕМЕЙНОЕ СОБЫТИЕ'} · сообщение ${c.index+1}</div><div>${esc(c.excerpt)}</div><button class="lb-btn" data-dismiss="${esc(c.id)}">Проверено · убрать</button></div>`).join('')}</div></div>`;
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
 settings.append(settingsHeader,themeRow);const liveToggle=document.createElement('label');liveToggle.className='lb-switch';liveToggle.innerHTML=`<input type="checkbox" id="lb_liveAuto" ${d.liveAuto!==false?'checked':''}> 🌸 Живые реакции из ответов модели (локально, без токенов)`;settings.append(liveToggle);liveToggle.querySelector('input').onchange=e=>{const x=load();x.liveAuto=e.target.checked;save(x);};
 const avatarPosition=root.querySelector('.lb-position');if(avatarPosition)settings.append(avatarPosition);
 const upload=root.querySelector('.lb-upload');if(upload)settings.append(upload);
 const clear=root.querySelector('#lb_avatarClear');if(clear)settings.append(clear);
 [...root.querySelectorAll('.lb-card')].forEach(card=>settings.append(card));
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
 registry.querySelectorAll('[data-person-edit]').forEach(el=>el.onclick=()=>{const x=load(),p=(x.people||[]).find(p=>p.id===el.dataset.personEdit);if(!p)return;const mood=prompt('Настроение (можно с эмодзи)',p.mood||'');if(mood===null)return;const thought=prompt('Короткая мысль о Ханаби / её семье',p.thought||'');if(thought===null)return;p.mood=mood.slice(0,100);p.thought=thought.slice(0,220);save(x);render();});
 const phase=document.createElement('div');phase.className='lb-live-phase';phase.textContent=fertility(d);
 statsEl?.after(phase);
 // No redundant help text in the display-only dashboard.
 if(!d.cycleDay && !(d.rpDate && d.cycleStart))phase.hidden=true;
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
 root.querySelector('#lb_save').onclick=()=>{const x=load();for(const f of ['rpLabel','rpDate','cycleDay','cycleLength','cycleStart','week','due','gestation','babies','partner','notes'])x[f]=root.querySelector('#lb_'+f).value;x.status=root.querySelector('#lb_status').value;x.universe=root.querySelector('#lb_universe').value;x.contraception=root.querySelector('#lb_contraception').value;save(x);render();};
 root.querySelector('#lb_add').onclick=()=>{const x=load(),name=root.querySelector('#lb_childName').value.trim();if(!name)return alert('Укажи имя ребёнка');x.children.push({name,sex:root.querySelector('#lb_childSex').value,birthday:root.querySelector('#lb_childBirth').value,father:root.querySelector('#lb_childFather').value});save(x);render();};
 root.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{if(!confirm('Удалить запись о ребёнке?'))return;const x=load();x.children.splice(Number(b.dataset.del),1);save(x);render();});
 root.querySelectorAll('[data-dismiss]').forEach(b=>b.onclick=()=>{const x=load();x.candidates=x.candidates.filter(c=>c.id!==b.dataset.dismiss);x.dismissed=[...(x.dismissed||[]),b.dataset.dismiss].slice(-500);save(x);render();});
 root.querySelector('#lb_auto').onchange=e=>{const x=load();x.auto=e.target.checked;save(x);};
 root.querySelector('#lb_scan').onclick=()=>{const x=load();const n=scan(x,true);render();alert(`Найдено новых предложений: ${n}. Проверь их внизу вкладки.`);};
}
export function setupLifeBloom(environment){env=environment;}
export function lifeBloomTab(){const p=document.createElement('section');p.id='ups_tab_lifebloom';p.className='ups_tabpage';return p;}
export function refreshLifeBloom(){if(env)render();}
export function onLifeBloomMessage(){if(!env)return;const d=load();if(d.auto)scan(d,false);updateLive(load());if(document.getElementById('ups_tab_lifebloom')?.classList.contains('ups_active'))render();}
