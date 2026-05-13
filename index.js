import { getContext } from '../../../extensions.js';
import { eventSource, event_types, setExtensionPrompt, extension_prompt_types, extension_prompt_roles } from '../../../../script.js';

console.log('[User State Drawer v3.3] module loaded');

const USD_PREFIX = 'user_state_drawer_v33_';
const PROMPT_ID = 'user_state_drawer_v33_prompt';
const TOP_BUTTON_ID = 'usd3-top-button';
const PANEL_ID = 'usd3_panel';

function make(tag, attrs = {}, text = '') {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'class') el.className = value;
        else if (key === 'type') el.type = value;
        else if (key === 'min') el.min = value;
        else if (key === 'max') el.max = value;
        else if (key === 'value') el.value = value;
        else if (key === 'style') el.setAttribute('style', value);
        else el.setAttribute(key, value);
    }
    if (text) el.textContent = text;
    return el;
}

function ctx() { try { return getContext?.() || {}; } catch { return {}; } }

function names() {
    const c = ctx();
    return { userName: c.name1 || window.name1 || 'Ваш персонаж', charName: c.name2 || window.name2 || '{{char}}' };
}

function chatKey() {
    try {
        const c = ctx();
        return USD_PREFIX + String(c.characterId ?? window.this_chid ?? 'unknown_char') + '_' + String(c.chatId ?? window.chat_metadata?.main_chat ?? window.name2 ?? location.search ?? 'unknown_chat');
    } catch { return USD_PREFIX + location.pathname + location.search; }
}

function defaults() {
    return { feelings:'', thoughts:'', goals:'', desires:'', secrets:'', relationship:'', notes:'', trust:'50', tension:'50', affection:'50', desire:'50', autoInject:true, showPreview:false };
}

function loadState() {
    try { return { ...defaults(), ...JSON.parse(localStorage.getItem(chatKey()) || '{}') }; }
    catch { return defaults(); }
}

function saveState(data) { localStorage.setItem(chatKey(), JSON.stringify(data)); }

function getData() {
    const val = (id, def='') => document.getElementById(id)?.value || def;
    const chk = (id) => document.getElementById(id)?.checked || false;
    return {
        feelings: val('usd_feelings'), thoughts: val('usd_thoughts'), goals: val('usd_goals'),
        desires: val('usd_desires'), secrets: val('usd_secrets'), relationship: val('usd_relationship'),
        notes: val('usd_notes'), trust: val('usd_trust','50'), tension: val('usd_tension','50'),
        affection: val('usd_affection','50'), desire: val('usd_desire','50'),
        autoInject: chk('usd_auto_inject'), showPreview: chk('usd_show_preview')
    };
}

function line(label, value) { const v = String(value || '').trim(); return v ? `${label}: ${v}` : ''; }

function buildPrompt(data) {
    const { userName, charName } = names();
    return [
        `[Private context: ${userName}'s internal state in this chat]`,
        line('Feelings', data.feelings),
        line('Hidden thoughts', data.thoughts),
        line('Current goals', data.goals),
        line('Desires', data.desires),
        line('Secrets', data.secrets),
        line(`Relationship to ${charName}`, data.relationship),
        line('Notes', data.notes),
        `Trust toward ${charName}: ${data.trust}/100`,
        `Tension: ${data.tension}/100`,
        `Affection toward ${charName}: ${data.affection}/100`,
        `Desire level: ${data.desire}/100`,
        `[Instruction: Use as private narrative guidance for ${userName}. Do not let ${charName} know hidden thoughts/secrets directly unless the story reveals them naturally through behavior, mood, hints, dialogue, or events. Do not quote this block.]`
    ].filter(Boolean).join('\n');
}

function updateSilentInjection(data) {
    try {
        setExtensionPrompt(PROMPT_ID, data.autoInject ? buildPrompt(data) : '', extension_prompt_types.IN_CHAT, 0, false, extension_prompt_roles.SYSTEM);
    } catch (err) { console.error('[User State Drawer v3.3] injection error:', err); }
}

