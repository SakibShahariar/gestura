import assert from 'node:assert/strict';
import test from 'node:test';

import {
    Direction,
    GesturePhase,
    GestureRecognizer,
    STRICTNESS_PRESETS,
    ratioForStrictness,
} from '../gestureRecognizer.js';

function makeRecognizer(options = {}) {
    const gestures = [];
    const recognizer = new GestureRecognizer({
        onGesture: gesture => gestures.push(gesture),
        ...options,
    });
    return {recognizer, gestures};
}

function send(recognizer, phase, fingerCount = 4, dx = 0, dy = 0) {
    return recognizer.handleEvent({phase, fingerCount, dx, dy, time: 123});
}

function swipe(recognizer, {fingers = 4, dy = -10, steps = 20} = {}) {
    const claimed = [send(recognizer, GesturePhase.BEGIN, fingers)];
    for (let i = 0; i < steps; i++)
        claimed.push(send(recognizer, GesturePhase.UPDATE, fingers, 0, dy));
    claimed.push(send(recognizer, GesturePhase.END, fingers));
    return claimed;
}

test('recognizes an upward four-finger swipe exactly once', () => {
    const {recognizer, gestures} = makeRecognizer();
    const claimed = swipe(recognizer, {dy: -10});

    assert.equal(gestures.length, 1);
    assert.equal(gestures[0].direction, Direction.UP);
    assert.equal(claimed[0], false, 'BEGIN is not claimed');
    assert.equal(claimed[1], false, 'movement below threshold is not claimed');
    assert.equal(claimed.at(-1), true, 'END of a claimed gesture is consumed');
    assert.ok(claimed.slice(2).every(Boolean), 'all events after classification are claimed');
});

test('recognizes downward swipes independently of upward ones', () => {
    const {recognizer, gestures} = makeRecognizer();
    swipe(recognizer, {dy: -10});
    swipe(recognizer, {dy: 10});

    assert.deepEqual(gestures.map(g => g.direction), [Direction.UP, Direction.DOWN]);
});

test('small movements never trigger an action', () => {
    const {recognizer, gestures} = makeRecognizer();
    swipe(recognizer, {dy: -2, steps: 10});

    assert.equal(gestures.length, 0);
});

test('horizontal four-finger swipes are never claimed', () => {
    const {recognizer, gestures} = makeRecognizer();
    const claimed = [];
    claimed.push(send(recognizer, GesturePhase.BEGIN, 4));
    for (let i = 0; i < 30; i++)
        claimed.push(send(recognizer, GesturePhase.UPDATE, 4, 10, 0));
    claimed.push(send(recognizer, GesturePhase.END, 4));

    assert.equal(gestures.length, 0);
    assert.ok(claimed.every(value => value === false));
});

test('diagonal swipes are ignored and left to GNOME', () => {
    const {recognizer, gestures} = makeRecognizer();
    const claimed = [];
    claimed.push(send(recognizer, GesturePhase.BEGIN, 4));
    for (let i = 0; i < 30; i++)
        claimed.push(send(recognizer, GesturePhase.UPDATE, 4, 10, 12));
    claimed.push(send(recognizer, GesturePhase.END, 4));

    assert.equal(gestures.length, 0);
    assert.ok(claimed.every(value => value === false));
});

test('three-finger gestures are ignored entirely', () => {
    const {recognizer, gestures} = makeRecognizer();
    const claimed = swipe(recognizer, {fingers: 3, dy: -20});

    assert.equal(gestures.length, 0);
    assert.ok(claimed.every(value => value === false));
});

test('cancelled gestures are consumed but never trigger an action', () => {
    const {recognizer, gestures} = makeRecognizer();
    send(recognizer, GesturePhase.BEGIN, 4);
    for (let i = 0; i < 5; i++)
        send(recognizer, GesturePhase.UPDATE, 4, 0, -10);
    const cancelled = send(recognizer, GesturePhase.CANCEL, 4);

    assert.equal(cancelled, true);
    assert.equal(gestures.length, 0);
    // No late action may be produced after the cancellation.
    send(recognizer, GesturePhase.UPDATE, 4, 0, -10);
    send(recognizer, GesturePhase.END, 4);
    assert.equal(gestures.length, 0);
});

