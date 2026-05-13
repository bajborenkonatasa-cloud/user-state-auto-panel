import { eventSource, event_types, extension_prompt_types, setExtensionPrompt } from '../../../../script.js';

const MODULE_NAME = 'user-state-auto-panel';
const KEY = 'user_state_auto_panel_data_v1';

function loadState() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { return {}; }
}

function saveState(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function esc(text) {
  return String(text || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function collectFromPanel() {
  return {
    enabled: document.querySelector('#usap_enabled')?.checked ?? true,
    name: document.querySelector('#usap_name')?.value || '{{user}}',
    feelings: document.querySelector('#usap_feelings')?.value || '',
    thoughts: document.querySelector('#usap_thoughts')?.value || '',
    goals: document.querySelector('#usap_goals')?.value || '',
    desires: document.querySelector('#usap_desires')?.value || '',
    relation: document.querySelector('#usap_relation')?.value || '',
    secret: document.querySelector('#usap_secret')?.value || '',
    notes: document.querySelector('#usap_notes')?.value || '',
  };
}

function buildPrompt(data) {
  const name = data.name || '{{user}}';
  const lines = [
    `[Current inner state of ${name}]`,
    `This is private roleplay guidance for ${name}. Use it to understand ${name}'s emotions, hidden motives and behavior. Do not quote this block directly unless the user asks.`,
    data.feelings ? `Feelings: ${data.feelings}` : '',
    data.thoughts ? `Hidden thoughts: ${data.thoughts}` : '',
    data.goals ? `Goals: ${data.goals}` : '',
    data.desires ? `Desires: ${data.desires}` : '',
    data.relation ? `Relationship attitude: ${data.relation}` : '',
    data.secret ? `Secret: ${data.secret}` : '',
    data.notes ? `Extra notes: ${data.notes}` : '',
    `[/Current inner state of ${name}]`,
  ].filter(Boolean);
  return lines.join('\n');
}

function applyExtensionPrompt() {
  const data = loadState();
  const text = data.enabled === false ? '' : buildPrompt(data);
  try {
    setExtensionPrompt(MODULE_NAME, text, extension_prompt_types.IN_PROMPT, 0, false);
  } catch (err) {
    console.warn('User State Auto Panel: setExtensionPrompt failed', err);
  }
  const preview = document.querySelector('#usap_preview');
  if (preview) preview.textContent = text || 'Auto injection is disabled.';
}

function insertToChat(text) {
  const box = document.querySelector('#send_textarea');
  if (!box) return;
  box.value = box.value ? box.value + '\n\n' + text : text;
  box.dispatchEvent(new Event('input', { bubbles: true }));
}

function renderPanel() {
  if (document.querySelector('#user_state_auto_panel')) return;
  const data = Object.assign({ enabled: true, name: '{{user}}' }, loadState());
  const panel = document.createElement('div');
  panel.id = 'user_state_auto_panel';
  panel.innerHTML = `
    <h3>💜 User State Auto Panel</h3>
    <div class="usap-small">Write your character state manually. When enabled, it is quietly added to the prompt automatically.</div>
    <div class="usap-row">
      <label><input type="checkbox" id="usap_enabled" ${data.enabled === false ? '' : 'checked'}> Auto add to prompt</label>
    </div>
    <label>Character name</label>
    <input id="usap_name" value="${esc(data.name || '{{user}}')}" />
    <label>Feelings / Чувства</label>
    <textarea id="usap_feelings">${esc(data.feelings)}</textarea>
    <label>Hidden thoughts / Скрытые мысли</label>
    <textarea id="usap_thoughts">${esc(data.thoughts)}</textarea>
    <label>Goals / Цели</label>
    <textarea id="usap_goals">${esc(data.goals)}</textarea>
    <label>Desires / Желания</label>
    <textarea id="usap_desires">${esc(data.desires)}</textarea>
    <label>Relationship attitude / Отношение к персонажу</label>
    <textarea id="usap_relation">${esc(data.relation)}</textarea>
    <label>Secret / Секрет</label>
    <textarea id="usap_secret">${esc(data.secret)}</textarea>
    <label>Notes / Заметки</label>
    <textarea id="usap_notes">${esc(data.notes)}</textarea>
    <div class="usap-row">
      <button id="usap_save" class="menu_button">Save / Apply</button>
      <button id="usap_insert" class="menu_button">Insert to chat</button>
    </div>
    <div class="usap-small">Preview of hidden prompt:</div>
    <div id="usap_preview" class="usap-preview"></div>
  `;
  const target = document.querySelector('#extensions_settings2') || document.querySelector('#extensions_settings');
  if (target) target.prepend(panel);

  const saveAndApply = () => { const next = collectFromPanel(); saveState(next); applyExtensionPrompt(); toastr.success('User state saved and applied'); };
  document.querySelector('#usap_save').onclick = saveAndApply;
  document.querySelector('#usap_insert').onclick = () => { const next = collectFromPanel(); saveState(next); const text = buildPrompt(next); insertToChat(text); applyExtensionPrompt(); toastr.success('Inserted to chat'); };
  panel.querySelectorAll('textarea,input').forEach(el => el.addEventListener('change', saveAndApply));
  applyExtensionPrompt();
}

jQuery(() => {
  renderPanel();
  applyExtensionPrompt();
  eventSource.on(event_types.APP_READY, () => { renderPanel(); applyExtensionPrompt(); });
  eventSource.on(event_types.CHAT_CHANGED, () => applyExtensionPrompt());
});
