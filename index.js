import { eventSource, event_types } from '/script.js';
import { getContext } from '/scripts/extensions.js';

console.log('[User State Drawer v3] module loaded');

const USD3_PREFIX = 'user_state_drawer_v3_';

function $(id) {
    return document.getElementById(id);
}

function make(tag, attrs = {}, text = '') {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'class') el.className = value;
        else if (key === 'type') el.type = value;
        else if (key === 'min') el.min = value;
        else if (key === 'max') el.max = value;
        else if (key === 'value') el.value = value;
        else el.setAttribute(key, value);
    }
    if (text) el.textContent = text;
    return el;
}

function getChatKey() {
    try {
        const context = getContext?.();
        const charId = context?.characterId ?? window.this_chid ?? 'unknown_char';
        const chatId = context?.chatId ?? window.chat_metadata?.main_chat ?? window.name2 ?? location.search ?? 'unknown_chat';
        return USD3_PREFIX + String(charId) + '_' + String(chatId);
    } catch {
        return USD3_PREFIX + location.pathname + location.search;
    }
}

function loadState() {
    try {
        return JSON.parse(localStorage.getItem(getChatKey()) || '{}');
    } catch {
        return {};
    }
}

function saveState(data) {
    localStorage.setItem(getChatKey(), JSON.stringify(data));
}

function getData() {
    return {
        feelings: $('usd3_feelings')?.value || '',
        thoughts: $('usd3_thoughts')?.value || '',
        goals: $('usd3_goals')?.value || '',
        desires: $('usd3_desires')?.value || '',
        secrets: $('usd3_secrets')?.value || '',
        relationship: $('usd3_relationship')?.value || '',
        notes: $('usd3_notes')?.value || '',
        trust: $('usd3_trust')?.value || '50',
        tension: $('usd3_tension')?.value || '50',
        affection: $('usd3_affection')?.value || '50',
        desire: $('usd3_desire')?.value || '50',
    };
}

function buildPrompt(data) {
    return `[{{user}} INTERNAL STATE FOR THIS CHAT]
Feelings: ${data.feelings || 'not specified'}
Hidden thoughts: ${data.thoughts || 'not specified'}
Goals: ${data.goals || 'not specified'}
Desires: ${data.desires || 'not specified'}
Secrets: ${data.secrets || 'not specified'}
Relationship to {{char}}: ${data.relationship || 'not specified'}
Notes: ${data.notes || 'not specified'}
Trust toward {{char}}: ${data.trust}/100
Tension: ${data.tension}/100
Affection toward {{char}}: ${data.affection}/100
Desire level: ${data.desire}/100
[Instruction: Use this as private context for {{user}}. Do not quote this block directly.]`;
}

function setValues(data) {
    const map = {
        feelings: 'usd3_feelings',
        thoughts: 'usd3_thoughts',
        goals: 'usd3_goals',
        desires: 'usd3_desires',
        secrets: 'usd3_secrets',
        relationship: 'usd3_relationship',
        notes: 'usd3_notes',
        trust: 'usd3_trust',
        tension: 'usd3_tension',
        affection: 'usd3_affection',
        desire: 'usd3_desire',
    };

    for (const [key, id] of Object.entries(map)) {
        const el = $(id);
        if (!el) continue;
        el.value = data[key] || (el.type === 'range' ? '50' : '');
    }

    updatePreview();
}

function updatePreview() {
    const data = getData();
    const sliders = {
        trust: 'usd3_trust_val',
        tension: 'usd3_tension_val',
        affection: 'usd3_affection_val',
        desire: 'usd3_desire_val',
    };

    for (const [key, id] of Object.entries(sliders)) {
        const span = $(id);
        if (span) span.textContent = data[key];
    }

    const preview = $('usd3_preview');
    if (preview) preview.textContent = buildPrompt(data);

    saveState(data);
}

function addTextArea(panel, id, label) {
    const wrap = make('div', { class: 'usd3_field' });
    wrap.appendChild(make('label', {}, label));
    const area = make('textarea', { id });
    area.addEventListener('input', updatePreview);
    wrap.appendChild(area);
    panel.appendChild(wrap);
}

