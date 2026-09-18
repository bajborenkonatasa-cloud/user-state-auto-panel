import { getContext } from '../../../extensions.js';
import { eventSource, event_types, setExtensionPrompt, extension_prompt_types, extension_prompt_roles } from '../../../../script.js';

console.log('[User Persona Studio v4.0.1] module loaded');

const VERSION = '4.0.1';
const PREFIX = 'user_persona_studio_v4_';
const CARDS_KEY = PREFIX + 'cards';
const GLOBAL_KEY = PREFIX + 'global';
const PROMPT_ID = 'user_persona_studio_v4_prompt';
const PANEL_ID = 'ups4_panel';
const TOP_BUTTON_ID = 'ups4-top-button';
const DB_KEY = PREFIX + 'images';
const MAX_IMAGES_PER_REQUEST = 3;

let runtimeOneShotImage = null;
let activeTab = 'state';
let initialized = false;

const DIRECTOR_PRESETS = {
    romance: { icon:'💖', title:'Романтика', prompt:'Keep the scene romantic and emotionally responsive. Let {{char}} show initiative and chemistry naturally. Do not control {{user}}.' },
    tension: { icon:'❤️', title:'Напряжение', prompt:'Increase emotional or romantic tension through subtext, proximity, hesitation and meaningful reactions. Let {{char}} take initiative without controlling {{user}}.' },
    drama: { icon:'🌫️', title:'Драма', prompt:'Deepen the emotional stakes and consequences. Keep reactions believable and move the scene forward without deciding {{user}} actions.' },
    cozy: { icon:'🐾', title:'Уют', prompt:'Make the scene warm, intimate and lived-in. Use small sensory details and natural affection. Keep {{char}} active but do not control {{user}}.' },
    mystery: { icon:'🕯️', title:'Тайна', prompt:'Introduce or deepen a plausible mystery. Reveal clues gradually, preserve uncertainty and let {{char}} investigate actively.' },
    horror: { icon:'👻', title:'Хоррор', prompt:'Build suspense and unease through atmosphere, uncertainty and concrete sensory details. Escalate carefully and preserve character agency.' },
    conflict: { icon:'⚔️', title:'Конфликт', prompt:'Add a meaningful conflict, disagreement or obstacle that fits the established story. Let {{char}} respond decisively without speaking for {{user}}.' },
    absurd: { icon:'🎭', title:'Абсурд', prompt:'Add one surprising, funny or absurd complication that still fits the world and characters. Keep it useful for moving the scene forward.' },
    tragedy: { icon:'💀', title:'Трагедия', prompt:'Introduce a serious setback or painful consequence that fits the story. Avoid random cruelty; make it emotionally meaningful.' },
    blessing: { icon:'🎁', title:'Удача', prompt:'Introduce a believable positive turn, opportunity or small stroke of luck that opens a new direction for the scene.' },
    momentum: { icon:'⚡', title:'Двинуть сюжет', prompt:'Do not wait passively for {{user}}. In this response, let {{char}} make a concrete decision or introduce one logical new event that moves the story forward. Do not control {{user}}.' },
    slowburn: { icon:'🧩', title:'Slow burn', prompt:'Slow the pace slightly and focus on gradual emotional development, subtext and small meaningful actions. Do not resolve the tension too quickly.' },
};

const CARD_CATEGORIES = {
    location: ['📍','Локация'], home:['🏠','Дом / комната'], outfit:['👗','Образ / одежда'],
    appearance:['🪞','Внешность'], vehicle:['🚗','Транспорт'], item:['🎁','Предмет'],
    work:['💼','Работа / статус'], pet:['🐾','Питомец'], world:['🌍','Факт мира'], custom:['✨','Другое']
};

const SMART_CARD_PROMPTS = {
    location: 'Treat this place as the current visible environment. Use concrete visible details naturally in the scene and let {{char}} react to them when relevant.',
    home: 'This is {{user}}\'s home or personal room. Treat the shown details as established and let {{char}} notice or react naturally without listing everything mechanically.',
    outfit: 'This is {{user}}\'s current outfit/reference. Keep it visually consistent and let {{char}} react naturally if the scene makes that relevant.',
    appearance: 'Use this as a visual reference for {{user}} in the current scene. Keep visible details consistent; do not overwrite established persona facts.',
    vehicle: 'Treat this vehicle/transport as an established possession or current transport when relevant. Use its visible details naturally.',
    item: 'This object is present in the scene. Treat its description and visible details as established and let {{char}} react to it naturally.',
    work: 'Treat this as established information about {{user}}\'s work/status when relevant to the scene.',
    pet: 'Treat this animal/pet and the described relationship as established when relevant.',
    world: 'Treat this user-world fact as established canon for this chat/AU when it becomes relevant.',
    custom: 'Treat this reference as established context for {{user}} and use it naturally when relevant.'
};

function make(tag, attrs = {}, text = '') {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'class') el.className = value;
        else if (key === 'type') el.type = value;
        else if (key === 'checked') el.checked = !!value;
        else if (key === 'value') el.value = value;
        else if (key === 'style') el.setAttribute('style', value);
        else el.setAttribute(key, value);
    }
    if (text) el.textContent = text;
    return el;
}

function ctx() { try { return getContext?.() || globalThis.SillyTavern?.getContext?.() || {}; } catch { return {}; } }
function names() { const c = ctx(); return { userName:c.name1 || window.name1 || '{{user}}', charName:c.name2 || window.name2 || '{{char}}' }; }
function ids() {
    const c = ctx();
    return {
        charId: String(c.characterId ?? window.this_chid ?? c.name2 ?? 'unknown_char'),
        chatId: String(c.chatId ?? window.chat_metadata?.main_chat ?? location.search ?? 'unknown_chat')
    };
}
function chatKey() { const x=ids(); return PREFIX + 'chat_' + x.charId + '_' + x.chatId; }
function oldChatKey() { const c=ctx(); return 'user_state_drawer_v33_' + String(c.characterId ?? window.this_chid ?? 'unknown_char') + '_' + String(c.chatId ?? window.chat_metadata?.main_chat ?? window.name2 ?? location.search ?? 'unknown_chat'); }

