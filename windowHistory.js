// LIFO history of windows minimized by Gestura. Pure logic with injectable
// validators so it can be tested without GNOME Shell.

export class WindowHistory {
    constructor({isStale = () => false, limit = 32} = {}) {
        if (!Number.isInteger(limit) || limit < 1)
            throw new TypeError('limit must be a positive integer');
        if (typeof isStale !== 'function')
            throw new TypeError('isStale must be a function');

        this.isStale = isStale;
        this.limit = limit;
        this.reset();
    }

    reset() {
        this._windows = [];
    }

    get size() {
        return this._windows.length;
    }

    /** Record a window as the most recently minimized one. */
    push(window) {
        if (!window || this.isStale(window))
            return false;

        // Avoid duplicate entries if a window is minimized again.
        this._windows = this._windows.filter(entry => entry !== window);
        this._windows.unshift(window);
        if (this._windows.length > this.limit)
            this._windows.length = this.limit;
        return true;
    }

    /** Return the newest still-eligible window, discarding stale entries. */
    pop() {
        while (this._windows.length > 0) {
            const window = this._windows.shift();
            if (!this.isStale(window))
                return window;
        }
        return null;
    }
}
