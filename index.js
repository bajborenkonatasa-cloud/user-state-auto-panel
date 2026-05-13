import { eventSource, event_types } from '../../../../script.js';

console.log('[User State Test Button] index.js loaded');

function createTestButton() {
    if (document.getElementById('user_state_test_button')) {
        return;
    }

    const btn = document.createElement('button');
    btn.id = 'user_state_test_button';
    btn.textContent = '💜';
    btn.title = 'User State Test Button';

    btn.addEventListener('click', () => {
        alert('User State Test Button works!');
    });

    document.body.appendChild(btn);
    console.log('[User State Test Button] button created');
}

jQuery(() => {
    createTestButton();
    setTimeout(createTestButton, 1000);
    setTimeout(createTestButton, 3000);

    try {
        eventSource.on(event_types.APP_READY, createTestButton);
        eventSource.on(event_types.CHAT_CHANGED, createTestButton);
    } catch (error) {
        console.warn('[User State Test Button] event hook failed', error);
    }
});