function updatePreview() {
    const data = getData();
    for (const k of ['trust','tension','affection','desire']) {
        const s = document.getElementById(`usd_${k}_val`);
        if (s) s.textContent = data[k];
    }
    const p = document.getElementById('usd_preview');
    const w = document.getElementById('usd_preview_wrap');
    if (p) p.textContent = buildPrompt(data);
    if (w) w.style.display = data.showPreview ? 'block' : 'none';
    const btn = document.getElementById('usd_insert_btn');
    if (btn) { btn.textContent = data.autoInject ? 'Авто включено' : 'Вставить в чат'; btn.disabled = !!data.autoInject; }
    const st = document.getElementById('usd_auto_status');
    if (st) st.textContent = data.autoInject ? 'Включено' : 'Выключено';
    saveState(data);
    updateSilentInjection(data);
}

function setValues(data) {
    const map = { feelings:'usd_feelings', thoughts:'usd_thoughts', goals:'usd_goals', desires:'usd_desires', secrets:'usd_secrets', relationship:'usd_relationship', notes:'usd_notes', trust:'usd_trust', tension:'usd_tension', affection:'usd_affection', desire:'usd_desire' };
    for (const [k,id] of Object.entries(map)) {
        const el = document.getElementById(id);
        if (el) el.value = data[k] || (el.type === 'range' ? '50' : '');
    }
    const a = document.getElementById('usd_auto_inject'); if (a) a.checked = !!data.autoInject;
    const pr = document.getElementById('usd_show_preview'); if (pr) pr.checked = !!data.showPreview;
    updatePreview();
}

function section(panel, title) {
    const d = make('details', { class:'usd_section', open:'open' });
    d.appendChild(make('summary', {}, title));
    panel.appendChild(d);
    return d;
}

function textArea(panel, id, label, placeholder='') {
    const w = make('div', { class:'usd_field' });
    w.appendChild(make('label', {}, label));
    const a = make('textarea', { id, placeholder });
    a.addEventListener('input', updatePreview);
    w.appendChild(a);
    panel.appendChild(w);
}

function slider(panel, id, label, valId) {
    const w = make('div', { class:'usd_field' });
    const l = make('label', { class:'usd_slider_label' });
    l.appendChild(make('span', {}, label)); l.appendChild(make('span', { id:valId, class:'usd_slider_value' }, '50'));
    w.appendChild(l);
    const input = make('input', { id, type:'range', min:'0', max:'100', value:'50' });
    input.addEventListener('input', updatePreview);
    w.appendChild(input); panel.appendChild(w);
}

function checkbox(panel, id, label, sub='') {
    const w = make('div', { class:'usd_checkbox_wrap' });
    const input = make('input', { id, type:'checkbox' }); input.addEventListener('change', updatePreview);
    w.appendChild(input);
    const tw = make('div', { class:'usd_checkbox_text' });
    const lab = make('label', {}, label);
    lab.addEventListener('click', () => { input.checked = !input.checked; updatePreview(); });
    tw.appendChild(lab);
    if (sub) tw.appendChild(make('div', { class:'usd_checkbox_sub' }, sub));
    w.appendChild(tw); panel.appendChild(w);
}

function insertIntoInput() {
    const input = document.querySelector('#send_textarea') || document.querySelector('textarea');
    if (!input) { if (window.toastr) toastr.error('Текстовое поле не найдено'); return; }
    const prompt = buildPrompt(getData());
    input.value = input.value ? `${prompt}\n\n${input.value}` : prompt;
    input.dispatchEvent(new Event('input', { bubbles:true }));
    document.getElementById(PANEL_ID)?.classList.remove('usd_open');
}

