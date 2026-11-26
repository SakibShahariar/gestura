import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {STRICTNESS_PRESETS} from './gestureRecognizer.js';

export default class GesturaPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window.set_default_size(560, 520);

        const page = new Adw.PreferencesPage();
        window.add(page);

        const gestures = new Adw.PreferencesGroup({
            title: 'Gestures',
            description: 'Four-finger vertical swipes. Nothing is claimed in overview or other input modes.',
        });
        page.add(gestures);
        gestures.add(this._switch(settings, 'enable-minimize',
            'Minimize on swipe down',
            'Minimizes the focused normal or dialog window.'));
        gestures.add(this._switch(settings, 'enable-restore',
            'Restore on swipe up',
            'Restores the most recently minimized window, however it was minimized.'));

        const threshold = new Adw.SpinRow({
            title: 'Gesture sensitivity',
            subtitle: 'Distance required before an action fires (40-300 units).',
            adjustment: new Gtk.Adjustment({
                lower: 40,
                upper: 300,
                step_increment: 10,
                value: settings.get_int('action-threshold'),
            }),
        });
        gestures.add(threshold);
        settings.bind('action-threshold', threshold.adjustment, 'value',
            Gio.SettingsBindFlags.DEFAULT);

        const strictness = new Adw.ComboRow({
            title: 'Vertical swipe strictness',
            subtitle: 'Relaxed accepts more diagonal movement; Strict requires a straighter swipe.',
            model: new Gtk.StringList({
                strings: STRICTNESS_PRESETS.map(preset => preset.label),
            }),
        });
        gestures.add(strictness);
        settings.bind('diagonal-strictness', strictness, 'selected',
            Gio.SettingsBindFlags.DEFAULT);

        const behavior = new Adw.PreferencesGroup({
            title: 'Behavior',
            description: 'What happens after a window is restored.',
        });
        page.add(behavior);
        behavior.add(this._switch(settings, 'focus-restored-window',
            'Focus restored windows',
            'Off by default; leave focus handling to GNOME.'));

        const feedback = new Adw.PreferencesGroup({
            title: 'Feedback',
            description: 'Confirmation for performed and skipped actions.',
        });
        page.add(feedback);
        feedback.add(this._switch(settings, 'show-osd',
            'Show on-screen feedback',
            'Display an icon when a gesture performs or skips an action.'));

        const about = new Adw.PreferencesGroup({title: 'About'});
        page.add(about);
        const info = new Adw.ActionRow({
            title: `Gestura ${this.metadata['version-name']}`,
            subtitle: 'GNOME Shell 51 · Wayland · GPL-3.0-or-later',
        });
        info.add_suffix(new Gtk.LinkButton({
            label: 'Repository',
            uri: 'https://github.com/SakibShahariar/gestura',
        }));
        about.add(info);
    }

    _switch(settings, key, title, subtitle) {
        const row = new Adw.SwitchRow({title, subtitle});
        settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
        return row;
    }
}
