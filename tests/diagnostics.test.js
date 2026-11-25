import assert from 'node:assert/strict';
import test from 'node:test';

import {formatDiagnosticLine} from '../diagnostics.js';

test('formats a claimed swipe event', () => {
    const line = formatDiagnosticLine({
        phase: 'update',
        fingerCount: 4,
        dx: 0.3,
        dy: -0.45,
        claimed: true,
        mode: 1,
    });

    assert.match(line, /^Gestura\[verbose\]: SWIPE /);
    assert.match(line, /phase=update/);
    assert.match(line, /fingers=4/);
    assert.match(line, /dx=0\.30/);
    assert.match(line, /dy=-0\.45/);
    assert.match(line, /claimed=true/);
    assert.match(line, /mode=1/);
});

test('marks unclaimed events and unknown phases', () => {
    const line = formatDiagnosticLine({
        phase: 'UNKNOWN',
        fingerCount: 3,
        dx: 0,
        dy: 0,
        claimed: false,
        mode: 2,
    });

    assert.match(line, /phase=UNKNOWN/);
    assert.match(line, /fingers=3/);
    assert.match(line, /claimed=false/);
});

test('non-finite deltas are printed as-is', () => {
    const line = formatDiagnosticLine({
        phase: 'begin',
        fingerCount: 4,
        dx: Number.NaN,
        dy: Infinity,
        claimed: false,
        mode: 1,
    });

    assert.match(line, /dx=NaN/);
    assert.match(line, /dy=Infinity/);
});
