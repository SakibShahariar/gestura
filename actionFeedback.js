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
    if (action === 'workspace-left' || action === 'workspace-right') {
        const left = action === 'workspace-left';
        return performed
            ? {
                iconName: left ? 'go-previous-symbolic' : 'go-next-symbolic',
                label: left ? 'Window moved left' : 'Window moved right',
            }
            : {
                iconName: 'dialog-information-symbolic',
                label: 'No workspace to move to',
            };
    }
    return {iconName: 'dialog-information-symbolic', label: 'Gesture ignored'};
}
