# Gestura

A GNOME Shell extension for customizable multi-finger touchpad gestures, starting with two window-management actions.

## Initial gestures

| Gesture | Action |
| --- | --- |
| Four-finger swipe down | Minimize the focused window |
| Four-finger swipe up | Restore the most recently minimized window |

These are the only gestures in the initial scope. Workspace switching and other gesture actions are not part of the default feature set.

## Project status

**Early development — gesture recognition is implemented; window actions are not wired up yet.**

A capture-phase GJS handler on the Shell stage feeds a pure, unit-tested recognizer that claims four-finger vertical swipes while leaving three-finger, horizontal, diagonal, cancelled, and modal-mode gestures to GNOME. Recognized gestures are currently logged to the Shell journal; minimizing and restoring windows are tracked in issues #3 and #4.

In `NORMAL` mode, Gestura intentionally replaces GNOME's four-finger swipe-up-to-overview gesture. The overview remains available via the keyboard, hot corner, and Activities button. Three-finger and four-finger horizontal gestures are untouched.

The initial development target is GNOME Shell 51 on Wayland. No other GNOME version or X11 support is claimed. Four-finger up/down recognition has been verified on a live GNOME 51 Wayland session with a physical touchpad. See [docs/wayland-gesture-investigation.md](docs/wayland-gesture-investigation.md) for API evidence and the verification checklist.

## Design goals

- Prefer an in-process GNOME Shell extension using GJS.
- Avoid a background daemon, root access, or broad input-device permissions unless investigation proves they are necessary.
- Keep gesture recognition separate from window actions.
- Handle cancelled gestures, destroyed windows, and extension disable/re-enable safely.
- Provide native GNOME preferences for the supported actions and sensitivity.
- Never claim support for an untested GNOME version or touchpad.

## Development

Run the recognizer unit tests with:

```sh
npm test
```

To build an installable bundle, include the helper module explicitly — `gnome-extensions pack` does not pick up arbitrary `.js` files on its own:

```sh
gnome-extensions pack --extra-source=gestureRecognizer.js
gnome-extensions install --force gestura@sakibshahariar.github.io.shell-extension.zip
```

GNOME Shell 51 discovers newly installed extensions only at startup, so log out and back in after installing.

See [AGENTS.md](AGENTS.md) for project rules and development expectations. The implementation roadmap is tracked in [GitHub Issues](https://github.com/SakibShahariar/gestura/issues).

## License

Gestura is licensed under the GNU General Public License, version 3 or (at your option) any later version. See [LICENSE](LICENSE).
