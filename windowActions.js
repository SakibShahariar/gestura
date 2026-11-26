// Action dispatch, deliberately separate from gesture recognition and from
// the history container. All Shell/GJS specifics are passed in by the caller.

import {Direction} from './gestureRecognizer.js';

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
     * Move the focused window to the adjacent workspace. No wrap-around and
     * no workspace creation at the edges: those are harmless no-ops.
     */
    moveFocusedToWorkspace(direction, display, workspaceManager) {
        const window = display?.get_focus_window?.();
        if (!window || !this._isEligible(window))
            return false;

        try {
            const count = workspaceManager?.get_n_workspaces?.() ?? 0;
            const current = workspaceManager?.get_active_workspace_index?.() ?? -1;
            const target = current + (direction === Direction.LEFT ? -1 : 1);
            if (current < 0 || target < 0 || target >= count)
                return false;

            const workspace = workspaceManager.get_workspace_by_index(target);
            if (!workspace)
                return false;

            window.change_workspace(workspace);
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
