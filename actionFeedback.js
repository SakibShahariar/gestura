// Maps action outcomes to an icon name and label for GNOME Shell's OSD.
// Pure so it can be unit-tested without GJS.

export function feedbackFor(action, performed) {
    if (action === 'minimize') {
        return performed
            ? {iconName: 'window-minimize-symbolic', label: 'Window minimized'}
            : {iconName: 'dialog-information-symbolic', label: 'No window to minimize'};
    }
    if (action === 'restore') {
        return performed
            ? {iconName: 'window-restore-symbolic', label: 'Window restored'}
            : {iconName: 'dialog-information-symbolic', label: 'No window to restore'};
    }
    return {iconName: 'dialog-information-symbolic', label: 'Gesture ignored'};
}
