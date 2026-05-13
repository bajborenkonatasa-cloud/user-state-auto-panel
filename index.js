const USP_KEY_PREFIX = 'user_state_drawer_v2_';

function uspGetChatKey() {
  const chatId =
    window.chat_metadata?.main_chat ||
    window.this_chid ||
    window.name2 ||
    location.pathname + location.search;
  return USP_KEY_PREFIX + String(chatId);
}

function uspLoad() {
  try {
    return JSON.parse(localStorage.getItem(uspGetChatKey()) || '{}');
  } catch {
    return {};
  }
}

function uspSave(data) {
  localStorage.setItem(uspGetChatKey(), JSON.stringify(data));
}

function uspId(id) {
  return document.getElementById(id);
}

function uspGetData() {
  return {
    feelings: uspId('usp_feelings')?.value || '',
    thoughts: uspId('usp_thoughts')?.value || '',
    goals: uspId('usp_goals')?.value || '',
    desires: uspId('usp_desires')?.value || '',
    secrets: uspId('usp_secrets')?.value || '',
    relationship: uspId('usp_relationship')?.value || '',
    notes: uspId('usp_notes')?.value || '',
    trust: uspId('usp_trust')?.value || '50',
    tension: uspId('usp_tension')?.value || '50',
    affection: uspId('usp_affection')?.value || '50',
    desirelevel: uspId('usp_desirelevel')?.value || '50',
  };
}

function uspBuildBlock(data) {
  return `[{{user}} INTERNAL STATE FOR THIS CHAT]
Feelings: ${data.feelings || 'not specified'}
Hidden thoughts: ${data.thoughts || 'not specified'}
Current goals: ${data.goals || 'not specified'}
Desires: ${data.desires || 'not specified'}
Secrets: ${data.secrets || 'not specified'}
Relationship to {{char}}: ${data.relationship || 'not specified'}
Notes: ${data.notes || 'not specified'}
Trust toward {{char}}: ${data.trust}/100
Tension: ${data.tension}/100
Affection toward {{char}}: ${data.affection}/100
Desire level: ${data.desirelevel}/100
[Instruction: Use this as private context for {{user}}'s inner state. Do not quote this block directly unless the story naturally reveals it.]`;
}

function uspUpdateNumbers() {
  const pairs = [
    ['usp_trust', 'usp_trust_val'],
    ['usp_tension', 'usp_tension_val'],
    ['usp_affection', 'usp_affection_val'],
    ['usp_desirelevel', 'usp_desire_val'],
  ];
  for (const [input, out] of pairs) {
    if (uspId(input) && uspId(out)) uspId(out).textContent = uspId(input).value;
  }
  uspUpdatePreview();
}

function uspUpdatePreview() {
  const p = uspId('usp_preview');
  if (p) p.textContent = uspBuildBlock(uspGetData());
}

function uspApplyData(data) {
  const fields = ['feelings','thoughts','goals','desires','secrets','relationship','notes'];
  for (const f of fields) {
    const el = uspId('usp_' + f);
    if (el) el.value = data[f] || '';
  }

  const sliders = {
    trust: 'usp_trust',
    tension: 'usp_tension',
    affection: 'usp_affection',
    desirelevel: 'usp_desirelevel',
  };

  for (const [key, id] of Object.entries(sliders)) {
    const el = uspId(id);
    if (el) el.value = data[key] || '50';
  }

  uspUpdateNumbers();
}

function uspInsertToInput(text) {
  const box = document.querySelector('#send_textarea');
  if (!box) return;
  box.value = box.value ? text + '\n\n' + box.value : text;
  box.dispatchEvent(new Event('input', { bubbles: true }));
}

