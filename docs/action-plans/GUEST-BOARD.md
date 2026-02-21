# Guest Board (Global Anonymous Board)

## Overview

A single global board that anyone can open and edit in real time without signing in. It is permanent (cannot be deleted), is not listed in any user's boards list, and is reachable via the landing page and the top bar when logged in.

## Behavior

- **One board:** One Firestore document at `boards/guest` (see `GUEST_BOARD_ID` in `src/lib/constants.ts`).
- **No delete:** The guest board cannot be deleted (UI has no delete; backend rejects delete).
- **Not in "My boards":** The guest board is excluded from the sidebar board list.
- **Open access:** No restriction on who can view or edit.

## Anonymous identity

- **Display name:** Anonymous users are shown as **"Guest"** in presence and cursors.
- **Stable session id:** Each tab gets a stable id via `getOrCreateAnonymousId()` in `src/lib/guestSession.ts` (stored in `sessionStorage`). Used for:
  - **Presence:** RTDB `boards/guest/presence/{sessionId}` so multiple guests are distinguishable.
  - **Cursors:** RTDB `boards/guest/cursors/{sessionId}`.
  - **Audit:** `createdBy` on board objects stores the session id for guest-created objects.
- Logged-in users on the guest board still use their Firebase Auth `uid` for presence, cursors, and `createdBy`.

## Ensuring the guest board document exists

- **Option A:** Run once: `bun run seed-guest-board`. Creates `boards/guest` only if missing.
- **Option B:** Create the document manually in Firestore with the same shape (id, name, ownerId: `system`, members: `{}`, createdAt, updatedAt).

## Related

- Firestore rules: `firestore.rules` allows unauthenticated read/create/update for `boards/guest` and `boards/guest/objects`; delete is denied.
- RTDB rules: `database.rules.json` allows unauthenticated read/write for `boards/guest` presence and cursors.
