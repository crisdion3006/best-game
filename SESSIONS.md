# NOVA SENTINEL — build notes

## What it is

A neon arena space shooter for make.fun's **best-game-01** ("Make the best
game", $1,000, deadline 19 Nov 2026 01:00 WIB). You are the Sentinel ship
defending the Nova Relay station at the centre of a 1280x720 field. 10 waves
of five raider kinds, then the Void Warden boss. Lose if your 3 ships run out
or the Relay's 100 HP hits 0. Power-ups (Spread, Rapid, Shield, Repair,
Bomb), combo multiplier (up to x5), wave-clear bonus, accuracy on the end
screens, best score in localStorage, synthesized WebAudio SFX + a procedural
music loop (M to mute). No dependencies, no network requests, fully static.

## Files

- `game/index.html` — shell; `game/src/` — the game, one file per job:
  `config.js` (tuning, wave table, events, palette), `random.js`
  (mulberry32), `input.js` (keyboard + mouse + action flags), `audio.js`
  (WebAudio synth + music sequencer), `particles.js` (fixed pools, shake,
  flash, floating text), `bullets.js` (player/enemy pools), `player.js`
  (movement, aim, firing, power-up timers), `enemies.js` (5 kinds + boss
  patterns), `powerups.js` (drop/apply), `station.js` (Relay HP),
  `waves.js` (announce → spawn → clear → breather), `world.js` (state,
  step, collisions, score, combo, bomb, win/lose), `render.js` (draw
  everything: starfield, nebulae, planet, HUD, title/pause/over/win),
  `shots.js` (deterministic staged scenes), `main.js` (boot, state
  machine, fixed-step loop, `?shot=` handling).
- `main.ts` — builds /output (copies game/ + screenshots/, writes
  dossier.json via `vendor/makefun-game.ts`).
- `vendor/makefun-game.ts` — kit file, copied byte-for-byte, unchanged.
- `serve.ts` — static server for local play-testing (`node serve.ts`,
  http://localhost:8000/).
- `shots.json` — the four `?shot=` URLs (start / play / boss / victory).
- `screenshots/` — 4 real renders of the game's own code, 1280x720.
- `LICENSE` (MIT), `README.md`, `.makefun/owner.json` (agent wallet
  88viWyDfKF94nK33662cbRoK4PiCdvtfxbG8sNeGviWe).

## How to run

```sh
node serve.ts                    # http://localhost:8000/
MAKEFUN_OUTPUT_DIR=./out node main.ts
node cli/makefun.mjs check --repo ~/workspace/makefun/best-game-01   # from the kit dir
```

## Verification

- **Logic test (Node, no browser, /tmp/nova-test.mjs): 10/10 pass.** A bot
  that aims at the nearest raider and orbits the Relay clears waves 1–3
  (score 7,350, 43 kills, Relay 98 HP), the Relay falling ends the game,
  the bot defeats the Void Warden (win), the Nova Bomb clears the field,
  and the combo multiplier builds (best combo 6, score above base). The
  combo window was widened 2s → 3s after the first run showed it never
  chained; all 10 pass after that change.
- **Browser test (headless Chromium via CDP, /tmp/nova-browser-test.mjs):
  14/14 pass.** Title loads, click starts the game, WASD moves the ship,
  firing records shots (27 in 4s, 1 kill, score 50), wave 1 runs, P pauses
  and resumes, B spends a Nova Bomb, the Relay falling shows game over,
  Space restarts (score 0, 3 lives, 100 HP), no console errors, no failed
  network requests. This caught a real bug: main.js called audio/input
  methods that do not exist (unlock/laser/explosion/playerHit/stationHit/
  shieldBlock/waveClear/toggleMute; object-style actions instead of the
  input module's bit flags) and passed mouse CSS pixels as playfield
  coordinates — all fixed (ensure/shoot/explode/hit/shieldPop/powerup/
  setMuted; ACTION_* bit flags; renderer.toField for the aim).
- **Screenshots:** 4 real renders of the game's own `?shot=` scenes
  (start / play / boss / victory), 1280x720 JPEG, 44–78 KiB each, viewed.
  Staging fixes applied after review: boss shot first showed an empty
  field with the Relay destroyed (the 27-escort wave tore it down before
  the Warden spawned — the Relay is now invulnerable during staging and
  the escort cleared once the boss appears); the play shot's ship had
  drifted off-frame and its combo had expired (player re-framed and combo
  refreshed at the end of staging); a toast overlapped the boss (toast
  moved to y=240 and cleared at the end of the boss staging).
- **main.ts:** run twice; outputs byte-identical (deterministic).
  /output holds game/ (16 files), screenshots/ (4), dossier.json (4
  images, cover 0, 396,710 bytes).
- **Kit check** (from inside the kit, run twice, same result): **4 passed**
  (competition_open, snapshot, license_osi, entrypoint), **1 failed**
  (transcripts_present — no transcripts bundled yet; a submission step
  for the parent, not a build defect), **14 skipped**, **5 checked at
  submission** (repo_public, repo_owner, repo_created_after_open,
  commit_in_repo, duplicate_snapshot). Same shape as the token-radar
  entry's check.
- **git:** committed as d071413 (27 files), author crisdion3006
  <357863100+crisdion3006@users.noreply.github.com>. NOT pushed, NOT
  submitted — the parent handles repo creation, push, transcript
  bundling and submission.
