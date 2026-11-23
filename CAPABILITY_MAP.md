# Capability Map: Workout Editing and Split Renewal

## Confirmed intent

Make workout modification fast, guided, and safe. A user can replace an
exercise for the current session in two or three taps without changing the
saved routine, and can generate, review, adjust, and activate a complete new
training split in under five minutes. The current split and workout history
remain unchanged until the user explicitly activates a replacement.

## Modules

| Module ID | Responsibility | Depends on |
|---|---|---|
| `workout-editing-core` | Reusable exercise search, replacement, reordering, draft editing, and data-integrity safeguards | — |
| `session-exercise-swap` | Replace one exercise for the current session in two or three taps without changing the routine | `workout-editing-core` |
| `split-renewal` | Generate, review, customize, and explicitly activate a new multi-month split | `workout-editing-core` |

Build order: `workout-editing-core` → `session-exercise-swap` → `split-renewal`.

The session-swap flow must ship and be verified before split renewal. This
keeps the first user-facing slice small and verifies that session-only edits
cannot mutate the saved routine before the larger editing flow reuses the same
foundation.

## Initiative boundaries

- Preserve the existing React Native and Expo implementation.
- Keep recommendations offline and based on existing local profile, program,
  and history data.
- Never modify completed workout history through an editing workflow.
- Keep the current split active until the user explicitly activates a reviewed
  replacement.
- Retain IronForge's dark visual identity while improving hierarchy,
  accessibility, and one-handed use.
- Limit this initiative to workout editing and split renewal; a cosmetic
  redesign of unrelated screens is not included.
