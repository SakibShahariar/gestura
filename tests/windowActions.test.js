import assert from 'node:assert/strict';
import test from 'node:test';

import {Direction} from '../gestureRecognizer.js';
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

test('minimizes an eligible focused window without owning history', () => {
    const {actions, history} = makeActions();
    const window = makeWindow();
    const display = {get_focus_window: () => window};

    assert.equal(actions.minimizeFocused(display), true);
    assert.equal(window.minimizeCalls, 1);
    assert.equal(history.size, 0, 'WindowTracker, not the action, records minimization');
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

test('optionally focuses the restored window', () => {
    const {actions, history} = makeActions();
    const window = makeWindow();
    history.push(window);
    let focused = null;

    assert.equal(actions.restoreLast({focusWindow: w => { focused = w; }}), true);
    assert.equal(focused, window);
});

test('focus failures do not invalidate a successful restore', () => {
    const {actions, history} = makeActions();
    history.push(makeWindow());

    assert.equal(actions.restoreLast({
        focusWindow: () => { throw new Error('no focus'); },
    }), true);
});

test('focus is not called when unminimize fails', () => {
    const {actions, history} = makeActions();
    const window = makeWindow();
    window.unminimize = () => { throw new Error('gone'); };
    history.push(window);
    let called = false;

    assert.equal(actions.restoreLast({focusWindow: () => { called = true; }}), false);
    assert.equal(called, false);
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

function makeWorkspaceManager({count = 3, current = 1} = {}) {
    return {
        get_n_workspaces: () => count,
        get_active_workspace_index: () => current,
        get_workspace_by_index(index) {
            return index >= 0 && index < count ? {index} : null;
        },
    };
}

function movingWindow() {
    const window = makeWindow();
    window.change_workspace = workspace => { window.workspace = workspace; };
    return window;
}

test('moves the focused window to the right workspace', () => {
    const {actions} = makeActions();
    const window = movingWindow();
    const display = {get_focus_window: () => window};

    assert.equal(actions.moveFocusedToWorkspace(
        Direction.RIGHT, display, makeWorkspaceManager({current: 0})), true);
    assert.equal(window.workspace.index, 1);
});

test('moves the focused window to the left workspace', () => {
    const {actions} = makeActions();
    const window = movingWindow();
    const display = {get_focus_window: () => window};

    assert.equal(actions.moveFocusedToWorkspace(
        Direction.LEFT, display, makeWorkspaceManager({current: 2})), true);
    assert.equal(window.workspace.index, 1);
});

test('workspace edges are harmless no-ops', () => {
    const {actions} = makeActions();
    const window = movingWindow();
    const display = {get_focus_window: () => window};

    assert.equal(actions.moveFocusedToWorkspace(
        Direction.LEFT, display, makeWorkspaceManager({current: 0})), false);
    assert.equal(actions.moveFocusedToWorkspace(
        Direction.RIGHT, display, makeWorkspaceManager({current: 2})), false);
    assert.equal(window.workspace, undefined);
});

test('no focus or ineligible window cannot be moved', () => {
    const noFocus = makeActions().actions;
    assert.equal(noFocus.moveFocusedToWorkspace(
        Direction.RIGHT, {get_focus_window: () => null}, makeWorkspaceManager()), false);

    const ineligible = makeActions({eligible: false}).actions;
    assert.equal(ineligible.moveFocusedToWorkspace(
        Direction.RIGHT, {get_focus_window: () => movingWindow()},
        makeWorkspaceManager()), false);
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
