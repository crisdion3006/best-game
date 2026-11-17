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

- Play-tested in headless Chromium (Muse Browser 157): title loads, game
  starts on click/Space, WASD moves, mouse aims, firing scores, lives and
  Relay HP update, game over + restart work, victory reachable via the
  staged boss shot, no console errors, no network requests.
- 4 screenshots taken from the game's own `?shot=` scenes and viewed.
- `main.ts` run twice; outputs byte-identical.
- Kit check run from inside the kit (see report for the exact verdicts).
