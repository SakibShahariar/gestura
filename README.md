# Gestura

A GNOME Shell extension that turns **four-finger touchpad swipes** into window
actions. No daemon, no root access, no broad input-device permissions — just an
in-process GJS extension.

## Features

| Gesture | Action |
| --- | --- |
| Four-finger swipe down | Minimize the focused, eligible window (never closes it) |
| Four-finger swipe up | Restore the most recently minimized window (LIFO) |
| Four-finger swipe left/right | Move the focused window to the previous/next workspace (opt-in) |

The restore stack includes windows minimized **by any method** — Gestura watches
Mutter's window signals, so clicking a minimize button or using Alt+F7 also adds
them. Restored and closed windows are removed, and an empty stack simply does
nothing.

Three-finger gestures, cancelled gestures, diagonal swipes (depending on the
strictness setting), and non-`NORMAL` input modes are left to GNOME. Horizontal
swipes are also left to GNOME while workspace moves are disabled.

## Requirements

- GNOME Shell **51** on **Wayland**
- A touchpad that reports four-finger swipe gestures through libinput
- `glib-compile-schemas` for building the bundle (provided by GLib tools)

Only GNOME Shell 51 on Wayland is supported; other versions and X11 are not.
For API details and verification evidence, see
[docs/wayland-gesture-investigation.md](docs/wayland-gesture-investigation.md).

## Installation

### 1. Build and install a bundle (recommended)

```sh
git clone https://github.com/SakibShahariar/gestura.git
cd gestura
python3 scripts/package.py
gnome-extensions install --force gestura@sakibshahariar.github.io.shell-extension.zip
```

GNOME Shell 51 only discovers new extensions **at startup**, so log out and
back in. Then enable the extension:

```sh
gnome-extensions enable gestura@sakibshahariar.github.io
```

### 2. Development install (symlink)

For working directly from the checkout:

```sh
git clone https://github.com/SakibShahariar/gestura.git
ln -s "$PWD/gestura" \
  ~/.local/share/gnome-shell/extensions/gestura@sakibshahariar.github.io
```

Log out and back in, then enable it with `gnome-extensions enable` or in
Extension Manager. After changing the code, log out and back in again to
reload it.

### Enable, disable, update, uninstall

```sh
gnome-extensions enable gestura@sakibshahariar.github.io
gnome-extensions disable gestura@sakibshahariar.github.io
gnome-extensions prefs gestura@sakibshahariar.github.io

# Update: rebuild, install with --force, then log out/in
python3 scripts/package.py
gnome-extensions install --force gestura@sakibshahariar.github.io.shell-extension.zip

# Remove: uninstall, then log out/in
gnome-extensions uninstall gestura@sakibshahariar.github.io
```

## Preferences

Open with `gnome-extensions prefs gestura@sakibshahariar.github.io` or the gear
icon in Extension Manager.

| Setting | Default | Notes |
| --- | --- | --- |
| Minimize on swipe down | On | Requires a focused normal/dialog window |
| Restore on swipe up | On | Restores the newest minimized window |
| Move window on horizontal swipe | Off | Moves the focused window between workspaces |
| Gesture sensitivity | 100 | 40-300 unaccelerated units before an action fires |
| Vertical swipe strictness | Balanced | Relaxed (1.0), Balanced (2.0), Strict (3.0) |
| Focus restored windows | Off | When on, explicitly focuses the restored window |
| Show on-screen feedback | On | Shows an OSD icon when an action runs or is skipped |

All settings are stored in GSettings under
`org.gnome.shell.extensions.gestura` and persist across sessions.

## How it works

A capture-phase handler on the Shell stage sees `TOUCHPAD_SWIPE` events before
GNOME's swipe trackers. A pure state machine classifies four-finger movement,
claims the gesture with `EVENT_STOP`, and runs one action per physical swipe.
Window history is kept separately by tracking window creation and
`notify::minimized` signals.

In `NORMAL` mode Gestura intentionally replaces GNOME's four-finger
swipe-up-to-overview gesture. The overview remains available via Super, the
Activities button, or the hot corner. Enabling horizontal workspace moves also
replaces GNOME's four-finger horizontal workspace switching; with the setting
off, horizontal swipes are left to GNOME. Stricter swipe settings hand more
diagonal gestures back to GNOME's trackers. Workspace moves never wrap around
or create workspaces — an edge is a harmless no-op.

## Troubleshooting

- **Extension not listed after install:** log out and back in; GNOME 51 does
  not rescan extension directories while running.
- **No action on a swipe:** check the gesture switches in Preferences, make
  sure a normal/dialog window has focus, and confirm the swipe is long enough.
  The journal logs each gesture as `performed` or `no-op`.
- **Swipe-up no longer opens Overview:** intentional in normal mode. Likewise,
  enabling horizontal workspace moves replaces GNOME's own four-finger
  horizontal workspace switching; turn the setting off to restore it.
- **Preferences fail to open:** reinstall the bundle, then reopen Preferences;
  the prefs window is loaded from disk each time it opens.
- **Inspect logs:** `journalctl --user -f | grep Gestura`.

## Development

```sh
npm test                             # pure logic unit tests
npm run benchmark                    # recognizer hot-path timing + CI guard
python3 scripts/package.py           # reproducible distributable ZIP
```

The packaging script uses an explicit runtime-file list, so tests, docs, CI
configuration, and other development-only files are never shipped. Project
rules live in [AGENTS.md](AGENTS.md); the roadmap is in
[GitHub Issues](https://github.com/SakibShahariar/gestura/issues).

## License

Gestura is licensed under the GNU General Public License, version 3 or (at your
option) any later version. See [LICENSE](LICENSE).