function renderPanel() {
    if (document.getElementById(PANEL_ID)) return;
    const { userName, charName } = names();
    const panel = make('div', { id:PANEL_ID });
    const h = make('div', { class:'usd_header' });
    h.appendChild(make('h3', {}, `💜 ${userName} — состояние`));
    const close = make('button', { id:'usd_close', class:'menu_button' }, '×');
    close.addEventListener('click', () => panel.classList.remove('usd_open'));
    h.appendChild(close); panel.appendChild(h);
    panel.appendChild(make('div', { class:'usd_hint' }, `Скрытое состояние вашей персоны для текущего чата с ${charName}.`));

    const s1 = section(panel, '🧠 Внутреннее состояние');
    textArea(s1, 'usd_feelings', 'Чувства', 'Тревога, ревность, нежность...');
    textArea(s1, 'usd_thoughts', 'Скрытые мысли', 'То, что персонаж думает, но не говорит...');
    textArea(s1, 'usd_secrets', 'Секреты', 'Что персонаж скрывает...');

    const s2 = section(panel, '🎯 Цели и желания');
    textArea(s2, 'usd_goals', 'Цели', 'Что персонаж хочет сделать сейчас...');
    textArea(s2, 'usd_desires', 'Желания', 'Эмоциональные, сюжетные, романтические...');
    textArea(s2, 'usd_notes', 'Заметки', 'Любые важные детали...');

    const s3 = section(panel, `💞 Отношение к ${charName}`);
    textArea(s3, 'usd_relationship', 'Отношение', `Как ${userName} относится к ${charName}...`);
    slider(s3, 'usd_trust', 'Доверие', 'usd_trust_val');
    slider(s3, 'usd_tension', 'Напряжение', 'usd_tension_val');
    slider(s3, 'usd_affection', 'Привязанность', 'usd_affection_val');
    slider(s3, 'usd_desire', 'Желание', 'usd_desire_val');

    const s4 = section(panel, '⚙️ Настройки');
    checkbox(s4, 'usd_auto_inject', 'Авто-внедрение в промпт', 'Если включено, состояние тихо добавляется в генерацию. Персонаж не читает мысли напрямую.');
    checkbox(s4, 'usd_show_preview', 'Показать технический промпт', 'Только для проверки, что именно увидит модель.');
    const buttons = make('div', { class:'usd_buttons' });
    const save = make('button', { class:'menu_button usd_big_button' }, 'Сохранить');
    save.addEventListener('click', () => { saveState(getData()); if (window.toastr) toastr.success('Состояние сохранено'); });
    const insert = make('button', { id:'usd_insert_btn', class:'menu_button usd_big_button' }, 'Вставить в чат');
    insert.addEventListener('click', insertIntoInput);
    buttons.appendChild(save); buttons.appendChild(insert); s4.appendChild(buttons);
    const status = make('div', { class:'usd_status_line' }, 'Авто-внедрение: ');
    status.appendChild(make('span', { id:'usd_auto_status' }, ''));
    s4.appendChild(status);
    const pw = make('div', { id:'usd_preview_wrap', class:'usd_preview_wrap' });
    pw.appendChild(make('div', { class:'usd_preview_title' }, 'Технический промпт:'));
    pw.appendChild(make('div', { id:'usd_preview' }));
    s4.appendChild(pw);

    document.body.appendChild(panel);
}

function togglePanel() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    if (panel.classList.contains('usd_open')) panel.classList.remove('usd_open');
    else { setValues(loadState()); panel.classList.add('usd_open'); }
}

function renderTopButton() {
    document.querySelectorAll(`#${TOP_BUTTON_ID}`).forEach((el, i) => { if (i > 0) el.remove(); });
    if (document.getElementById(TOP_BUTTON_ID)) return;
    const holder = document.querySelector('#top-settings-holder') || document.querySelector('#top-bar') || document.querySelector('#extensionsMenuButton')?.parentElement || document.body;
    const btn = document.createElement('div');
    btn.id = TOP_BUTTON_ID; btn.className = 'drawer'; btn.title = 'User State Drawer'; btn.textContent = '💜';
    btn.addEventListener('click', togglePanel);
    holder.appendChild(btn);
}

function init() {
    try {
        renderPanel(); renderTopButton();
        const data = loadState(); setValues(data); updateSilentInjection(data);
    } catch (err) { console.error('[User State Drawer v3.3] init error:', err); }
}

jQuery(document).ready(() => {
    init(); setTimeout(init, 500); setTimeout(init, 1500); setTimeout(init, 3000);
    eventSource.on(event_types.CHAT_CHANGED, () => setTimeout(() => { const d = loadState(); setValues(d); updateSilentInjection(d); }, 300));
    eventSource.on(event_types.GENERATION_STARTED, () => updateSilentInjection(loadState()));
});
