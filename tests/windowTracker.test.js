import assert from 'node:assert/strict';
import test from 'node:test';

import {WindowHistory} from '../windowHistory.js';
import {WindowTracker} from '../windowTracker.js';

class MockWindow {
    constructor({minimized = false} = {}) {
        this.minimized = minimized;
        this._nextId = 0;
        this._handlers = new Map();
    }

    connect(signal, handler) {
        const id = ++this._nextId;
        this._handlers.set(id, {signal, handler});
        return id;
    }

    disconnect(id) {
        this._handlers.delete(id);
    }

    emit(signal, ...args) {
        for (const entry of [...this._handlers.values()]) {
            if (entry.signal === signal)
                entry.handler(this, ...args);
        }
    }

    minimize() {
        this.minimized = true;
        this.emit('notify::minimized');
    }

    unminimize() {
        this.minimized = false;
        this.emit('notify::minimized');
    }

    unmanage() {
        this.emit('unmanaged');
    }
}

class MockDisplay {
    constructor(windows = []) {
        this.windows = [...windows];
        this._nextId = 0;
        this._handlers = new Map();
    }

    connect(signal, handler) {
        const id = ++this._nextId;
        this._handlers.set(id, {signal, handler});
        return id;
    }

    disconnect(id) {
        this._handlers.delete(id);
    }

    list_all_windows() {
        return [...this.windows];
    }

    emit(signal, ...args) {
        for (const entry of [...this._handlers.values()]) {
            if (entry.signal === signal)
                entry.handler(this, ...args);
        }
    }

    create(window) {
        this.windows.push(window);
        this.emit('window-created', window);
    }
}

function makeTracker({windows = [], isEligible = () => true} = {}) {
    const display = new MockDisplay(windows);
    const history = new WindowHistory();
    const tracker = new WindowTracker({display, history, isEligible});
    return {display, history, tracker};
}

test('seeds windows that were already minimized at startup', () => {
    const first = new MockWindow({minimized: true});
    const open = new MockWindow();
    const second = new MockWindow({minimized: true});
    const {history, tracker} = makeTracker({windows: [first, open, second]});

    tracker.start();
    assert.equal(history.size, 2);
    assert.equal(history.pop(), second);
    assert.equal(history.pop(), first);
});

test('tracks new windows and pushes when they are minimized', () => {
    const {display, history, tracker} = makeTracker();
    tracker.start();

    const window = new MockWindow();
    display.create(window);
    assert.equal(history.size, 0);

    window.minimize();
    assert.equal(history.size, 1);
    assert.equal(history.pop(), window);
});

test('removes a window when it is unminimized', () => {
    const {display, history, tracker} = makeTracker();
    tracker.start();

    const window = new MockWindow();
    display.create(window);
    window.minimize();
    window.unminimize();

    assert.equal(history.size, 0);
});

test('re-minimizing moves a window to the top without duplicating it', () => {
    const {display, history, tracker} = makeTracker();
    tracker.start();

    const first = new MockWindow();
    const second = new MockWindow();
    display.create(first);
    display.create(second);
    first.minimize();
    second.minimize();
    first.unminimize();
    first.minimize();

    assert.equal(history.size, 2);
    assert.equal(history.pop(), first);
    assert.equal(history.pop(), second);
});

test('unmanaged windows are removed and their handlers disconnected', () => {
    const {display, history, tracker} = makeTracker();
    tracker.start();

    const window = new MockWindow();
    display.create(window);
    window.minimize();
    window.unmanage();

    assert.equal(history.size, 0);
    window.minimize(); // handler is gone: no effect
    assert.equal(history.size, 0);
});

test('ineligible windows are not tracked', () => {
    const {display, history, tracker} = makeTracker({
        isEligible: () => false,
    });
    tracker.start();

    const window = new MockWindow();
    display.create(window);
    window.minimize();

    assert.equal(history.size, 0);
});

test('stop disconnects all handlers', () => {
    const {display, history, tracker} = makeTracker();
    tracker.start();

    const window = new MockWindow();
    display.create(window);
    tracker.stop();

    display.create(new MockWindow());
    window.minimize();
    assert.equal(history.size, 0);
});

test('inputs are validated', () => {
    const history = new WindowHistory();
    const display = new MockDisplay();
    assert.throws(() => new WindowTracker({display: null, history}), TypeError);
    assert.throws(() => new WindowTracker({display, history: null}), TypeError);
    assert.throws(() => new WindowTracker({display, history, isEligible: null}), TypeError);
});
