import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class GesturaPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage();
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: 'Four-finger gestures',
            description: 'Both actions are disabled in overview and other input modes.',
        });
        page.add(group);

        const minimize = new Adw.SwitchRow({
            title: 'Swipe down minimizes the focused window',
            subtitle: 'Requires an eligible window to be focused.',
        });
        settings.bind('enable-minimize', minimize, 'active',
            Gio.SettingsBindFlags.DEFAULT);
        group.add(minimize);

        const restore = new Adw.SwitchRow({
            title: 'Swipe up restores the last minimized window',
            subtitle: 'Restores the most recently minimized window, however it was minimized.',
        });
        settings.bind('enable-restore', restore, 'active',
            Gio.SettingsBindFlags.DEFAULT);
        group.add(restore);

        const threshold = new Adw.SpinRow({
            title: 'Gesture sensitivity',
            subtitle: 'Distance required before an action runs (unaccelerated units).',
            adjustment: new Gtk.Adjustment({
                lower: 40,
                upper: 300,
                step_increment: 10,
                value: settings.get_int('action-threshold'),
            }),
        });
        group.add(threshold);
        settings.bind('action-threshold', threshold.adjustment, 'value',
            Gio.SettingsBindFlags.DEFAULT);

        const exclusions = new Adw.PreferencesGroup({
            title: 'Exclusions',
            description: 'Excluded windows are never minimized and never enter the restore history.',
        });
        page.add(exclusions);

        const fullscreen = new Adw.SwitchRow({
            title: 'Skip fullscreen windows',
            subtitle: 'Off by default.',
        });
        settings.bind('exclude-fullscreen', fullscreen, 'active',
            Gio.SettingsBindFlags.DEFAULT);
        exclusions.add(fullscreen);

        const apps = new Adw.EntryRow({
            title: 'Excluded applications',
            subtitle: 'Comma-separated WM class names, for example: firefox, org.gnome.Nautilus',
        });
        apps.set_text(settings.get_strv('excluded-apps').join(', '));
        apps.connect('changed', () => {
            const values = apps.get_text().split(',').map(value => value.trim()).filter(Boolean);
            settings.set_strv('excluded-apps', values);
        });
        exclusions.add(apps);
    }
}
