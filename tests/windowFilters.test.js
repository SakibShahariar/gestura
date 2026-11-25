import assert from 'node:assert/strict';
import test from 'node:test';

import {isWindowEligible} from '../windowFilters.js';

const TYPES = [0, 3, 4]; // Meta.WindowType NORMAL / DIALOG / MODAL_DIALOG on GNOME 51

function window(props = {}) {
    return {
        type: 0,
        fullscreen: false,
        canMinimize: true,
        wmClass: 'org.gnome.Terminal',
        get_window_type() { return this.type; },
        get_wm_class() { return this.wmClass; },
        can_minimize() { return this.canMinimize; },
        get is_fullscreen() { return this.fullscreen; },
        ...props,
    };
}

test('accepts eligible normal windows by default', () => {
    assert.equal(isWindowEligible(window(), {eligibleTypes: TYPES}), true);
});

test('rejects ineligible window types and non-minimizable windows', () => {
    assert.equal(isWindowEligible(window({type: 8}), {eligibleTypes: TYPES}), false);
    assert.equal(isWindowEligible(window({canMinimize: false}), {eligibleTypes: TYPES}), false);
});

test('skips fullscreen windows only when enabled', () => {
    const fullscreen = window({fullscreen: true});
    assert.equal(isWindowEligible(fullscreen, {eligibleTypes: TYPES}), true);
    assert.equal(isWindowEligible(fullscreen, {
        eligibleTypes: TYPES,
        excludeFullscreen: true,
    }), false);
});

test('skips apps matched by WM class, case-insensitively', () => {
    const terminal = window({wmClass: 'org.gnome.Terminal'});
    assert.equal(isWindowEligible(terminal, {
        eligibleTypes: TYPES,
        excludedApps: [' org.gnome.terminal ', 'firefox'],
    }), false);
    assert.equal(isWindowEligible(terminal, {
        eligibleTypes: TYPES,
        excludedApps: ['firefox'],
    }), true);
});

test('handles missing, destroyed, and throwing windows safely', () => {
    assert.equal(isWindowEligible(null, {eligibleTypes: TYPES}), false);
    assert.equal(isWindowEligible(window({is_destroyed: () => true}), {eligibleTypes: TYPES}), false);
    const broken = window();
    broken.get_window_type = () => { throw new Error('gone'); };
    assert.equal(isWindowEligible(broken, {eligibleTypes: TYPES}), false);
});
