console.log('[User State Drawer v2.2] loaded');

(function () {
  const KEY_PREFIX = 'user_state_drawer_v22_';

  function chatKey() {
    const key =
      window.chat_metadata?.main_chat ||
      window.this_chid ||
      window.name2 ||
      location.pathname + location.search;
    return KEY_PREFIX + String(key);
  }

  function load() {
    try { return JSON.parse(localStorage.getItem(chatKey()) || '{}'); }
    catch { return {}; }
  }

  function save(data) {
    localStorage.setItem(chatKey(), JSON.stringify(data));
  }

  function id(x) {
    return document.getElementById(x);
  }

  function data() {
    return {
      feelings: id('usp_feelings_v22')?.value || '',
      thoughts: id('usp_thoughts_v22')?.value || '',
      goals: id('usp_goals_v22')?.value || '',
      desires: id('usp_desires_v22')?.value || '',
      secrets: id('usp_secrets_v22')?.value || '',
      relationship: id('usp_relationship_v22')?.value || '',
      notes: id('usp_notes_v22')?.value || '',
      trust: id('usp_trust_v22')?.value || '50',
      tension: id('usp_tension_v22')?.value || '50',
      affection: id('usp_affection_v22')?.value || '50',
      desire: id('usp_desire_v22')?.value || '50',
    };
  }

  function block(d) {
    return `[{{user}} INTERNAL STATE FOR THIS CHAT]
Feelings: ${d.feelings || 'not specified'}
Hidden thoughts: ${d.thoughts || 'not specified'}
Goals: ${d.goals || 'not specified'}
Desires: ${d.desires || 'not specified'}
Secrets: ${d.secrets || 'not specified'}
Relationship to {{char}}: ${d.relationship || 'not specified'}
Notes: ${d.notes || 'not specified'}
Trust: ${d.trust}/100
Tension: ${d.tension}/100
Affection: ${d.affection}/100
Desire: ${d.desire}/100
[Use as private context for {{user}}. Do not quote directly.]`;
  }

  function updatePreview() {
    const d = data();
    ['trust','tension','affection','desire'].forEach(k => {
      const span = id('usp_' + k + '_val_v22');
      const input = id('usp_' + k + '_v22');
      if (span && input) span.textContent = input.value;
    });
    const p = id('usp_preview_v22');
    if (p) p.textContent = block(d);
    save(d);
  }

  function apply(d) {
    const map = {
      feelings: 'usp_feelings_v22',
      thoughts: 'usp_thoughts_v22',
      goals: 'usp_goals_v22',
      desires: 'usp_desires_v22',
      secrets: 'usp_secrets_v22',
      relationship: 'usp_relationship_v22',
      notes: 'usp_notes_v22',
      trust: 'usp_trust_v22',
      tension: 'usp_tension_v22',
      affection: 'usp_affection_v22',
      desire: 'usp_desire_v22',
    };
    Object.entries(map).forEach(([k, elid]) => {
      const el = id(elid);
      if (el) el.value = d[k] || (el.type === 'range' ? '50' : '');
    });
    updatePreview();
  }

  function insertNow() {
    const box = document.querySelector('#send_textarea, textarea[name="send_textarea"], textarea');
    if (!box) {
      alert('Text input not found');
      return;
    }
    const text = block(data());
    box.value = box.value ? text + '\\n\\n' + box.value : text;
    box.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function render() {
    if (!id('usp_button_v22')) {
      const btn = document.createElement('button');
      btn.id = 'usp_button_v22';
      btn.textContent = '💜';
      btn.onclick = () => {
        apply(load());
        id('usp_panel_v22')?.classList.add('open');
      };
      document.body.appendChild(btn);
    }

    if (!id('usp_panel_v22')) {
      const panel = document.createElement('div');
      panel.id = 'usp_panel_v22';
      panel.innerHTML = `
        <div class="usp_head_v22">
          <h3>💜 {{user}} State</h3>
          <button id="usp_close_v22">Close</button>
        </div>
        <p>Saved separately for this chat.</p>

        <label>Feelings / Чувства</label><textarea id="usp_feelings_v22"></textarea>
        <label>Hidden thoughts / Скрытые мысли</label><textarea id="usp_thoughts_v22"></textarea>
        <label>Goals / Цели</label><textarea id="usp_goals_v22"></textarea>
        <label>Desires / Желания</label><textarea id="usp_desires_v22"></textarea>
        <label>Secrets / Секреты</label><textarea id="usp_secrets_v22"></textarea>
        <label>Relationship to {{char}} / Отношение к {{char}}</label><textarea id="usp_relationship_v22"></textarea>
        <label>Notes / Заметки</label><textarea id="usp_notes_v22"></textarea>

        <div class="usp_row_v22">Trust: <span id="usp_trust_val_v22">50</span><input id="usp_trust_v22" type="range" min="0" max="100" value="50"></div>
        <div class="usp_row_v22">Tension: <span id="usp_tension_val_v22">50</span><input id="usp_tension_v22" type="range" min="0" max="100" value="50"></div>
        <div class="usp_row_v22">Affection: <span id="usp_affection_val_v22">50</span><input id="usp_affection_v22" type="range" min="0" max="100" value="50"></div>
        <div class="usp_row_v22">Desire: <span id="usp_desire_val_v22">50</span><input id="usp_desire_v22" type="range" min="0" max="100" value="50"></div>

        <button id="usp_save_v22">Save</button>
        <button id="usp_insert_v22">Insert now</button>
        <div id="usp_preview_v22" class="usp_preview_v22"></div>
      `;
      document.body.appendChild(panel);

      id('usp_close_v22').onclick = () => panel.classList.remove('open');
      id('usp_save_v22').onclick = () => {
        save(data());
        alert('{{user}} state saved');
      };
      id('usp_insert_v22').onclick = insertNow;

      panel.querySelectorAll('textarea,input').forEach(el => {
        el.addEventListener('input', updatePreview);
      });

      apply(load());
    }
  }

  function boot() {
    try { render(); } catch (e) { console.error('[User State Drawer v2.2] render failed', e); }
  }

  boot();
  setTimeout(boot, 500);
  setTimeout(boot, 1500);
  setTimeout(boot, 3000);
  setInterval(boot, 5000);
})();
