// Pure gesture-recognition logic. No GJS or GNOME Shell imports so that it can
// be tested independently with `node --test`.

export const GesturePhase = Object.freeze({
    BEGIN: 'begin',
    UPDATE: 'update',
    END: 'end',
    CANCEL: 'cancel',
});

export const Direction = Object.freeze({
    UP: 'up',
    DOWN: 'down',
});

const State = Object.freeze({
    IDLE: 'idle',
    PENDING: 'pending',
    HANDLING: 'handling',
    IGNORED: 'ignored',
});

/**
 * Recognizes four-finger vertical touchpad swipes.
 *
 * The recognizer is deliberately kept independent from event sources and
 * actions. `handleEvent()` returns whether the event was claimed by Gestura;
 * the Shell-facing code translates that into Clutter.EVENT_STOP / PROPAGATE.
 */
export class GestureRecognizer {
    constructor({
        fingerCount = 4,
        classifyThreshold = 12,
        actionThreshold = 100,
        diagonalRatio = 2,
        onGesture = () => {},
    } = {}) {
        if (!Number.isInteger(fingerCount) || fingerCount < 1)
            throw new TypeError('fingerCount must be a positive integer');
        if (!Number.isFinite(actionThreshold) || actionThreshold <= 0)
            throw new TypeError('actionThreshold must be a positive number');
        if (!Number.isFinite(diagonalRatio) || diagonalRatio < 1)
            throw new TypeError('diagonalRatio must be a number >= 1');
        if (typeof onGesture !== 'function')
            throw new TypeError('onGesture must be a function');

        this.fingerCount = fingerCount;
        // GNOME Shell 51's own swipe tracker claims vertical swipes after 16
        // unaccelerated units. Classify earlier so Gestura can claim the
        // gesture before Shell's bubble-phase handler ever sees it.
        this.classifyThreshold = Math.min(Math.max(classifyThreshold, 1), 15);
        this.actionThreshold = actionThreshold;
        this.diagonalRatio = diagonalRatio;
        this.onGesture = onGesture;

        this.reset();
    }

    reset() {
        this._state = State.IDLE;
        this._cumulativeX = 0;
        this._cumulativeY = 0;
        this._distance = 0;
        this._direction = null;
        this._fired = false;
        this._claimed = false;
    }

    /**
     * @param {object} event
     * @param {string} event.phase one of GesturePhase
     * @param {number} event.fingerCount number of fingers reported by libinput
     * @param {number} [event.dx] unaccelerated horizontal delta
     * @param {number} [event.dy] unaccelerated vertical delta
     * @param {number} [event.time] event timestamp (ms)
     * @returns {boolean} true when Gestura claims the event
     */
    handleEvent({phase, fingerCount, dx = 0, dy = 0, time = 0}) {
        if (!Object.values(GesturePhase).includes(phase))
            return false;

        const deltaX = this._finite(dx);
        const deltaY = this._finite(dy);

        if (phase === GesturePhase.BEGIN) {
            this.reset();
            if (fingerCount !== this.fingerCount) {
                this._state = State.IGNORED;
                return false;
            }
            this._state = State.PENDING;
            return false;
        }

        if (this._state === State.IGNORED) {
            if (phase === GesturePhase.END || phase === GesturePhase.CANCEL)
                this.reset();
            return false;
        }

        if (this._state === State.IDLE)
            return false;

        if (fingerCount !== this.fingerCount) {
            // A finger was added or lifted mid-gesture: it is no longer ours.
            const claimed = this._claimed;
            this.reset();
            return claimed;
        }

        if (phase === GesturePhase.UPDATE)
            return this._handleUpdate(deltaX, deltaY, time);

        if (phase === GesturePhase.END) {
            if (this._state !== State.HANDLING) {
                this.reset();
                return false;
            }

            // Normally the threshold is crossed on UPDATE, but keep the
            // check here so a final accumulation cannot be lost.
            this._maybeFire(time);
            this.reset();
            return true;
        }

        // CANCEL: consume the tail of a gesture we claimed, but never act.
        const claimed = this._state === State.HANDLING;
        this.reset();
        return claimed;
    }

    _handleUpdate(dx, dy, time) {
        if (this._state === State.PENDING) {
            this._cumulativeX += dx;
            this._cumulativeY += dy;

            const distance = Math.hypot(this._cumulativeX, this._cumulativeY);
            if (distance < this.classifyThreshold)
                return false;

            const vertical = Math.abs(this._cumulativeY) >=
                this.diagonalRatio * Math.abs(this._cumulativeX);
            if (!vertical) {
                // Horizontal or diagonal: leave it to GNOME.
                this.reset();
                this._state = State.IGNORED;
                return false;
            }

            this._direction = this._cumulativeY < 0 ? Direction.UP : Direction.DOWN;
            this._state = State.HANDLING;
            this._claimed = true;
        }

        this._distance += dy;
        this._maybeFire(time);
        return true;
    }

    _maybeFire(time) {
        if (this._fired || this._state !== State.HANDLING || !this._direction)
            return;

        const travelled = this._direction === Direction.UP
            ? -this._distance
            : this._distance;

        if (travelled >= this.actionThreshold) {
            this._fired = true;
            this.onGesture({
                direction: this._direction,
                distance: travelled,
                time,
            });
        }
    }

    _finite(value) {
        const number = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(number) ? number : 0;
    }
}
