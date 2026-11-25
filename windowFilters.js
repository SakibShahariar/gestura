// Pure window-eligibility filter. GJS/Shell specifics are supplied by the
// caller so the rules can be tested independently.

export function isWindowEligible(window, {
    eligibleTypes = [],
    excludeFullscreen = false,
    excludedApps = [],
} = {}) {
    try {
        if (!window)
            return false;
        if (typeof window.is_destroyed === 'function' && window.is_destroyed())
            return false;
        if (!eligibleTypes.includes(window.get_window_type?.()))
            return false;
        if (excludeFullscreen && window.is_fullscreen === true)
            return false;
        if (window.can_minimize?.() !== true)
            return false;

        const wmClass = String(window.get_wm_class?.() ?? '').toLowerCase();
        const excluded = excludedApps
            .map(app => String(app).trim().toLowerCase())
            .filter(Boolean);
        return !excluded.includes(wmClass);
    } catch {
        return false;
    }
}