test('incomplete gestures do not fire and a new gesture still works', () => {
    const {recognizer, gestures} = makeRecognizer();
    send(recognizer, GesturePhase.BEGIN, 4);
    send(recognizer, GesturePhase.UPDATE, 4, 0, -10);
    send(recognizer, GesturePhase.END, 4);
    assert.equal(gestures.length, 0);

    swipe(recognizer, {dy: -10});
    assert.equal(gestures.length, 1);
});

test('direction reversal before the threshold does not fire', () => {
    const {recognizer, gestures} = makeRecognizer();
    send(recognizer, GesturePhase.BEGIN, 4);
    for (let i = 0; i < 5; i++)
        send(recognizer, GesturePhase.UPDATE, 4, 0, -10);
    for (let i = 0; i < 20; i++)
        send(recognizer, GesturePhase.UPDATE, 4, 0, 10);
    send(recognizer, GesturePhase.END, 4);

    assert.equal(gestures.length, 0);
});

test('changing finger count mid-gesture cancels recognition', () => {
    const {recognizer, gestures} = makeRecognizer();
    send(recognizer, GesturePhase.BEGIN, 4);
    for (let i = 0; i < 20; i++)
        send(recognizer, GesturePhase.UPDATE, 4, 0, -10);
    assert.equal(gestures.length, 1);

    send(recognizer, GesturePhase.BEGIN, 4);
    for (let i = 0; i < 5; i++)
        send(recognizer, GesturePhase.UPDATE, 4, 0, -10);
    send(recognizer, GesturePhase.UPDATE, 3, 0, -10);
    send(recognizer, GesturePhase.UPDATE, 4, 0, -10);
    send(recognizer, GesturePhase.END, 4);

    assert.equal(gestures.length, 1);
});

test('reset discards an in-progress gesture', () => {
    const {recognizer, gestures} = makeRecognizer();
    send(recognizer, GesturePhase.BEGIN, 4);
    for (let i = 0; i < 5; i++)
        send(recognizer, GesturePhase.UPDATE, 4, 0, -10);
    recognizer.reset();
    send(recognizer, GesturePhase.UPDATE, 4, 0, -10);
    send(recognizer, GesturePhase.END, 4);

    assert.equal(gestures.length, 0);
});

test('non-finite deltas are treated as zero', () => {
    const {recognizer, gestures} = makeRecognizer();
    send(recognizer, GesturePhase.BEGIN, 4);
    send(recognizer, GesturePhase.UPDATE, 4, Number.NaN, Number.POSITIVE_INFINITY);
    send(recognizer, GesturePhase.END, 4);

    assert.equal(gestures.length, 0);
});

test('classification threshold is kept below GNOME Shell 51 threshold', () => {
    const {recognizer} = makeRecognizer({classifyThreshold: 100});
    assert.equal(recognizer.classifyThreshold, 15);
});

test('strictness presets map to documented ratios', () => {
    assert.deepEqual(STRICTNESS_PRESETS.map(p => p.ratio), [1, 2, 3]);
    assert.deepEqual([0, 1, 2].map(ratioForStrictness), [1, 2, 3]);
});

test('invalid strictness falls back to balanced', () => {
    assert.equal(ratioForStrictness(-1), 2);
    assert.equal(ratioForStrictness(9), 2);
    assert.equal(ratioForStrictness('nope'), 2);
});

test('strictness changes whether a diagonal swipe is claimed', () => {
    const relaxed = makeRecognizer({diagonalRatio: ratioForStrictness(0)});
    send(relaxed.recognizer, GesturePhase.BEGIN, 4);
    assert.equal(send(relaxed.recognizer, GesturePhase.UPDATE, 4, 10, 15), true);
    send(relaxed.recognizer, GesturePhase.END, 4);

    const balanced = makeRecognizer({diagonalRatio: ratioForStrictness(1)});
    send(balanced.recognizer, GesturePhase.BEGIN, 4);
    assert.equal(send(balanced.recognizer, GesturePhase.UPDATE, 4, 10, 15), false);
    send(balanced.recognizer, GesturePhase.END, 4);
});

test('configuration is validated', () => {
    assert.throws(() => new GestureRecognizer({actionThreshold: 0}), TypeError);
    assert.throws(() => new GestureRecognizer({fingerCount: 0}), TypeError);
    assert.throws(() => new GestureRecognizer({diagonalRatio: 0}), TypeError);
    assert.throws(() => new GestureRecognizer({onGesture: null}), TypeError);
});