function defaults() {
    return {
        feelings:'', thoughts:'', secrets:'', goals:'', desires:'', motives:'', avoid:'',
        relationship:'', trust:'50', tension:'50', affection:'50', desire:'50', jealousy:'0', resentment:'0',
        npcs:[], location:'', appearanceNow:'', sceneGoal:'', modelNotes:'', privateNotes:'',
        directorPreset:'', directorCustom:'', directorMode:'once', oocOnce:'', oneShotCaption:'',
        autoInject:true, includeState:true, includeRelation:true, includeScene:true, includeModelNotes:false,
        showPreview:false
    };
}

function migrateOld() {
    try {
        if (localStorage.getItem(chatKey())) return;
        const raw = localStorage.getItem(oldChatKey()); if (!raw) return;
        const old = JSON.parse(raw); const d = defaults();
        Object.assign(d, {
            feelings:old.feelings||'', thoughts:old.thoughts||'', secrets:old.secrets||'', goals:old.goals||'', desires:old.desires||'',
            relationship:old.relationship||'', trust:old.trust||'50', tension:old.tension||'50', affection:old.affection||'50', desire:old.desire||'50',
            modelNotes:old.notes||'', includeModelNotes:!!String(old.notes||'').trim(), autoInject:old.autoInject !== false, showPreview:!!old.showPreview
        });
        localStorage.setItem(chatKey(), JSON.stringify(d));
        console.log('[User Persona Studio] migrated v3.3 state');
    } catch (e) { console.warn('[User Persona Studio] migration failed', e); }
}

