# Four-finger swipe capture on GNOME 51 / Wayland

This document records the investigation behind issues #1 and #2 and the
implementation choices made in `gestureRecognizer.js` and `extension.js`.

## Test environment

| Item | Value |
| --- | --- |
| Distribution | Fedora Linux 45 (Workstation) |
| GNOME Shell | 51.1, Wayland session |
| Mutter | 51.1 |
| Touchpad | `DLL07A0:01 044E:120B`, libinput capabilities `pointer gesture`, 99x47 mm |
| Sources reviewed | `gnome-shell` tag 51.1, `mutter` tag 51.1 |

A four-finger gesture can be observed **in-process** by a GNOME Shell
extension. No daemon, privileged helper, udev rule, or broad input-device
permission is needed.

## Event path

1. **libinput → Mutter.** `meta-seat-impl.c` translates
   `LIBINPUT_EVENT_GESTURE_SWIPE_{BEGIN,UPDATE,END}` into Clutter
   `TOUCHPAD_SWIPE` events with `BEGIN`, `UPDATE`, `END`, and `CANCEL`
   phases. `CANCEL` is derived from `libinput_event_gesture_get_cancelled()`.
   Finger count comes from `libinput_event_gesture_get_finger_count()` and
   both accelerated and unaccelerated deltas are preserved
   (`meta-seat-impl.c:2700-2740`).
2. **Mutter → Wayland clients.** `meta-wayland-pointer.c:995-1003` forwards
   swipe events to Wayland clients but always returns `EVENT_PROPAGATE`, so
   forwarding to applications does not consume the event for the Shell.
3. **Mutter → Shell stage.** GNOME Shell's own recognizer,
   `TouchpadSwipeGesture` in `js/ui/swipeTracker.js`, listens on the stage:
   `actor.connectObject('event::touchpad', ...)` (line 116-118). It accepts
   gestures with **3 or more** fingers (line 127), reads unaccelerated deltas
   (line 142), classifies orientation after a **16-unit** distance threshold
   (`DRAG_THRESHOLD_DISTANCE`, line 28 and 161), and returns `EVENT_STOP`
   only while it is handling a gesture (line 201-203). A `BEGIN` event resets
   its state (line 124), so a cancelled or unconsumed gesture cannot leak into
   the next one.
4. **Stage handlers are ordered by phase and registration.** Extensions that
   connect to `'captured-event::touchpad'` on `global.stage` run before the
   bubble-phase `'event::touchpad'` handlers used by Shell's swipe trackers.
   Returning `Clutter.EVENT_STOP` from a capture handler prevents the event
   from reaching those bubble handlers. This pattern is already used in
   production on this machine by the installed
   `material-screensaver-gestures@io.github.sakib` extension, which blocks
   swipes with three or more fingers via
   `global.stage.connect('captured-event', ...)`.

`BEGIN` is distinguishable from `UPDATE`/`END`/`CANCEL`, four-finger swipes
are distinguishable by finger count, and direction comes from the sign of the
unaccelerated vertical delta. Negative `dy` means fingers moving **up** the
pad; positive `dy` means fingers moving **down** (screen-style coordinates,
y increasing downward). Natural scrolling is deliberately **not** applied:
it changes scroll-content direction, not physical finger direction.

## Interaction with built-in gestures

Two Shell swipe trackers are attached directly to `global.stage`:

| Tracker | Orientation | Modes | Source |
| --- | --- | --- | --- |
| Overview swipe | vertical | `NORMAL \| OVERVIEW` | `js/ui/overview.js:226` |
| Workspace animation | horizontal | `NORMAL` | `js/ui/workspaceAnimation.js:374` |

Both accept three or more fingers. Consequently:

- Four-finger **vertical** swipes in `NORMAL` mode overlap GNOME's
  swipe-up-to-overview gesture. This conflict is unavoidable if Gestura is to
  own that gesture. Gestura claims it **intentionally**; the overview remains
  reachable with the keyboard, the hot corner, or a click on the Activities
  button. This is a user-visible trade-off, not a side effect.
