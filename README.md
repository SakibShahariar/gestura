# Gestura

Four-finger touchpad gestures for GNOME Shell 51 on Wayland: minimize, restore,
and move windows between workspaces. No daemon, root access, or special input
permissions.

## Features

| Gesture | Action |
| --- | --- |
| Four-finger swipe down | Minimize the focused window |
| Four-finger swipe up | Restore the most recently minimized window |
| Four-finger swipe left/right | Move the focused window between workspaces (opt-in) |

The restore stack is LIFO and includes windows minimized by any method. Other
gestures are left to GNOME.

## Requirements

- GNOME Shell **51** on **Wayland**
- A touchpad with four-finger swipe support
- `glib-compile-schemas` to build the bundle

## Installation

Install a bundle:

```sh
git clone https://github.com/SakibShahariar/gestura.git
cd gestura
python3 scripts/package.py
gnome-extensions install --force gestura@sakibshahariar.github.io.shell-extension.zip
```

Or link a checkout for development:

```sh
ln -s "$PWD/gestura" ~/.local/share/gnome-shell/extensions/gestura@sakibshahariar.github.io
```

GNOME 51 discovers extensions only at startup, so **log out and back in**, then:

```sh
gnome-extensions enable gestura@sakibshahariar.github.io
```

Use `gnome-extensions prefs|disable|uninstall gestura@sakibshahariar.github.io`
to manage it. To update, rebuild and reinstall with `--force`, then log out/in.

## Preferences

Open with `gnome-extensions prefs gestura@sakibshahariar.github.io`.

| Setting | Default |
| --- | --- |
| Minimize on swipe down | On |
| Restore on swipe up | On |
| Move window on horizontal swipe | Off |
| Gesture sensitivity | 100 (40-300) |
| Vertical swipe strictness | Balanced (Relaxed / Balanced / Strict) |
| Focus restored windows | Off |
| Show on-screen feedback | On |

In normal mode Gestura replaces swipe-up-to-overview; enabling workspace moves
also replaces GNOME's horizontal workspace switching. The overview and
workspaces stay available via the keyboard and Activities. Details are in
[docs/wayland-gesture-investigation.md](docs/wayland-gesture-investigation.md).

## Troubleshooting

- **Not listed after install:** log out and back in.
- **No action on a swipe:** check the switches, window focus, and swipe length;
  the journal logs `performed` or `no-op`.
- **Inspect logs:** `journalctl --user -f | grep Gestura`.

## Development

```sh
npm test                    # unit tests
npm run benchmark           # recognizer timing + CI guard
python3 scripts/package.py  # distributable ZIP
```

See [AGENTS.md](AGENTS.md) for project rules and
[GitHub Issues](https://github.com/SakibShahariar/gestura/issues) for the roadmap.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).