function loadState() { migrateOld(); try { return { ...defaults(), ...JSON.parse(localStorage.getItem(chatKey()) || '{}') }; } catch { return defaults(); } }
function saveState(data) { localStorage.setItem(chatKey(), JSON.stringify(data)); }
function loadCards() { try { const v=JSON.parse(localStorage.getItem(CARDS_KEY)||'[]'); return Array.isArray(v)?v:[]; } catch { return []; } }
function saveCards(cards) { localStorage.setItem(CARDS_KEY, JSON.stringify(cards)); }
function uuid() { return (crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`); }

function currentScopedCards() {
    const {charId,chatId}=ids();
    return loadCards().filter(c => c.scope==='global' || (c.scope==='character' && c.scopeId===charId) || (c.scope==='chat' && c.scopeId===chatId));
}

async function imageStoreSet(key, value) {
    const lf = globalThis.SillyTavern?.libs?.localforage;
    if (lf) return lf.setItem(DB_KEY + ':' + key, value);
    try { localStorage.setItem(DB_KEY + ':' + key, value); } catch { throw new Error('Не удалось сохранить изображение. Оно слишком большое для локального хранилища.'); }
}
async function imageStoreGet(key) {
    if (!key) return null;
    const lf = globalThis.SillyTavern?.libs?.localforage;
    if (lf) return await lf.getItem(DB_KEY + ':' + key);
    return localStorage.getItem(DB_KEY + ':' + key);
}
async function imageStoreRemove(key) {
    if (!key) return;
    const lf = globalThis.SillyTavern?.libs?.localforage;
    if (lf) return lf.removeItem(DB_KEY + ':' + key);
    localStorage.removeItem(DB_KEY + ':' + key);
}

function getData() {
    const val=(id,def='')=>document.getElementById(id)?.value ?? def;
    const chk=id=>!!document.getElementById(id)?.checked;
    const existing=loadState();
    return {
        ...existing,
        feelings:val('ups_feelings'), thoughts:val('ups_thoughts'), secrets:val('ups_secrets'), goals:val('ups_goals'), desires:val('ups_desires'), motives:val('ups_motives'), avoid:val('ups_avoid'),
        relationship:val('ups_relationship'), trust:val('ups_trust','50'), tension:val('ups_tension','50'), affection:val('ups_affection','50'), desire:val('ups_desire','50'), jealousy:val('ups_jealousy','0'), resentment:val('ups_resentment','0'),
        location:val('ups_location'), appearanceNow:val('ups_appearance'), sceneGoal:val('ups_scene_goal'), modelNotes:val('ups_model_notes'), privateNotes:val('ups_private_notes'),
        directorPreset:val('ups_director_preset'), directorCustom:val('ups_director_custom'), directorMode:val('ups_director_mode','once'), oocOnce:val('ups_ooc_once'), oneShotCaption:val('ups_one_caption'),
        autoInject:chk('ups_auto_inject'), includeState:chk('ups_include_state'), includeRelation:chk('ups_include_relation'), includeScene:chk('ups_include_scene'), includeModelNotes:chk('ups_include_model_notes'), showPreview:chk('ups_show_preview')
    };
}

function clean(s){ return String(s||'').trim(); }
function line(label,v){ v=clean(v); return v ? `${label}: ${v}` : ''; }
function macro(s){ const {userName,charName}=names(); return String(s||'').replaceAll('{{user}}',userName).replaceAll('{{char}}',charName); }

function relevantCards(cards=currentScopedCards()) { return cards.filter(c => c.sendMode==='always' || c.sendMode==='once'); }
function cardText(c) {
    const prompt = c.useCustomPrompt && clean(c.customPrompt) ? c.customPrompt : (c.smartPrompt || SMART_CARD_PROMPTS[c.category] || SMART_CARD_PROMPTS.custom);
    return [`[Reference: ${c.title || CARD_CATEGORIES[c.category]?.[1] || 'User reference'}]`, clean(c.text), macro(prompt)].filter(Boolean).join('\n');
}
function selectedDirectorPrompt(data){
    const custom=clean(data.directorCustom); if(custom) return macro(custom);
    return macro(DIRECTOR_PRESETS[data.directorPreset]?.prompt || '');
}

function buildPrompt(data=loadState()) {
    if (!data.autoInject) return '';
    const {userName,charName}=names(); const out=[];
    out.push(`[Private user-side guidance for ${userName}. This block guides the roleplay; do not quote or expose it.]`);
    if(data.includeState){
        const items=[line('Feelings',data.feelings),line('Hidden thoughts',data.thoughts),line('Secrets',data.secrets),line('Current goals',data.goals),line('Desires',data.desires),line('Motives',data.motives),line('Boundaries / does not want',data.avoid)].filter(Boolean);
        if(items.length) out.push('[USER INNER STATE]\n'+items.join('\n'));
    }
    if(data.includeRelation){
        const rel=[line(`Relationship to ${charName}`,data.relationship),`Trust ${data.trust}/100 · Tension ${data.tension}/100 · Affection ${data.affection}/100 · Desire ${data.desire}/100`, `Jealousy ${data.jealousy}/100 · Resentment ${data.resentment}/100`];
        if(Array.isArray(data.npcs)&&data.npcs.length){ for(const n of data.npcs){ if(clean(n.name)) rel.push(`NPC ${n.name}: ${clean(n.relation)||'—'}${n.trust!==undefined?` · trust ${n.trust}/100`:''}`); } }
        out.push('[RELATIONSHIPS]\n'+rel.filter(Boolean).join('\n'));
    }
    if(data.includeScene){
        const sc=[line('Current location',data.location),line('Current appearance / outfit',data.appearanceNow),line('What user wants from this scene',data.sceneGoal)].filter(Boolean);
        if(sc.length) out.push('[CURRENT SCENE FROM USER SIDE]\n'+sc.join('\n'));
    }
    const cards=relevantCards(); if(cards.length) out.push('[ACTIVE USER WORLD / VISUAL REFERENCES]\n'+cards.map(cardText).join('\n\n'));
    if(runtimeOneShotImage && clean(data.oneShotCaption)) out.push('[ONE-TIME VISUAL REFERENCE]\n'+data.oneShotCaption.trim()+'\nUse the attached image as a visual reference and let {{char}} react naturally when relevant.');
    const director=selectedDirectorPrompt(data); if(director) out.push('[DIRECTOR NOTE — do this in the next reply]\n'+director);
    if(data.includeModelNotes && clean(data.modelNotes)) out.push('[USER NOTES FOR MODEL]\n'+data.modelNotes.trim());
    if(clean(data.oocOnce)) out.push('[ONE-TIME OOC REQUEST]\n'+data.oocOnce.trim());
    out.push(`[Safety of agency: never write ${userName}'s choices, dialogue, thoughts or consent for them unless the user explicitly asks. Hidden thoughts/secrets are private knowledge; ${charName} may infer only from observable behavior unless revealed in-story.]`);
    return out.filter(Boolean).join('\n\n');
}

function updateInjection(data=loadState()) {
    try { setExtensionPrompt(PROMPT_ID, data.autoInject ? buildPrompt(data) : '', extension_prompt_types.IN_CHAT, 0, false, extension_prompt_roles.SYSTEM); }
    catch(e){ console.error('[User Persona Studio] injection error',e); }
}

function saveAndRefresh() { const d=getData(); saveState(d); updateInjection(d); updatePreview(d); renderStatus(); }
function el(id){return document.getElementById(id);}

function helperButton(targetId,text){
    const b=make('button',{type:'button',class:'ups_helper'},'✨ Подсказка');
    b.addEventListener('click',()=>{ const t=el(targetId); if(!t)return; t.value=macro(text); t.dispatchEvent(new Event('input',{bubbles:true})); }); return b;
}

function field(parent,id,label,placeholder='',helper=''){
    const w=make('div',{class:'ups_field'}); const head=make('div',{class:'ups_labelrow'}); head.appendChild(make('label',{for:id},label)); if(helper)head.appendChild(helperButton(id,helper)); w.appendChild(head);
    const a=make('textarea',{id,placeholder}); a.addEventListener('input',saveAndRefresh); w.appendChild(a); parent.appendChild(w); return a;
}
function slider(parent,id,label,valId,def='50'){
    const w=make('div',{class:'ups_field'}),h=make('div',{class:'ups_slider_label'}); h.append(make('span',{},label),make('span',{id:valId,class:'ups_slider_value'},def)); w.appendChild(h);
    const i=make('input',{id,type:'range',min:'0',max:'100',value:def}); i.addEventListener('input',saveAndRefresh); w.appendChild(i); parent.appendChild(w);
}
function checkbox(parent,id,label,sub=''){
    const w=make('div',{class:'ups_check'}); const i=make('input',{id,type:'checkbox'}); i.addEventListener('change',saveAndRefresh); const t=make('div'); const l=make('label',{for:id},label); t.appendChild(l); if(sub)t.appendChild(make('div',{class:'ups_sub'},sub)); w.append(i,t); parent.appendChild(w);
}
function pill(text,cls=''){ return make('span',{class:'ups_pill '+cls},text); }

function renderPanel(){
    if(el(PANEL_ID))return;
    const {userName}=names();
    const panel=make('div',{id:PANEL_ID});
    const hero=make('div',{class:'ups_hero'}); hero.innerHTML=`<div class="ups_brandline">USER PERSONA STUDIO · v${VERSION}</div><div class="ups_title">💜 ${userName}</div><div class="ups_tagline">Твоя сторона истории: чувства, мир, визуалы и режиссура.</div>`;
    const close=make('button',{class:'ups_close',type:'button'},'×'); close.addEventListener('click',()=>panel.classList.remove('ups_open')); hero.appendChild(close); panel.appendChild(hero);
    const tabs=make('div',{class:'ups_tabs'});
    const tabDefs=[['state','💜','Сейчас'],['relations','💕','Отношения'],['world','🏠','Мир'],['show','🖼','Показать'],['director','🎬','Режиссёр'],['notes','📝','Заметки'],['preview','👁','Модель']];
    for(const [key,ic,txt] of tabDefs){const b=make('button',{type:'button','data-tab':key},`${ic} ${txt}`); b.addEventListener('click',()=>showTab(key)); tabs.appendChild(b);} panel.appendChild(tabs);
    const body=make('div',{class:'ups_body'}); panel.appendChild(body);
    body.append(renderStateTab(),renderRelationsTab(),renderWorldTab(),renderShowTab(),renderDirectorTab(),renderNotesTab(),renderPreviewTab());
    document.body.appendChild(panel); showTab(activeTab); setValues(loadState()); renderCards(); renderShowQueue(); renderPreview(loadState()); renderStatus();
}
function tabSection(id,title,desc=''){const d=make('section',{id:'ups_tab_'+id,class:'ups_tabpage'}); d.appendChild(make('div',{class:'ups_section_kicker'},title)); if(desc)d.appendChild(make('div',{class:'ups_intro'},desc)); return d;}
function cardBox(title,sub=''){const c=make('div',{class:'ups_card'}); const h=make('div',{class:'ups_card_head'}); h.appendChild(make('div',{class:'ups_card_title'},title)); if(sub)h.appendChild(make('div',{class:'ups_card_sub'},sub)); c.appendChild(h); return c;}

function renderStateTab(){
    const p=tabSection('state','✨ СОСТОЯНИЕ {{user}}','То, что происходит внутри твоей персоны прямо сейчас. Заполняй только нужное.');
    const a=cardBox('🧠 Внутреннее состояние'); field(a,'ups_feelings','Чувства','Тревога, нежность, ревность...','Смешанные чувства: опиши 2–4 эмоции и, если важно, что их вызвало.'); field(a,'ups_thoughts','Скрытые мысли','То, что {{user}} думает, но не говорит...','{{user}} думает об этом, но пока не произносит вслух. Не раскрывай мысль {{char}} напрямую.'); field(a,'ups_secrets','Секреты','Что скрывает {{user}}...','Это секрет {{user}}. {{char}} не знает его, пока сюжет естественно не раскроет информацию.'); p.appendChild(a);
    const b=cardBox('🎯 Намерения'); field(b,'ups_goals','Цель сейчас','Что хочет сделать {{user}}...','Текущая цель {{user}}: добиться конкретного результата в этой сцене, не передавая управление моделью.'); field(b,'ups_desires','Желания','Эмоциональные / сюжетные / романтические...','Желание {{user}} — это внутренний ориентир, а не разрешение модели действовать за неё.'); field(b,'ups_motives','Мотивы','Почему она этого хочет...','Учитывай мотив {{user}} при интерпретации её поступков, но не озвучивай его автоматически.'); field(b,'ups_avoid','Чего НЕ хочет','Границы, нежелательное развитие...','Не веди сцену в этом направлении без явной инициативы {{user}}. Сохрани её агентность.'); p.appendChild(b);
    const c=cardBox('🎭 Текущая сцена'); field(c,'ups_location','Где мы сейчас','Парк, море, спальня, магическая башня...','Это текущая локация сцены. Используй её детали естественно и сохраняй пространственную последовательность.'); field(c,'ups_appearance','Как {{user}} выглядит сейчас','Одежда, волосы, состояние...','Сохраняй этот текущий образ {{user}} в сцене, пока он не изменится.'); field(c,'ups_scene_goal','Что я хочу от сцены','Например: хочу, чтобы он сам проявил инициативу...','Учитывай это как режиссёрское пожелание, но не заставляй {{user}} совершать действия или произносить реплики.'); p.appendChild(c); return p;
}

function renderRelationsTab(){
    const {charName,userName}=names(); const p=tabSection('relations','💕 ОТНОШЕНИЯ','Основная карточка автоматически относится к текущему {{char}}. NPC можно добавить отдельно.');
    const a=cardBox(`💞 ${userName} → ${charName}`); field(a,'ups_relationship','Отношение',`Как ${userName} относится к ${charName}...`,`Опиши отношение ${userName} к ${charName} в 1–3 предложениях: близость, сомнения, ожидания и текущая динамика.`); slider(a,'ups_trust','Доверие','ups_trust_val'); slider(a,'ups_tension','Напряжение','ups_tension_val'); slider(a,'ups_affection','Привязанность','ups_affection_val'); slider(a,'ups_desire','Желание','ups_desire_val'); slider(a,'ups_jealousy','Ревность','ups_jealousy_val','0'); slider(a,'ups_resentment','Обида','ups_resentment_val','0'); p.appendChild(a);
    const np=cardBox('👥 NPC','Дополнительные отношения для этой ветки.'); const list=make('div',{id:'ups_npc_list'}); np.appendChild(list); const add=make('button',{type:'button',class:'ups_action'},'＋ Добавить NPC'); add.addEventListener('click',addNpc); np.appendChild(add); p.appendChild(np); return p;
}

function renderWorldTab(){
    const p=tabSection('world','🏠 МИР {{user}}','Карточки вещей, мест и фактов. Они хранятся у тебя и идут модели только в режиме «всегда» или «один раз».');
    const create=cardBox('✨ Новая карточка');
    const row=make('div',{class:'ups_grid2'}); const t=make('input',{id:'ups_card_title',placeholder:'Название: Моя квартира...'}); const cat=make('select',{id:'ups_card_category'}); for(const [k,[ic,n]] of Object.entries(CARD_CATEGORIES))cat.appendChild(make('option',{value:k},`${ic} ${n}`)); row.append(t,cat); create.appendChild(row);
    const scope=make('select',{id:'ups_card_scope'}); scope.innerHTML='<option value="chat">🎭 Только этот чат / AU</option><option value="character">💕 Для текущего персонажа</option><option value="global">🌍 Глобально для {{user}}</option>'; create.appendChild(scope);
    field(create,'ups_card_text','Описание','Коротко: что это, как выглядит, что важно знать...');
    const cp=make('textarea',{id:'ups_card_prompt',placeholder:'Мини-промпт для модели (можно оставить авто)...'}); create.appendChild(cp); const hb=make('button',{type:'button',class:'ups_helper'},'✨ Вставить умный мини-промпт'); hb.addEventListener('click',fillCardPrompt); create.appendChild(hb);
    const add=make('button',{type:'button',class:'ups_action ups_primary'},'＋ Сохранить карточку'); add.addEventListener('click',createWorldCard); create.appendChild(add); p.appendChild(create);
    const cards=cardBox('🗂 Мои карточки'); cards.appendChild(make('div',{id:'ups_cards_list'})); p.appendChild(cards); return p;
}

function renderShowTab(){
    const p=tabSection('show','🖼 ПОКАЗАТЬ ПЕРСОНАЖУ','Разовый визуальный референс: прикрепится к следующему обычному запросу. Дополнительного API-запроса нет.');
    const c=cardBox('📸 Визуальная подсказка'); const file=make('input',{id:'ups_one_image',type:'file',accept:'image/*'}); file.addEventListener('change',handleOneShotImage); c.appendChild(file);
    const preview=make('div',{id:'ups_one_image_preview',class:'ups_image_preview'}); c.appendChild(preview);
    field(c,'ups_one_caption','Подпись для модели','Например: это моя комната; {{char}} впервые её видит...','Это визуальный референс текущей сцены. Используй видимые детали изображения естественно и дай {{char}} правдоподобно отреагировать; не перечисляй всё механически.');
    const row=make('div',{class:'ups_buttons'}); const clear=make('button',{type:'button',class:'ups_action'},'🧹 Убрать картинку'); clear.addEventListener('click',clearOneShotImage); const save=make('button',{type:'button',class:'ups_action'},'💾 Сохранить как карточку'); save.addEventListener('click',saveOneShotAsCard); row.append(clear,save); c.appendChild(row); p.appendChild(c);
    p.appendChild(make('div',{id:'ups_show_queue',class:'ups_queue'})); return p;
}

function renderDirectorTab(){
    const p=tabSection('director','🎬 РЕЖИССЁР','Никакого отдельного запроса: выбранная команда просто добавится к следующему ответу основной модели.');
    const c=cardBox('🎭 Жанр / настроение'); const grid=make('div',{class:'ups_preset_grid'}); for(const [k,v] of Object.entries(DIRECTOR_PRESETS)){const b=make('button',{type:'button','data-preset':k,class:'ups_preset'},`${v.icon} ${v.title}`); b.addEventListener('click',()=>selectDirectorPreset(k)); grid.appendChild(b);} c.appendChild(grid);
    const sel=make('input',{id:'ups_director_preset',type:'hidden'}); c.appendChild(sel);
    field(c,'ups_director_custom','Своя режиссёрская команда','Оставь пустым, чтобы использовать выбранный пресет...','Не жди пассивно инициативы от {{user}}. Пусть {{char}} сам примет одно логичное решение или внесёт одно новое событие, которое двинет сцену вперёд. Не управляй {{user}}.');
    const mode=make('select',{id:'ups_director_mode'}); mode.innerHTML='<option value="once">⚡ Только следующий ответ</option><option value="always">📌 Держать активным</option>'; mode.addEventListener('change',saveAndRefresh); c.appendChild(mode); p.appendChild(c);
    const o=cardBox('💬 Разовая OOC-команда'); field(o,'ups_ooc_once','Следующий ответ','Например: пиши короче; не смягчай характер; пусть он сам начнёт разговор...','Для следующего ответа: сохраняй характер {{char}}, пиши компактно, проявляй инициативу и двигай сцену вперёд. Не управляй {{user}}.'); p.appendChild(o); return p;
}

function renderNotesTab(){
    const p=tabSection('notes','📝 ЗАПИСНАЯ КНИЖКА','Личные заметки остаются только у тебя. Отдельное поле можно сознательно показать модели.');
    const a=cardBox('📒 Только для меня'); field(a,'ups_private_notes','Личные заметки','Идеи, планы, напоминания — модель этого НЕ увидит.'); p.appendChild(a);
    const b=cardBox('📨 Заметка модели'); checkbox(b,'ups_include_model_notes','Отправлять эту заметку модели','Если выключено — хранится только для тебя.'); field(b,'ups_model_notes','Текст','Техническая инструкция или постоянное пожелание...','Пиши ответы компактнее, сохраняй характер {{char}} и не повторяй уже известное без причины.'); p.appendChild(b); return p;
}

function renderPreviewTab(){
    const p=tabSection('preview','👁 ЧТО УВИДИТ МОДЕЛЬ','Здесь можно проверить точный текстовый блок и количество визуальных референсов. Это не вызывает модель.');
    const opts=cardBox('⚙️ Что включать'); checkbox(opts,'ups_auto_inject','Включить User Persona Studio','Если выключить — расширение ничего не подмешивает.'); checkbox(opts,'ups_include_state','Состояние / намерения'); checkbox(opts,'ups_include_relation','Отношения'); checkbox(opts,'ups_include_scene','Текущая сцена / локация / образ'); checkbox(opts,'ups_show_preview','Показывать технический текст ниже'); p.appendChild(opts);
    const stat=cardBox('✨ Активно сейчас'); stat.appendChild(make('div',{id:'ups_status'})); p.appendChild(stat);
    const pre=cardBox('🧾 Технический предпросмотр'); const code=make('pre',{id:'ups_preview'}); pre.appendChild(document.createTextNode('')); pre.style.display='block'; code.classList.add('ups_prompt_preview'); pre.innerHTML=''; const wrap=make('div',{id:'ups_preview_wrap'}); wrap.appendChild(code); p.appendChild(wrap);
    const back=cardBox('💾 Резервная копия'); const row=make('div',{class:'ups_buttons'}); const ex=make('button',{type:'button',class:'ups_action'},'⬇️ Экспорт JSON'); ex.addEventListener('click',exportBackup); const im=make('button',{type:'button',class:'ups_action'},'⬆️ Импорт JSON'); im.addEventListener('click',()=>el('ups_import_file').click()); const fi=make('input',{id:'ups_import_file',type:'file',accept:'application/json',style:'display:none'}); fi.addEventListener('change',importBackup); row.append(ex,im,fi); back.appendChild(row); p.appendChild(back); return p;
}

function showTab(key){activeTab=key; document.querySelectorAll('#'+PANEL_ID+' .ups_tabpage').forEach(x=>x.classList.toggle('ups_active',x.id==='ups_tab_'+key)); document.querySelectorAll('#'+PANEL_ID+' .ups_tabs button').forEach(x=>x.classList.toggle('ups_active',x.dataset.tab===key)); if(key==='world')renderCards(); if(key==='preview')renderPreview(loadState());}

function setValues(d){
    const idsMap={feelings:'ups_feelings',thoughts:'ups_thoughts',secrets:'ups_secrets',goals:'ups_goals',desires:'ups_desires',motives:'ups_motives',avoid:'ups_avoid',relationship:'ups_relationship',trust:'ups_trust',tension:'ups_tension',affection:'ups_affection',desire:'ups_desire',jealousy:'ups_jealousy',resentment:'ups_resentment',location:'ups_location',appearanceNow:'ups_appearance',sceneGoal:'ups_scene_goal',modelNotes:'ups_model_notes',privateNotes:'ups_private_notes',directorPreset:'ups_director_preset',directorCustom:'ups_director_custom',directorMode:'ups_director_mode',oocOnce:'ups_ooc_once',oneShotCaption:'ups_one_caption'};
    for(const [k,id] of Object.entries(idsMap)){const x=el(id);if(x)x.value=d[k]??'';}
    for(const k of ['autoInject','includeState','includeRelation','includeScene','includeModelNotes','showPreview']){const x=el('ups_'+k.replace(/[A-Z]/g,m=>'_'+m.toLowerCase())); if(x)x.checked=!!d[k];}
    for(const k of ['trust','tension','affection','desire','jealousy','resentment']){const s=el('ups_'+k+'_val');if(s)s.textContent=d[k]??'0';}
    renderNpcList(d); updatePresetButtons(d.directorPreset); renderPreview(d); renderStatus();
}

function updatePreview(d=getData()){const p=el('ups_preview');if(p)p.textContent=buildPrompt(d)||'Расширение выключено или активных данных нет.'; const w=el('ups_preview_wrap'); if(w)w.style.display=d.showPreview?'block':'none'; for(const k of ['trust','tension','affection','desire','jealousy','resentment']){const s=el('ups_'+k+'_val');if(s)s.textContent=d[k]??'0';}}
function renderStatus(){const d=loadState(), cards=relevantCards(); const one=runtimeOneShotImage?1:0; const c=el('ups_status'); if(c)c.innerHTML=`${pill(d.autoInject?'🟢 Включено':'⚫ Выключено').outerHTML} ${pill(`🗂 ${cards.length} карточек`).outerHTML} ${pill(`🖼 ${cards.filter(x=>x.imageKey).length+one} изображ.`).outerHTML} ${pill(d.directorPreset||clean(d.directorCustom)?'🎬 режиссёр активен':'🎬 без режиссуры').outerHTML}`;}

function addNpc(){const d=getData(); d.npcs=Array.isArray(d.npcs)?d.npcs:[]; d.npcs.push({id:uuid(),name:'',relation:'',trust:'50'}); saveState(d); renderNpcList(d); updateInjection(d);}
function renderNpcList(d=loadState()){const list=el('ups_npc_list');if(!list)return;list.innerHTML=''; for(const n of d.npcs||[]){const box=make('div',{class:'ups_npc'}); const name=make('input',{placeholder:'Имя NPC',value:n.name||''}); const rel=make('textarea',{placeholder:'Отношение / что важно...',value:n.relation||''}); rel.value=n.relation||''; const trust=make('input',{type:'range',min:'0',max:'100',value:n.trust||'50'}); const del=make('button',{type:'button',class:'ups_iconbtn'},'🗑'); const save=()=>{const st=loadState();const x=(st.npcs||[]).find(x=>x.id===n.id);if(x){x.name=name.value;x.relation=rel.value;x.trust=trust.value;saveState(st);updateInjection(st);renderStatus();}}; name.addEventListener('input',save);rel.addEventListener('input',save);trust.addEventListener('input',save);del.addEventListener('click',()=>{const st=loadState();st.npcs=(st.npcs||[]).filter(x=>x.id!==n.id);saveState(st);renderNpcList(st);updateInjection(st);}); box.append(name,rel,trust,del);list.appendChild(box);}}

function fillCardPrompt(){const cat=el('ups_card_category')?.value||'custom';el('ups_card_prompt').value=macro(SMART_CARD_PROMPTS[cat]||SMART_CARD_PROMPTS.custom);}
function scopeId(scope){const x=ids();return scope==='chat'?x.chatId:scope==='character'?x.charId:'global';}
function createWorldCard(){const title=clean(el('ups_card_title')?.value), text=clean(el('ups_card_text')?.value); if(!title&&!text){window.toastr?.warning?.('Добавь название или описание карточки');return;} const scope=el('ups_card_scope')?.value||'chat',category=el('ups_card_category')?.value||'custom',customPrompt=clean(el('ups_card_prompt')?.value); const cards=loadCards();cards.push({id:uuid(),title:title||CARD_CATEGORIES[category][1],text,category,scope,scopeId:scopeId(scope),sendMode:'off',imageKey:null,smartPrompt:SMART_CARD_PROMPTS[category]||SMART_CARD_PROMPTS.custom,customPrompt,useCustomPrompt:!!customPrompt,createdAt:Date.now()});saveCards(cards); el('ups_card_title').value='';el('ups_card_text').value='';el('ups_card_prompt').value='';renderCards();renderStatus();window.toastr?.success?.('Карточка сохранена');}
async function renderCards(){const list=el('ups_cards_list');if(!list)return;list.innerHTML='';const cards=currentScopedCards();if(!cards.length){list.appendChild(make('div',{class:'ups_empty'},'Пока пусто. Создай первую карточку мира {{user}}.'));return;} for(const c of cards){const box=make('div',{class:'ups_world_card'});const head=make('div',{class:'ups_world_head'});head.appendChild(make('div',{},`${CARD_CATEGORIES[c.category]?.[0]||'✨'} ${c.title}`));head.appendChild(pill(c.scope==='global'?'🌍 global':c.scope==='character'?'💕 char':'🎭 chat'));box.appendChild(head);if(c.text)box.appendChild(make('div',{class:'ups_world_text'},c.text));if(c.imageKey){const data=await imageStoreGet(c.imageKey);if(data){const im=make('img',{src:data,class:'ups_thumb'});box.appendChild(im);}} const actions=make('div',{class:'ups_buttons'}); const mode=make('select');mode.innerHTML='<option value="off">⏸ Не отправлять</option><option value="once">⚡ Один раз</option><option value="always">📌 Всегда</option>';mode.value=c.sendMode||'off';mode.addEventListener('change',()=>updateCard(c.id,{sendMode:mode.value})); const edit=make('button',{type:'button',class:'ups_action'},'✏️ Править');edit.addEventListener('click',()=>editCard(c)); const del=make('button',{type:'button',class:'ups_action ups_danger'},'🗑');del.addEventListener('click',()=>deleteCard(c)); actions.append(mode,edit,del);box.appendChild(actions);list.appendChild(box);}}
function updateCard(id,patch){const cards=loadCards(),c=cards.find(x=>x.id===id);if(!c)return;Object.assign(c,patch);saveCards(cards);updateInjection(loadState());renderStatus();renderShowQueue();}
function editCard(c){const title=prompt('Название карточки:',c.title);if(title===null)return;const text=prompt('Описание:',c.text||'');if(text===null)return;const p=prompt('Мини-промпт (пусто = авто):',c.useCustomPrompt?c.customPrompt:'');if(p===null)return;updateCard(c.id,{title:clean(title)||c.title,text:clean(text),customPrompt:clean(p),useCustomPrompt:!!clean(p)});renderCards();}
async function deleteCard(c){if(!confirm(`Удалить карточку «${c.title}»?`))return;const cards=loadCards().filter(x=>x.id!==c.id);saveCards(cards);if(c.imageKey)await imageStoreRemove(c.imageKey);renderCards();updateInjection(loadState());renderStatus();}

function fileToDataUrl(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});}
async function handleOneShotImage(e){const file=e.target.files?.[0];if(!file)return;try{const data=await fileToDataUrl(file);runtimeOneShotImage={data,name:file.name,type:file.type||'image/jpeg'};renderOneShotPreview();renderShowQueue();renderStatus();}catch(err){window.toastr?.error?.('Не удалось прочитать изображение');}}
function renderOneShotPreview(){const p=el('ups_one_image_preview');if(!p)return;p.innerHTML='';if(runtimeOneShotImage){const im=make('img',{src:runtimeOneShotImage.data});p.appendChild(im);p.appendChild(make('div',{},runtimeOneShotImage.name||'Изображение'));}}
function clearOneShotImage(){runtimeOneShotImage=null;const f=el('ups_one_image');if(f)f.value='';const c=el('ups_one_caption');if(c)c.value='';const d=loadState();d.oneShotCaption='';saveState(d);updateInjection(d);renderOneShotPreview();renderShowQueue();renderStatus();}
async function saveOneShotAsCard(){if(!runtimeOneShotImage){window.toastr?.warning?.('Сначала выбери изображение');return;}const caption=clean(el('ups_one_caption')?.value);const title=prompt('Название карточки:','Визуальный референс');if(title===null)return;const cat=prompt('Категория: location / home / outfit / appearance / vehicle / item / custom','custom')||'custom';const key=uuid();await imageStoreSet(key,runtimeOneShotImage.data);const cards=loadCards();cards.push({id:uuid(),title:clean(title)||'Визуальный референс',text:caption,category:CARD_CATEGORIES[cat]?cat:'custom',scope:'chat',scopeId:ids().chatId,sendMode:'off',imageKey:key,smartPrompt:SMART_CARD_PROMPTS[cat]||SMART_CARD_PROMPTS.custom,customPrompt:'',useCustomPrompt:false,createdAt:Date.now()});saveCards(cards);renderCards();window.toastr?.success?.('Изображение сохранено как карточка');}
function renderShowQueue(){const q=el('ups_show_queue');if(!q)return;const cards=relevantCards().filter(c=>c.imageKey);q.innerHTML=`<div class="ups_queue_title">📤 На следующий запрос</div><div>${runtimeOneShotImage?'🖼 Разовая картинка':''}${cards.length?`${runtimeOneShotImage?' · ':''}${cards.length} сохранённых визуалов`:''}${!runtimeOneShotImage&&!cards.length?'Пока ничего':''}</div><div class="ups_sub">Максимум ${MAX_IMAGES_PER_REQUEST} изображения за один запрос.</div>`;}

