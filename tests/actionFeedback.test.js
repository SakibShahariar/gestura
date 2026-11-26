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

test('workspace moves use directional icons', () => {
    assert.deepEqual(feedbackFor('workspace-left', true), {
        iconName: 'go-previous-symbolic',
        label: 'Window moved left',
    });
    assert.deepEqual(feedbackFor('workspace-right', true), {
        iconName: 'go-next-symbolic',
        label: 'Window moved right',
    });
});

test('workspace no-ops use an information icon', () => {
    assert.equal(feedbackFor('workspace-left', false).iconName,
        'dialog-information-symbolic');
    assert.match(feedbackFor('workspace-right', false).label, /No workspace/);
});

test('unknown actions fall back safely', () => {
    assert.deepEqual(feedbackFor(null, true), {
        iconName: 'dialog-information-symbolic',
        label: 'Gesture ignored',
    });
});
