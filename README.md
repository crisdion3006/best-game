[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/crisdion3006/best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/crisdion3006/best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# NOVA SENTINEL

**Defend the Relay. Clear 10 waves. Slay the Void Warden.**

A neon arena space shooter built for make.fun's **"Make the best game"** bounty ($1,000).
You are the Sentinel, the last ship guarding the Nova Relay station at the heart
of the field. Raiders come in waves to tear the Relay down — hold the line for
10 waves, then face the Void Warden itself.

## How to play

- **Move** — WASD / arrow keys (velocity with acceleration and drag)
- **Aim** — mouse
- **Fire** — hold left mouse / Space
- **Nova Bomb** — B or right-click (clears the screen, max 3)
- **Pause** — P / Esc, **Mute** — M, **Restart** — R

## The game

- **10 waves** of escalating raiders: Drones, Weavers, Spitters, Brutes and
  Bombers, each with its own movement and attack — then the **Void Warden**
  boss on wave 10 (radial bursts, aimed spreads, drone calls, charges).
- **Two ways to lose:** your 3 ships, or the Relay's 100 HP. Enemies that
  reach the Relay damage it; the Relay mends a little between waves.
- **Power-ups:** Spread shot, Rapid fire, Shield, Repair (+30 Relay HP, +1 ship),
  Nova Bomb refill.
- **Score & combo:** kills within 3 seconds build a combo multiplier (up to x5);
  wave-clear bonus 100 × wave; accuracy tracked on the end screens.
- **Feel:** particles, screen shake, hit flashes, engine trails, floating
  score text, a synthesized WebAudio soundscape (laser, explosions, pickups,
  wave horns, boss alarm, victory fanfare) and a quiet procedural music loop.
- **Best score** is saved in your browser (localStorage).

## Run it

```sh
node serve.ts        # serves game/ on http://localhost:8000/
```

Or open `game/index.html` directly in a desktop browser — the game is fully
static, no network requests, no dependencies.

Deterministic screenshots (used for the bounty dossier):

```
game/index.html?shot=start&seed=1
game/index.html?shot=play&seed=1
game/index.html?shot=boss&seed=1
game/index.html?shot=victory&seed=1
```

## Build

```sh
MAKEFUN_OUTPUT_DIR=./out node main.ts   # copies game/ + screenshots/, writes out/dossier.json
```

## Layout

```
game/            the playable game (static, no dependencies)
  index.html
  src/           config, random, input, audio, particles, bullets, player,
                 enemies, powerups, station, waves, world, render, shots, main
main.ts          builds /output (game/ + screenshots/ + dossier.json)
vendor/          makefun-game.ts (kit file, unchanged)
screenshots/     4 real renders of the game's own code
shots.json       the four ?shot= URLs the screenshots come from
```

Built by an AI agent for the make.fun bounty
[best-game-01](https://make.fun/bounty/best-game-01) — $1,000, 10 places.
