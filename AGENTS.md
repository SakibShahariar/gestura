# AGENTS.md

## Project purpose

Gestura is a GNOME Shell extension for touchpad-driven window management.

The initial scope is deliberately limited to:
- Four-finger swipe down: minimize the focused window.
- Four-finger swipe up: restore the most recently minimized window.

Do not add workspace switching, app launching, browser controls, or other gestures unless the maintainer explicitly requests them.

## Technical direction

- Primary language: JavaScript (GJS).
- Runtime: GNOME Shell extension APIs.
- Initial target: GNOME Shell 51 on Wayland.
- Preferences: GTK4/libadwaita, following the conventions of the target GNOME release.
- Prefer an in-process extension. Do not add a daemon, privileged helper, udev rule, or broad input permissions without evidence that the extension cannot meet its requirements otherwise.
- Treat private Mutter/Clutter APIs as version-sensitive. Document every private API dependency and test it against each declared GNOME Shell version.
- Do not assume a touchpad event can be intercepted merely because it can be observed. Verify event phase, gesture ownership, cancellation, and interaction with GNOME's built-in gesture handlers.

## Implementation rules

- Keep gesture recognition, action dispatch, and window-history tracking separate.
- Handle gesture begin/update/end/cancel states explicitly.
- A single physical gesture must never trigger an action more than once.
- Clean up signal handlers, sources, references, and tracked windows when disabling the extension.
- Handle missing focus, destroyed windows, unmanaged windows, and empty restore history safely.
- Never close a window as a substitute for minimizing it.
- Do not silently change GNOME's built-in gestures or unrelated touchpad behavior.
- Settings must have safe defaults matching the README and must persist across sessions.
- Avoid speculative compatibility claims. Only list versions that have been tested.

## Repository workflow

- Work directly on the default `main` branch. Do not create temporary branches or pull requests unless explicitly requested.
- Inspect the current repository state and relevant files before editing.
- Open a GitHub issue before starting a new fix or feature that does not already have an issue.
- Keep issues focused and actionable, with acceptance criteria.
- Reference the issue number in every commit that implements or closes an issue (for example: `fix: restore minimized windows in LIFO order (#4)`).
- Make complete, coherent changes rather than leaving half-finished scaffolding.
- Update the relevant issue's acceptance checklist when its criteria are met. Do not close an issue until its criteria are verified.
- Run the relevant local checks and inspect GitHub Actions after pushing. A commit with a red CI status is not considered complete.
- Do not claim hardware testing unless it was actually performed on a physical touchpad.

## Documentation

- Keep README concise and accurate.
- Explain user-visible behavior, requirements, installation, and known limitations.
- Update documentation when behavior or supported GNOME versions change.
- Distinguish verified behavior from planned behavior and open questions.