function selectDirectorPreset(k){const d=getData();d.directorPreset=d.directorPreset===k?'':k; if(el('ups_director_preset'))el('ups_director_preset').value=d.directorPreset;saveState(d);updatePresetButtons(d.directorPreset);updateInjection(d);renderStatus();updatePreview(d);}
function updatePresetButtons(k){document.querySelectorAll('#'+PANEL_ID+' .ups_preset').forEach(b=>b.classList.toggle('ups_selected',b.dataset.preset===k));}

async function attachImagesInterceptor(chat,_contextSize,_abort,type){
    if(type==='quiet'||!Array.isArray(chat)||!chat.length)return;
    const d=loadState(); if(!d.autoInject)return;
    let last=chat[chat.length-1]; if(!last?.is_user)return;
    const imgs=[];
    if(runtimeOneShotImage?.data)imgs.push({data:runtimeOneShotImage.data,title:clean(d.oneShotCaption)||runtimeOneShotImage.name||'User visual reference'});
    for(const c of relevantCards().filter(c=>c.imageKey)){const data=await imageStoreGet(c.imageKey);if(data)imgs.push({data,title:c.title});if(imgs.length>=MAX_IMAGES_PER_REQUEST)break;}
    if(!imgs.length)return;
    last=structuredClone(last); if(!last.extra)last.extra={}; chat[chat.length-1]=last;
    const stc=ctx(); const supports=typeof stc.ensureMessageMediaIsArray==='function';
    if(supports){ if(!Array.isArray(last.extra.media))last.extra.media=[]; for(const im of imgs.slice(0,MAX_IMAGES_PER_REQUEST)){last.extra.media.push({url:im.data,type:'image',title:im.title});} }
    else if(!last.extra.image){last.extra.image=imgs[0].data;}
}

