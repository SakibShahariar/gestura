// Keeps the minimized-window history in sync with Mutter.
//
// Mutter 51 has no global `window-minimized` signal, but Meta.Display emits
// `window-created` and each Meta.Window emits `notify::minimized` and
// `unmanaged`. The tracker combines those into a system-wide view.
//
// Shell specifics are injected so the state machine can be unit-tested.

export class WindowTracker {
    constructor({display, history, isEligible = () => true}) {
        if (!display || typeof display.connect !== 'function' ||
            typeof display.disconnect !== 'function' ||
            typeof display.list_all_windows !== 'function')
            throw new TypeError('display must support connect/disconnect/list_all_windows');
        if (!history || typeof history.push !== 'function' ||
            typeof history.remove !== 'function')
            throw new TypeError('history must support push/remove');
        if (typeof isEligible !== 'function')
            throw new TypeError('isEligible must be a function');

        this._display = display;
        this._history = history;
        this._isEligible = isEligible;
        this._windows = new Map();
        this._displayId = null;
    }

    start() {
        if (this._displayId !== null)
            return;

        this._displayId = this._display.connect(
            'window-created', this._onWindowCreated.bind(this));

        // Windows opened before the extension was enabled still need tracking.
        for (const window of this._display.list_all_windows())
            this._track(window, true);
    }

    stop() {
        if (this._displayId !== null) {
            this._display.disconnect(this._displayId);
            this._displayId = null;
        }
        for (const [window, ids] of this._windows) {
            window.disconnect(ids.minimizedId);
            window.disconnect(ids.unmanagedId);
            this._history.remove(window);
        }
        this._windows.clear();
    }

    _onWindowCreated(display, window) {
        this._track(window, false);
    }

    _track(window, seed) {
        if (!window || this._windows.has(window) || !this._isEligible(window))
            return;

        const ids = {
            minimizedId: window.connect(
                'notify::minimized', this._onMinimizedChanged.bind(this, window)),
            unmanagedId: window.connect(
                'unmanaged', this._onUnmanaged.bind(this, window)),
        };
        this._windows.set(window, ids);

        if (seed && this._isMinimized(window))
            this._history.push(window);
    }

    _onMinimizedChanged(window) {
        if (this._isMinimized(window))
            this._history.push(window);
        else
            this._history.remove(window);
    }

    _onUnmanaged(window) {
        const ids = this._windows.get(window);
        if (!ids)
            return;
        window.disconnect(ids.minimizedId);
        window.disconnect(ids.unmanagedId);
        this._windows.delete(window);
        this._history.remove(window);
    }

    _isMinimized(window) {
        try {
            return window.minimized === true;
        } catch {
            return false;
        }
    }
}
