# Gestura

A GNOME Shell extension for customizable multi-finger touchpad gestures, starting with two window-management actions.

## Initial gestures

| Gesture | Action |
| --- | --- |
| Four-finger swipe down | Minimize the focused window |
| Four-finger swipe up | Restore the most recently minimized window |

These are the only gestures in the initial scope. Workspace switching and other gesture actions are not part of the default feature set.

## Project status

**Implemented and verified on GNOME Shell 51 / Wayland with a physical touchpad.** A capture-phase GJS handler on the Shell stage feeds a pure, unit-tested recognizer that claims four-finger vertical swipes while leaving three-finger, horizontal, diagonal, cancelled, and modal-mode gestures to GNOME.

- Swipe down minimizes the focused, eligible window (never closes it).
- Swipe up restores the most recently minimized window (LIFO), regardless of how it was minimized. `windowTracker.js` watches `window-created` and each window's `notify::minimized` (Mutter 51 has no global minimize signal); unminimized and closed windows are removed from the stack. An empty history is a no-op.
- Defaults are both actions enabled and a 100-unit sensitivity threshold; see Preferences below.

In `NORMAL` mode, Gestura intentionally replaces GNOME's four-finger swipe-up-to-overview gesture. The overview remains available via the keyboard, hot corner, and Activities button. Three-finger and four-finger horizontal gestures are untouched.

Only GNOME Shell 51 on Wayland is supported/tested. No X11 or other version support is claimed. See [docs/wayland-gesture-investigation.md](docs/wayland-gesture-investigation.md) for API evidence and the verification checklist.

## Design goals

- Prefer an in-process GNOME Shell extension using GJS.
- Avoid a background daemon, root access, or broad input-device permissions unless investigation proves they are necessary.
- Keep gesture recognition separate from window actions.
- Handle cancelled gestures, destroyed windows, and extension disable/re-enable safely.
- Provide native GNOME preferences for the supported actions and sensitivity.
- Never claim support for an untested GNOME version or touchpad.

## Installation

GNOME Shell 51 discovers newly installed extensions only at startup, and Extension Manager 0.7.0 cannot install local extensions. Build and install from source:

```sh
python3 scripts/package.py          # needs glib-compile-schemas
gnome-extensions install --force gestura@sakibshahariar.github.io.shell-extension.zip
```

Log out and back in, then enable “Gestura” in Extension Manager or with:

```sh
gnome-extensions enable gestura@sakibshahariar.github.io
```

## Preferences

Open with `gnome-extensions prefs gestura@sakibshahariar.github.io` or the gear icon in Extension Manager. You can independently disable each gesture, adjust sensitivity (40-300 unaccelerated units, default 100), skip fullscreen windows (off by default), and exclude applications by WM class (empty by default). Excluded windows are never minimized and never enter the restore stack. Settings persist via GSettings.

## Troubleshooting

- **Not listed after install:** log out/in; GNOME 51 does not scan extension directories while running.
- **No action on a swipe:** check the two switches in Preferences, make sure a normal/dialog window has focus, and confirm the swipe is long enough. The Shell journal logs each gesture as `performed` or `no-op`.
- **Swipe-up no longer opens Overview:** intentional in normal mode. Use Super, the Activities button, or the hot corner.
- **Need to remove it:** `gnome-extensions uninstall gestura@sakibshahariar.github.io`, then log out/in.

## Development

```sh
npm test                             # pure logic unit tests
npm run benchmark                    # recognizer hot-path µs/event + CI guard
python3 scripts/package.py           # reproducible distributable ZIP
```

The packaging script uses an explicit file list, so development-only files (tests, docs, CI config) are never shipped. See [AGENTS.md](AGENTS.md) for project rules and [GitHub Issues](https://github.com/SakibShahariar/gestura/issues) for the roadmap.

## License

Gestura is licensed under the GNU General Public License, version 3 or (at your option) any later version. See [LICENSE](LICENSE).