- Four-finger **horizontal** swipes overlap workspace switching and are
  **not** claimed by Gestura.
- Three-finger gestures are never claimed.
- In modes other than `NORMAL` (overview, lock screen, modal dialogs) Gestura
  propagates every touchpad event unchanged, so built-in behavior is intact.

## Chosen implementation

`extension.js` connects a single capture-phase handler to `global.stage` and
asks `GestureRecognizer` whether to consume each event. The recognizer is a
pure state machine with no GJS dependencies, covered by `node --test` unit
tests.

State flow for one physical gesture:

1. `BEGIN` with four fingers → `PENDING`, event propagated.
2. `UPDATE` deltas are accumulated while the travelled distance is below
   `classifyThreshold`. These events are propagated.
3. Once distance >= `classifyThreshold` (default 12, clamped to 15), the
   gesture is classified:
   - vertical requires `|dy| >= diagonalRatio * |dx|` (default ratio 2);
     otherwise the gesture is `IGNORED` and all remaining events are
     propagated to GNOME.
   - a vertical gesture becomes `HANDLING`: this and all following events are
     claimed with `EVENT_STOP`.
4. Direction is locked from the cumulative vertical delta and an action fires
   once the signed distance in that direction reaches `actionThreshold`
   (default 100 unaccelerated units). A direction reversal before the
   threshold cannot fire an action.
5. `END` finalizes a claimed gesture; `CANCEL` finalizes it without firing.
   Finger-count changes mid-gesture cancel recognition.

The classification threshold is intentionally **below** GNOME Shell 51's
16-unit threshold. Because capture handlers run first, Gestura consumes the
event at which Shell's tracker would otherwise reach its own threshold, so
Shell never enters its `HANDLING` state and never animates the overview. If a
future GNOME release changes that threshold, Gestura's clamp must be
revisited; this dependency is documented here rather than hidden in code.

## API stability

| API | Status |
| --- | --- |
| `Clutter.EventType.TOUCHPAD_SWIPE`, `Clutter.TouchpadGesturePhase` | Public Clutter API |
| `get_touchpad_gesture_finger_count()`, `get_gesture_motion_delta_unaccelerated()` | Public Clutter API |
| `global.stage`, capture/bubble event signals, `Clutter.EVENT_STOP` | Public GJS / Shell extension API |
| `Main.actionMode`, `Shell.ActionMode.NORMAL` | Public Shell JS API (module path is versioned with the extension API) |
| GNOME's internal swipe tracker, its 16-unit threshold, orientation rules | Private; **not** imported or called, only designed around |

## Verification status

- [x] Source-level API investigation completed against GNOME Shell / Mutter
      51.1.
- [x] Recognizer behavior covered by automated unit tests (`npm test`, 14
      tests): four-finger up/down, thresholds, horizontal/diagonal rejection,
      three-finger rejection, cancellation, reversal, reset, malformed deltas.
- [x] Physical touchpad with gesture capability confirmed present via
      `libinput list-devices`.
- [ ] **Unverified on a live Shell:** no synthetic four-finger swipe was
      injected into the running GNOME Shell during this investigation. GNOME
      Shell 51 only scans extension directories at startup (live directory
      monitoring was removed), and restarting the compositor would have ended
      the user session, so the stage event flow was verified from source and
      from an existing production extension rather than by executing Gestura
      in the running Shell. No hardware-testing claim is made.

### Manual verification checklist (GNOME 51, Wayland)

1. Install the extension and log out/in (restart is required to load it).
2. `journalctl -f` and watch for `Gestura: four-finger swipe up/down recognized`.
3. Four-finger swipe up and down on a physical touchpad: each should produce
   exactly one log line and must not open the overview.
4. Three-finger vertical/horizontal swipes and four-finger horizontal swipes:
   no Gestura log line; GNOME's own gestures still work.
5. Small four-finger movements: no log line.
6. Abort a swipe mid-way: no log line.
7. Disable/re-enable the extension between gestures: no stale actions.
