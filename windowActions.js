// Action dispatch, deliberately separate from gesture recognition and from
// the history container. All Shell/GJS specifics are passed in by the caller.

export class WindowActions {
    constructor({history, isEligible}) {
        if (!history || typeof history.push !== 'function')
            throw new TypeError('history must be a WindowHistory');
        if (typeof isEligible !== 'function')
            throw new TypeError('isEligible must be a function');

        this._history = history;
        this._isEligible = isEligible;
    }

    /** Minimize the focused window, if it is suitable. Returns success. */
    minimizeFocused(display) {
        const window = display?.get_focus_window?.();
        if (!window || !this._isEligible(window))
            return false;

        try {
            if (window.can_minimize?.() === false)
                return false;
            window.minimize();
            // WindowTracker observes notify::minimized and owns the history.
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Restore the most recently minimized window. Returns success.
     * `focusWindow`, when provided, is called with the restored window after
     * unminimizing; failures there never invalidate the restore itself.
     */
    restoreLast({focusWindow = null} = {}) {
        const window = this._history.pop();
        if (!window)
            return false;

        try {
            window.unminimize();
        } catch {
            return false;
        }

        if (focusWindow) {
            try {
                focusWindow(window);
            } catch {
                // Focusing is optional; the restore already succeeded.
            }
        }
        return true;
    }
}
