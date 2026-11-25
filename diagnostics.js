// Pure formatter for optional verbose gesture logging.

export function formatDiagnosticLine({
    phase,
    fingerCount,
    dx,
    dy,
    claimed,
    mode,
}) {
    const number = value => Number.isFinite(value) ? value.toFixed(2) : String(value);
    return `Gestura[verbose]: SWIPE phase=${phase} ` +
        `fingers=${fingerCount} dx=${number(dx)} dy=${number(dy)} ` +
        `claimed=${Boolean(claimed)} mode=${mode}`;
}
