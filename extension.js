import Clutter from 'gi://Clutter';
import Shell from 'gi://Shell';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {GestureRecognizer, GesturePhase} from './gestureRecognizer.js';

export default class GesturaExtension extends Extension {
    enable() {
        this._recognizer = new GestureRecognizer({
            onGesture: ({direction, distance, time}) =>
                this._onGesture(direction, distance, time),
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
        this._recognizer?.reset();
        this._recognizer = null;
    }

    _onTouchpadEvent(actor, event) {
        if (event.type() !== Clutter.EventType.TOUCHPAD_SWIPE)
            return Clutter.EVENT_PROPAGATE;

        // Leave overview, lock-screen and modal input modes untouched.
        if ((Main.actionMode & Shell.ActionMode.NORMAL) === 0)
            return Clutter.EVENT_PROPAGATE;

        const phase = this._phaseFor(event.get_gesture_phase());
        if (!phase)
            return Clutter.EVENT_PROPAGATE;

        const [dx, dy] = event.get_gesture_motion_delta_unaccelerated();
        const claimed = this._recognizer.handleEvent({
            phase,
            fingerCount: event.get_touchpad_gesture_finger_count(),
            dx,
            dy,
            time: event.get_time(),
        });

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
        // Window actions are tracked separately in #3/#4. Until then, make
        // recognized gestures observable in the Shell log for manual testing.
        console.log(`Gestura: four-finger swipe ${direction} recognized ` +
            `(distance=${distance.toFixed(1)}, time=${time})`);
    }
}
