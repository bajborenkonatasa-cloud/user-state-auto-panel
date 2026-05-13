// index.js — User State Drawer v3.2
// Рабочая версия с кнопкой в верхней панели SillyTavern и silent prompt injection через setExtensionPrompt.

import { getContext } from '../../../extensions.js';
import {
    eventSource,
    event_types,
    setExtensionPrompt,
    extension_prompt_types,
    extension_prompt_roles
} from '../../../../script.js';

console.log('[User State Drawer v3.2] module loaded');

const USD3_PREFIX = 'user_state_drawer_v32_';
const PROMPT_ID = 'user_state_drawer_v32_prompt';

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
    const getVal = (id, def = '') => document.getElementById(id)?.value || def;
    const getCheck = (id) => document.getElementById(id)?.checked || false;

    return {
        feelings: getVal('usd3_feelings'),
        thoughts: getVal('usd3_thoughts'),
        goals: getVal('usd3_goals'),
        desires: getVal('usd3_desires'),
        secrets: getVal('usd3_secrets'),
        relationship: getVal('usd3_relationship'),
        notes: getVal('usd3_notes'),
        trust: getVal('usd3_trust', '50'),
        tension: getVal('usd3_tension', '50'),
        affection: getVal('usd3_affection', '50'),
        desire: getVal('usd3_desire', '50'),
        autoInject: getCheck('usd3_auto_inject')
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
        desire: 'usd3_desire'
    };

    for (const [key, id] of Object.entries(map)) {
        const el = document.getElementById(id);
        if (!el) continue;
        el.value = data[key] || (el.type === 'range' ? '50' : '');
    }

    const autoCb = document.getElementById('usd3_auto_inject');
    if (autoCb) autoCb.checked = !!data.autoInject;

    updatePreview();
}

function updateSilentInjection(data) {
    if (typeof setExtensionPrompt !== 'function') return;

    try {
        if (data.autoInject) {
            setExtensionPrompt(
                PROMPT_ID,
                buildPrompt(data),
                extension_prompt_types.IN_CHAT,
                0,
                false,
                extension_prompt_roles.SYSTEM
            );
        } else {
            setExtensionPrompt(
                PROMPT_ID,
                '',
                extension_prompt_types.IN_CHAT,
                0,
                false,
                extension_prompt_roles.SYSTEM
            );
        }
    } catch (err) {
        console.error('[User State Drawer v3.2] injection error:', err);
    }
}

function updatePreview() {
    const data = getData();

    const sliders = {
        trust: 'usd3_trust_val',
        tension: 'usd3_tension_val',
        affection: 'usd3_affection_val',
        desire: 'usd3_desire_val'
    };

    for (const [key, id] of Object.entries(sliders)) {
        const span = document.getElementById(id);
        if (span) span.textContent = data[key];
    }

    const preview = document.getElementById('usd3_preview');
    if (preview) preview.textContent = buildPrompt(data);

    const insertBtn = document.getElementById('usd3_insert_btn');
    if (insertBtn) {
        if (data.autoInject) {
            insertBtn.style.opacity = '0.5';
            insertBtn.style.pointerEvents = 'none';
            insertBtn.textContent = 'Auto-inject is ON';
        } else {
            insertBtn.style.opacity = '1';
            insertBtn.style.pointerEvents = 'auto';
            insertBtn.textContent = 'Insert now';
        }
    }

    saveState(data);
    updateSilentInjection(data);
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

function addCheckbox(panel, id, label) {
    const wrap = make('div', { class: 'usd3_checkbox_wrap' });
    const input = make('input', { id, type: 'checkbox' });
    input.addEventListener('change', updatePreview);
    wrap.appendChild(input);

    const lab = make('label', {}, label);
    lab.addEventListener('click', () => {
        input.checked = !input.checked;
        updatePreview();
    });
    wrap.appendChild(lab);

    panel.appendChild(wrap);
}

function insertIntoInput() {
    const input = document.querySelector('#send_textarea') || document.querySelector('textarea');
    if (!input) {
        if (window.toastr) toastr.error('Текстовое поле не найдено');
        return;
    }

    const prompt = buildPrompt(getData());
    input.value = input.value ? `${prompt}\n\n${input.value}` : prompt;
    input.dispatchEvent(new Event('input', { bubbles: true }));

    document.getElementById('usd3_panel')?.classList.remove('usd3_open');
}

function renderPanel() {
    if (document.getElementById('usd3_panel')) return;

    const panel = make('div', { id: 'usd3_panel' });

    const header = make('div', { class: 'usd3_header' });
    header.appendChild(make('h3', {}, '💜 {{user}} State'));
    const close = make('button', { id: 'usd3_close', class: 'menu_button' }, 'X');
    close.addEventListener('click', () => panel.classList.remove('usd3_open'));
    header.appendChild(close);
    panel.appendChild(header);

    panel.appendChild(make('div', { class: 'usd3_hint' }, 'Заполните внутреннее состояние вашего персонажа. Сохраняется отдельно для текущего чата.'));

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

    addCheckbox(panel, 'usd3_auto_inject', 'Auto-inject into prompt (Silent)');

    const buttons = make('div', { class: 'usd3_buttons' });

    const save = make('button', { class: 'menu_button' }, 'Save');
    save.addEventListener('click', () => {
        saveState(getData());
        if (window.toastr) toastr.success('State saved');
    });

    const insert = make('button', { id: 'usd3_insert_btn', class: 'menu_button' }, 'Insert now');
    insert.addEventListener('click', insertIntoInput);

    buttons.appendChild(save);
    buttons.appendChild(insert);
    panel.appendChild(buttons);

    panel.appendChild(make('div', { id: 'usd3_preview' }));

    document.body.appendChild(panel);
    console.log('[User State Drawer v3.2] panel created');
}

function togglePanel() {
    const panel = document.getElementById('usd3_panel');
    if (!panel) return;

    if (panel.classList.contains('usd3_open')) {
        panel.classList.remove('usd3_open');
    } else {
        setValues(loadState());
        panel.classList.add('usd3_open');
    }
}

function renderTopButton() {
    if (document.getElementById('usd3-top-button')) return;

    const holder =
        document.querySelector('#top-settings-holder') ||
        document.querySelector('#top-bar') ||
        document.querySelector('#extensionsMenuButton')?.parentElement ||
        document.querySelector('body');

    const btn = document.createElement('div');
    btn.id = 'usd3-top-button';
    btn.className = 'drawer fas fa-heart';
    btn.title = 'User State Drawer';
    btn.textContent = '💜';
    btn.addEventListener('click', togglePanel);

    holder.appendChild(btn);
    console.log('[User State Drawer v3.2] top button created');
}

function init() {
    try {
        renderPanel();
        renderTopButton();

        const data = loadState();
        setValues(data);
        updateSilentInjection(data);

        console.log('[User State Drawer v3.2] ready');
    } catch (err) {
        console.error('[User State Drawer v3.2] init error:', err);
    }
}

jQuery(document).ready(() => {
    init();

    setTimeout(init, 500);
    setTimeout(init, 1500);
    setTimeout(init, 3000);

    eventSource.on(event_types.CHAT_CHANGED, () => {
        setTimeout(() => {
            const data = loadState();
            setValues(data);
            updateSilentInjection(data);
        }, 300);
    });

    eventSource.on(event_types.GENERATION_STARTED, () => {
        updateSilentInjection(loadState());
    });
});
