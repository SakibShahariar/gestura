# Gestura

A GNOME Shell extension for customizable multi-finger touchpad gestures, starting with two window-management actions.

## Initial gestures

| Gesture | Action |
| --- | --- |
| Four-finger swipe down | Minimize the focused window |
| Four-finger swipe up | Restore the most recently minimized window |

These are the only gestures in the initial scope. Workspace switching and other gesture actions are not part of the default feature set.

## Project status

**Early development — gesture capture is not implemented yet.**

The first engineering task is to verify that a GNOME Shell extension can reliably recognize and claim four-finger vertical touchpad swipes on GNOME Wayland without breaking GNOME's built-in gestures. GNOME/Mutter gesture handling has changed across releases, and built-in four-finger behavior can conflict with custom actions.

The initial development target is GNOME Shell 51 on Wayland. Compatibility with other GNOME versions and X11 will be stated only after testing.

## Design goals

- Prefer an in-process GNOME Shell extension using GJS.
- Avoid a background daemon, root access, or broad input-device permissions unless investigation proves they are necessary.
- Keep gesture recognition separate from window actions.
- Handle cancelled gestures, destroyed windows, and extension disable/re-enable safely.
- Provide native GNOME preferences for the supported actions and sensitivity.
- Never claim support for an untested GNOME version or touchpad.

## Development

See [AGENTS.md](AGENTS.md) for project rules and development expectations.

The implementation roadmap is tracked in [GitHub Issues](https://github.com/SakibShahariar/gestura/issues).

## License

Gestura is licensed under the GNU General Public License, version 3 or (at your option) any later version. See [LICENSE](LICENSE).
