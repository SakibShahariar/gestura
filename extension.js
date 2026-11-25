import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {feedbackFor} from './actionFeedback.js';
import {formatDiagnosticLine} from './diagnostics.js';
import {
    Direction,
    GesturePhase,
    GestureRecognizer,
    ratioForStrictness,
} from './gestureRecognizer.js';
import {WindowActions} from './windowActions.js';
import {WindowHistory} from './windowHistory.js';
import {WindowTracker} from './windowTracker.js';

const ELIGIBLE_TYPES = [
    Meta.WindowType.NORMAL,
    Meta.WindowType.DIALOG,
    Meta.WindowType.MODAL_DIALOG,
];

export default class GesturaExtension extends Extension {
    enable() {
        this._settings = this.getSettings();

        this._history = new WindowHistory({
            isStale: window => this._isStale(window),
        });
        this._actions = new WindowActions({
            history: this._history,
            isEligible: window => this._isEligible(window),
        });
        this._tracker = new WindowTracker({
            display: global.display,
            history: this._history,
            isEligible: window => this._isEligible(window),
        });
        this._tracker.start();
        this._recognizer = new GestureRecognizer({
            actionThreshold: this._settings.get_int('action-threshold'),
            diagonalRatio: ratioForStrictness(
                this._settings.get_int('diagonal-strictness')),
            onGesture: ({direction, distance, time}) =>
                this._onGesture(direction, distance, time),
        });

        this._settingsId = this._settings.connect('changed::action-threshold', () => {
            this._recognizer.actionThreshold =
                this._settings.get_int('action-threshold');
        });
        this._strictnessId = this._settings.connect('changed::diagonal-strictness', () => {
            this._recognizer.diagonalRatio = ratioForStrictness(
                this._settings.get_int('diagonal-strictness'));
        });

        // Capture phase runs before GNOME Shell's own swipe trackers, which
        // listen on the stage's bubble-phase `'event::touchpad'` signal.
        this._eventId = global.stage.connect(
            'captured-event::touchpad', this._onTouchpadEvent.bind(this));
    }

    disable() {
        if (this._eventId)
            global.stage.disconnect(this._eventId);
        this._eventId = null;

        if (this._settingsId)
            this._settings.disconnect(this._settingsId);
        this._settingsId = null;
        if (this._strictnessId)
            this._settings.disconnect(this._strictnessId);
        this._strictnessId = null;

        this._recognizer?.reset();
        this._recognizer = null;
        this._tracker?.stop();
        this._tracker = null;
        this._history?.reset();
        this._history = null;
        this._actions = null;
        this._settings = null;
    }

    _onTouchpadEvent(actor, event) {
        if (event.type() !== Clutter.EventType.TOUCHPAD_SWIPE)
            return Clutter.EVENT_PROPAGATE;

        const phase = this._phaseFor(event.get_gesture_phase());
        const fingerCount = event.get_touchpad_gesture_finger_count();
        const [dx, dy] = event.get_gesture_motion_delta_unaccelerated();
        let claimed = false;

        // Leave overview, lock-screen and modal input modes untouched.
        if (phase && (Main.actionMode & Shell.ActionMode.NORMAL) !== 0) {
            claimed = this._recognizer.handleEvent({
                phase,
                fingerCount,
                dx,
                dy,
                time: event.get_time(),
            });
        }

        if (this._settings.get_boolean('verbose-logging')) {
            console.log(formatDiagnosticLine({
                phase: phase ?? 'UNKNOWN',
                fingerCount,
                dx,
                dy,
                claimed,
                mode: Main.actionMode,
            }));
        }

        return claimed ? Clutter.EVENT_STOP : Clutter.EVENT_PROPAGATE;
    }

    _phaseFor(phase) {
        switch (phase) {
        case Clutter.TouchpadGesturePhase.BEGIN:
            return GesturePhase.BEGIN;
        case Clutter.TouchpadGesturePhase.UPDATE:
            return GesturePhase.UPDATE;
        case Clutter.TouchpadGesturePhase.END:
            return GesturePhase.END;
        case Clutter.TouchpadGesturePhase.CANCEL:
            return GesturePhase.CANCEL;
        default:
            return null;
        }
    }

    _onGesture(direction, distance, time) {
        let action = null;
        if (direction === Direction.DOWN &&
            this._settings.get_boolean('enable-minimize'))
            action = 'minimize';
        else if (direction === Direction.UP &&
            this._settings.get_boolean('enable-restore'))
            action = 'restore';

        if (!action) {
            console.log(`Gestura: swipe ${direction} ignored (disabled in preferences)`);
            return;
        }

        const focusWindow = action === 'restore' &&
            this._settings.get_boolean('focus-restored-window')
            ? window => window.focus(global.get_current_time())
            : null;

        const performed = action === 'minimize'
            ? this._actions.minimizeFocused(global.display)
            : this._actions.restoreLast({focusWindow});

        console.log(`Gestura: swipe ${direction} -> ${action} ` +
            `${performed ? 'performed' : 'no-op'} ` +
            `(distance=${distance.toFixed(1)}, time=${time})`);

        const feedback = feedbackFor(action, performed);
        this._showFeedback(feedback);
    }

    _showFeedback({iconName, label}) {
        if (!this._settings.get_boolean('show-osd') || !Main.osdWindowManager)
            return;

        try {
            Main.osdWindowManager.showAll(
                Gio.Icon.new_for_string(iconName), label, null, -1);
        } catch (error) {
            console.log(`Gestura: could not show OSD feedback: ${error}`);
        }
    }

    _isEligible(window) {
        try {
            if (window.is_destroyed?.())
                return false;
            if (!ELIGIBLE_TYPES.includes(window.get_window_type()))
                return false;
            return window.can_minimize() === true;
        } catch {
            return false;
        }
    }

    _isStale(window) {
        try {
            if (window.is_destroyed?.())
                return true;
            return window.minimized !== true;
        } catch {
            return true;
        }
    }
}