function addSlider(panel, id, label, valId) {
    const wrap = make('div', { class: 'usd3_field' });
    const lab = make('label', { class: 'usd3_slider_label' });
    lab.appendChild(make('span', {}, label));
    lab.appendChild(make('span', { id: valId }, '50'));
    wrap.appendChild(lab);
    const input = make('input', { id, type: 'range', min: '0', max: '100', value: '50' });
    input.addEventListener('input', updatePreview);
    wrap.appendChild(input);
    panel.appendChild(wrap);
}

function insertIntoInput() {
    const input = document.querySelector('#send_textarea') || document.querySelector('textarea');
    if (!input) {
        alert('SillyTavern text input not found');
        return;
    }

    const prompt = buildPrompt(getData());
    input.value = input.value ? `${prompt}\n\n${input.value}` : prompt;
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

function renderPanel() {
    if ($('usd3_button') && $('usd3_panel')) return;

    if (!$('usd3_button')) {
        const btn = make('button', { id: 'usd3_button', title: '{{user}} State' }, '💜');
        btn.addEventListener('click', () => {
            setValues(loadState());
            $('usd3_panel')?.classList.add('usd3_open');
        });
        document.body.appendChild(btn);
        console.log('[User State Drawer v3] button created');
    }

    if (!$('usd3_panel')) {
        const panel = make('div', { id: 'usd3_panel' });

        const header = make('div', { class: 'usd3_header' });
        header.appendChild(make('h3', {}, '💜 {{user}} State'));
        const close = make('button', { id: 'usd3_close' }, 'Close');
        close.addEventListener('click', () => panel.classList.remove('usd3_open'));
        header.appendChild(close);
        panel.appendChild(header);

        panel.appendChild(make('div', { class: 'usd3_hint' }, 'Saved separately for the current chat. Fill this as your persona / {{user}} inner state.'));

        addTextArea(panel, 'usd3_feelings', 'Feelings / Чувства');
        addTextArea(panel, 'usd3_thoughts', 'Hidden thoughts / Скрытые мысли');
        addTextArea(panel, 'usd3_goals', 'Goals / Цели');
        addTextArea(panel, 'usd3_desires', 'Desires / Желания');
        addTextArea(panel, 'usd3_secrets', 'Secrets / Секреты');
        addTextArea(panel, 'usd3_relationship', 'Relationship to {{char}} / Отношение к {{char}}');
        addTextArea(panel, 'usd3_notes', 'Notes / Заметки');

        addSlider(panel, 'usd3_trust', 'Trust / Доверие', 'usd3_trust_val');
        addSlider(panel, 'usd3_tension', 'Tension / Напряжение', 'usd3_tension_val');
        addSlider(panel, 'usd3_affection', 'Affection / Привязанность', 'usd3_affection_val');
        addSlider(panel, 'usd3_desire', 'Desire / Желание', 'usd3_desire_val');

        const buttons = make('div', { class: 'usd3_buttons' });
        const save = make('button', {}, 'Save');
        save.addEventListener('click', () => {
            saveState(getData());
            if (window.toastr) toastr.success('{{user}} state saved');
        });

        const insert = make('button', {}, 'Insert now');
        insert.addEventListener('click', insertIntoInput);

        buttons.appendChild(save);
        buttons.appendChild(insert);
        panel.appendChild(buttons);

        panel.appendChild(make('div', { id: 'usd3_preview' }));

        document.body.appendChild(panel);
        setValues(loadState());
        console.log('[User State Drawer v3] panel created');
    }
}

function boot() {
    try {
        renderPanel();
    } catch (err) {
        console.error('[User State Drawer v3] boot failed', err);
    }
}

function installBootHooks() {
    boot();
    setTimeout(boot, 500);
    setTimeout(boot, 1500);
    setTimeout(boot, 3000);

    try {
        eventSource.on(event_types.APP_READY, boot);
        eventSource.on(event_types.CHAT_CHANGED, () => setValues(loadState()));
    } catch (err) {
        console.warn('[User State Drawer v3] event hooks unavailable', err);
    }

    setInterval(boot, 5000);
}

installBootHooks();
