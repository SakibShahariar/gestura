import assert from 'node:assert/strict';
import test from 'node:test';

import {feedbackFor} from '../actionFeedback.js';

test('performed minimize uses the minimize icon', () => {
    assert.deepEqual(feedbackFor('minimize', true), {
        iconName: 'window-minimize-symbolic',
        label: 'Window minimized',
    });
});

test('performed restore uses the restore icon', () => {
    assert.deepEqual(feedbackFor('restore', true), {
        iconName: 'window-restore-symbolic',
        label: 'Window restored',
    });
});

test('no-op outcomes use an information icon', () => {
    assert.equal(feedbackFor('minimize', false).iconName, 'dialog-information-symbolic');
    assert.equal(feedbackFor('restore', false).iconName, 'dialog-information-symbolic');
    assert.match(feedbackFor('minimize', false).label, /No window/);
    assert.match(feedbackFor('restore', false).label, /No window/);
});

test('unknown actions fall back safely', () => {
    assert.deepEqual(feedbackFor(null, true), {
        iconName: 'dialog-information-symbolic',
        label: 'Gesture ignored',
    });
});