globalThis.userPersonaStudioGenerationInterceptor = attachImagesInterceptor;

function clearOneShotAfterReply(){
    const d=loadState(); let changed=false;
    if(d.directorMode==='once' && (d.directorPreset||clean(d.directorCustom))){d.directorPreset='';d.directorCustom='';changed=true;}
    if(clean(d.oocOnce)){d.oocOnce='';changed=true;}
    const cards=loadCards();let cardChanged=false;for(const c of cards){if(c.sendMode==='once' && currentScopedCards().some(x=>x.id===c.id)){c.sendMode='off';cardChanged=true;}}
    if(cardChanged)saveCards(cards); if(runtimeOneShotImage)clearOneShotImage(); if(changed)saveState(d); setValues(d);updateInjection(d);renderCards();renderShowQueue();renderStatus();
}

async function exportBackup(){
    const cards=loadCards();const images={};for(const c of cards){if(c.imageKey&&!images[c.imageKey]){const d=await imageStoreGet(c.imageKey);if(d)images[c.imageKey]=d;}}
    const payload={app:'User Persona Studio',version:VERSION,exportedAt:new Date().toISOString(),chatState:loadState(),cards,images};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='user-persona-studio-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
async function importBackup(e){const f=e.target.files?.[0];if(!f)return;try{const x=JSON.parse(await f.text());if(!x||!Array.isArray(x.cards))throw new Error('bad');if(x.chatState)saveState({...defaults(),...x.chatState});saveCards(x.cards);for(const [k,v] of Object.entries(x.images||{}))await imageStoreSet(k,v);setValues(loadState());renderCards();updateInjection(loadState());window.toastr?.success?.('Резервная копия восстановлена');}catch{window.toastr?.error?.('Не удалось импортировать JSON');}finally{e.target.value='';}}

function findTopHolder(){
    return document.querySelector('#top-settings-holder')
        || document.querySelector('#top-bar')
        || document.querySelector('#extensionsMenuButton')?.parentElement
        || document.querySelector('#top-bar-holder')
        || document.body;
}
function renderTopButton(){
    try{
        document.querySelectorAll(`#${TOP_BUTTON_ID}`).forEach((node,i)=>{ if(i>0) node.remove(); });
        if(el(TOP_BUTTON_ID)) return true;
        const holder=findTopHolder();
        if(!holder) return false;
        const b=make('div',{id:TOP_BUTTON_ID,class:'drawer',title:'User Persona Studio','aria-label':'User Persona Studio'},'💜');
        b.addEventListener('click',togglePanel);
        holder.appendChild(b);
        return true;
    }catch(err){
        console.error('[User Persona Studio] top button error',err);
        return false;
    }
}
function togglePanel(){
    let p=el(PANEL_ID);
    if(!p){
        try{ renderPanel(); p=el(PANEL_ID); }
        catch(err){ console.error('[User Persona Studio] panel recovery error',err); window.toastr?.error?.('User Persona Studio не открылось. Посмотри ошибку в консоли.'); return; }
    }
    if(!p)return;
    if(p.classList.contains('ups_open')) p.classList.remove('ups_open');
    else{
        try{
            setValues(loadState()); renderOneShotPreview(); renderCards(); renderShowQueue(); renderPreview(loadState()); renderStatus();
            p.classList.add('ups_open');
        }catch(err){ console.error('[User Persona Studio] open panel error',err); }
    }
}
function refreshForChat(){setTimeout(()=>{if(el(PANEL_ID)){setValues(loadState());renderCards();renderShowQueue();}updateInjection(loadState());},250);}

function bindEventsOnce(){
    if(globalThis.__ups4_events_bound) return;
    globalThis.__ups4_events_bound=true;
    eventSource.on(event_types.CHAT_CHANGED,refreshForChat);
    eventSource.on(event_types.GENERATION_STARTED,()=>updateInjection(loadState()));
    eventSource.on(event_types.MESSAGE_RECEIVED,()=>setTimeout(clearOneShotAfterReply,50));
}
function init(){
    // Важно: кнопку рисуем первой. Даже если одна из новых вкладок упадёт,
    // пользователь всё равно увидит 💜 и повторный запуск сможет восстановиться.
    renderTopButton();
    try{
        renderPanel();
        updateInjection(loadState());
        bindEventsOnce();
        initialized=true;
        return true;
    }catch(err){
        initialized=false;
        console.error('[User Persona Studio v4.0.1] init error:',err);
        return false;
    }
}
function keepTopButtonAlive(){
    if(globalThis.__ups4_top_observer) return;
    const obs=new MutationObserver(()=>{ if(!el(TOP_BUTTON_ID)) renderTopButton(); });
    obs.observe(document.documentElement,{childList:true,subtree:true});
    globalThis.__ups4_top_observer=obs;
}

jQuery(document).ready(()=>{
    init();
    keepTopButtonAlive();
    [350,800,1600,3000,5000].forEach(ms=>setTimeout(()=>{ renderTopButton(); if(!initialized) init(); },ms));
});