function uspRender() {
  if (!uspId('usp_floating_button')) {
    const btn = document.createElement('button');
    btn.id = 'usp_floating_button';
    btn.title = 'User State Drawer';
    btn.textContent = '💜';
    document.body.appendChild(btn);
    btn.onclick = () => {
      uspApplyData(uspLoad());
      uspId('usp_drawer')?.classList.add('usp_open');
    };
  }

  if (uspId('usp_drawer')) return;

  const drawer = document.createElement('div');
  drawer.id = 'usp_drawer';
  drawer.innerHTML = `
    <div class="usp_header">
      <h3>💜 {{user}} State</h3>
      <button id="usp_close" class="menu_button">Close</button>
    </div>

    <div class="usp_hint">
      This state is saved separately for the current chat. Fill it as your character's inner state.
    </div>

    <div class="usp_group"><label>Feelings / Чувства</label><textarea id="usp_feelings"></textarea></div>
    <div class="usp_group"><label>Hidden thoughts / Скрытые мысли</label><textarea id="usp_thoughts"></textarea></div>
    <div class="usp_group"><label>Goals / Цели</label><textarea id="usp_goals"></textarea></div>
    <div class="usp_group"><label>Desires / Желания</label><textarea id="usp_desires"></textarea></div>
    <div class="usp_group"><label>Secrets / Секреты</label><textarea id="usp_secrets"></textarea></div>
    <div class="usp_group"><label>Relationship to {{char}} / Отношение к {{char}}</label><textarea id="usp_relationship"></textarea></div>
    <div class="usp_group"><label>Notes / Заметки</label><textarea id="usp_notes"></textarea></div>

    <div class="usp_group">
      <label class="usp_slider_label"><span>Trust / Доверие</span><span id="usp_trust_val"></span></label>
      <input id="usp_trust" type="range" min="0" max="100" value="50">
    </div>

    <div class="usp_group">
      <label class="usp_slider_label"><span>Tension / Напряжение</span><span id="usp_tension_val"></span></label>
      <input id="usp_tension" type="range" min="0" max="100" value="50">
    </div>

    <div class="usp_group">
      <label class="usp_slider_label"><span>Affection / Привязанность</span><span id="usp_affection_val"></span></label>
      <input id="usp_affection" type="range" min="0" max="100" value="50">
    </div>

    <div class="usp_group">
      <label class="usp_slider_label"><span>Desire / Желание</span><span id="usp_desire_val"></span></label>
      <input id="usp_desirelevel" type="range" min="0" max="100" value="50">
    </div>

    <div class="usp_buttons">
      <button id="usp_save" class="menu_button">Save</button>
      <button id="usp_insert" class="menu_button">Insert now</button>
    </div>

    <div id="usp_preview"></div>
  `;
  document.body.appendChild(drawer);

  uspId('usp_close').onclick = () => uspId('usp_drawer').classList.remove('usp_open');

  ['usp_trust','usp_tension','usp_affection','usp_desirelevel'].forEach(id => {
    uspId(id).addEventListener('input', () => {
      uspSave(uspGetData());
      uspUpdateNumbers();
    });
  });

  ['usp_feelings','usp_thoughts','usp_goals','usp_desires','usp_secrets','usp_relationship','usp_notes'].forEach(id => {
    uspId(id).addEventListener('input', () => {
      uspSave(uspGetData());
      uspUpdatePreview();
    });
  });

  uspId('usp_save').onclick = () => {
    uspSave(uspGetData());
    toastr?.success?.('{{user}} state saved for this chat');
  };

  uspId('usp_insert').onclick = () => {
    const data = uspGetData();
    uspSave(data);
    uspInsertToInput(uspBuildBlock(data));
    toastr?.success?.('{{user}} state inserted');
  };

  uspApplyData(uspLoad());
}

function uspPatchFetchOnce() {
  if (window.__uspDrawerFetchPatched) return;
  window.__uspDrawerFetchPatched = true;

  const originalFetch = window.fetch;
  window.fetch = async function(resource, config) {
    try {
      const url = typeof resource === 'string' ? resource : resource?.url || '';
      if (url.includes('/generate') && config?.body && typeof config.body === 'string') {
        const data = uspGetData();
        uspSave(data);
        const block = uspBuildBlock(data);
        const body = JSON.parse(config.body);

        if (typeof body.user_input === 'string' && body.user_input.trim()) {
          body.user_input = `${block}\n\n${body.user_input}`;
        } else if (Array.isArray(body.messages)) {
          body.messages.unshift({ role: 'system', content: block });
        }

        config.body = JSON.stringify(body);
      }
    } catch (e) {
      console.error('[User State Drawer] injection failed:', e);
    }
    return originalFetch.apply(this, arguments);
  };
}

jQuery(() => {
  uspRender();
  uspPatchFetchOnce();
});
