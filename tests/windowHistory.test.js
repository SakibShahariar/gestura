import assert from 'node:assert/strict';
import test from 'node:test';

import {WindowHistory} from '../windowHistory.js';

test('pops the most recently pushed window first', () => {
    const history = new WindowHistory();
    history.push({id: 1});
    history.push({id: 2});
    history.push({id: 3});

    assert.equal(history.size, 3);
    assert.equal(history.pop().id, 3);
    assert.equal(history.pop().id, 2);
    assert.equal(history.pop().id, 1);
    assert.equal(history.pop(), null);
});

test('skips stale entries when popping', () => {
    const history = new WindowHistory({isStale: window => window.stale});
    history.push({id: 1, stale: false});
    history.push({id: 2, stale: true});
    history.push({id: 3, stale: false});

    assert.equal(history.pop().id, 3);
    assert.equal(history.pop().id, 1);
});

test('does not record stale or missing windows', () => {
    const history = new WindowHistory({isStale: window => window.stale});
    assert.equal(history.push(null), false);
    assert.equal(history.push({stale: true}), false);
    assert.equal(history.size, 0);
});

test('a re-minimized window is not duplicated', () => {
    const history = new WindowHistory();
    const window = {id: 1};
    history.push(window);
    history.push({id: 2});
    history.push(window);

    assert.equal(history.size, 2);
    assert.equal(history.pop(), window);
});

test('remove discards a specific entry', () => {
    const history = new WindowHistory();
    const first = {id: 1};
    const second = {id: 2};
    history.push(first);
    history.push(second);

    assert.equal(history.remove(first), true);
    assert.equal(history.remove(first), false);
    assert.equal(history.size, 1);
    assert.equal(history.pop(), second);
});

test('reset clears the history', () => {
    const history = new WindowHistory();
    history.push({id: 1});
    history.reset();

    assert.equal(history.size, 0);
    assert.equal(history.pop(), null);
});

test('history is bounded', () => {
    const history = new WindowHistory({limit: 2});
    history.push({id: 1});
    history.push({id: 2});
    history.push({id: 3});

    assert.equal(history.size, 2);
    assert.equal(history.pop().id, 3);
    assert.equal(history.pop().id, 2);
});
