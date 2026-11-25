import assert from 'node:assert/strict';
import test from 'node:test';

import {WindowActions} from '../windowActions.js';
import {WindowHistory} from '../windowHistory.js';

function makeActions({eligible = true, stale = false} = {}) {
    const history = new WindowHistory({isStale: window => window.stale ?? stale});
    const actions = new WindowActions({
        history,
        isEligible: () => eligible,
    });
    return {actions, history};
}

function makeWindow(id = 1) {
    return {
        id,
        minimized: false,
        minimizeCalls: 0,
        unminimizeCalls: 0,
        minimize() {
            this.minimizeCalls++;
            this.minimized = true;
        },
        unminimize() {
            this.unminimizeCalls++;
            this.minimized = false;
        },
    };
}

test('minimizes an eligible focused window and records it', () => {
    const {actions, history} = makeActions();
    const window = makeWindow();
    const display = {get_focus_window: () => window};

    assert.equal(actions.minimizeFocused(display), true);
    assert.equal(window.minimizeCalls, 1);
    assert.equal(history.size, 1);
    assert.equal(history.pop(), window);
});

test('no focused window is a harmless no-op', () => {
    const {actions, history} = makeActions();
    assert.equal(actions.minimizeFocused({get_focus_window: () => null}), false);
    assert.equal(history.size, 0);
});

test('ineligible and non-minimizable windows are left untouched', () => {
    const eligibleActions = makeActions({eligible: false}).actions;
    const window = makeWindow();
    assert.equal(eligibleActions.minimizeFocused({get_focus_window: () => window}), false);
    assert.equal(window.minimizeCalls, 0);

    const {actions, history} = makeActions();
    window.can_minimize = () => false;
    assert.equal(actions.minimizeFocused({get_focus_window: () => window}), false);
    assert.equal(history.size, 0);
});

test('minimize errors do not corrupt the history', () => {
    const {actions, history} = makeActions();
    const window = makeWindow();
    window.minimize = () => {
        throw new Error('gone');
    };

    assert.equal(actions.minimizeFocused({get_focus_window: () => window}), false);
    assert.equal(history.size, 0);
});

test('restores the newest window once', () => {
    const {actions, history} = makeActions();
    const first = makeWindow(1);
    const second = makeWindow(2);
    history.push(first);
    history.push(second);

    assert.equal(actions.restoreLast(), true);
    assert.equal(second.unminimizeCalls, 1);
    assert.equal(first.unminimizeCalls, 0);
    assert.equal(actions.restoreLast(), true);
    assert.equal(first.unminimizeCalls, 1);
    assert.equal(actions.restoreLast(), false);
});

test('empty history is a no-op', () => {
    const {actions} = makeActions();
    assert.equal(actions.restoreLast(), false);
});

test('destroyed windows are discarded, not restored', () => {
    const {actions, history} = makeActions();
    const destroyed = makeWindow();
    history.push(destroyed);
    destroyed.stale = true;

    assert.equal(actions.restoreLast(), false);
    assert.equal(destroyed.unminimizeCalls, 0);
});

test('unminimize errors are swallowed', () => {
    const {actions, history} = makeActions();
    const window = makeWindow();
    window.unminimize = () => {
        throw new Error('gone');
    };
    history.push(window);

    assert.equal(actions.restoreLast(), false);
});
