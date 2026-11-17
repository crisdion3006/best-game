// Deterministic scenes for the screenshots: each one stages the game into a
// state that shows a different part of the loop, then lets it settle a few
// steps so the particles and motion look alive. They run through the real
// game code (not a mock), so the screenshots are the game.

import { KIND_BRUTE, KIND_DRONE, KIND_SPITTER, KIND_WARDEN, KIND_WEAVER } from './config.js';
import { spawnEnemy } from './enemies.js';
import { spawnPowerup } from './powerups.js';
import { startWave } from './waves.js';
import { createRandom } from './random.js';

/** A fresh world staged as the title screen: a few raiders drifting, the Sentinel home. */
function stageStart(world) {
  world.reset();
  const random = createRandom(101);
  const state = world.state;
  spawnEnemy(state.enemies, KIND_DRONE, 220, 240, 1);
  spawnEnemy(state.enemies, KIND_WEAVER, 1060, 260, 1);
  spawnEnemy(state.enemies, KIND_SPITTER, 940, 130, 1);
  spawnEnemy(state.enemies, KIND_DRONE, 180, 420, 1);
  state.player.x = 640;
  state.player.y = 480;
  state.player.angle = -Math.PI / 2;
  for (let i = 0; i < 30; i += 1) {
    world.step(1 / 60, { move: { x: 0, y: 0 }, aim: { x: 640, y: 200 }, firing: false, bomb: false }, true);
  }
  return state;
}

/** Mid-gameplay: wave 4 in full swing, HUD live, the player firing, a power-up in play. */
function stagePlay(world) {
  world.reset();
  const random = createRandom(202);
  const state = world.state;
  state.score = 18750;
  state.lives = 3;
  state.kills = 24;
  state.combo = 12;
  state.comboTimer = 1.4;
  state.comboBest = 12;
  state.station.hp = 82;
  state.player.bombs = 2;
  state.player.spreadUntil = 15;
  state.player.x = 640;
  state.player.y = 520;
  state.player.angle = -Math.PI / 2;
  startWave(state, 4, random);
  // Let the wave get going.
  for (let i = 0; i < 240; i += 1) {
    world.step(1 / 60, { move: { x: 0, y: 0 }, aim: { x: 640, y: 200 }, firing: false, bomb: false }, false);
  }
  // A spread shot firing at the raiders, a power-up on the field, a ring going off.
  spawnPowerup(state.powerups, 760, 420, random);
  for (let i = 0; i < 90; i += 1) {
    const t = i / 60;
    world.step(1 / 60, {
      move: { x: Math.sin(t * 1.5) * 0.4, y: Math.sin(t) * 0.25 },
      aim: { x: 640 + Math.sin(t * 1.2) * 260, y: 200 },
      firing: i % 10 < 7,
      bomb: false,
    }, false);
  }
  // Frame the shot: the Sentinel back near the bottom centre, firing up, the
  // combo fresh so the multiplier shows.
  state.player.x = 640;
  state.player.y = 520;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.angle = -Math.PI / 2;
  state.combo = 12;
  state.comboTimer = 1.8;
  state.comboBest = 12;
  return state;
}

/** The wave-10 boss fight: the Void Warden on the field, the boss bar up, the player dodging. */
function stageBoss(world) {
  world.reset();
  const random = createRandom(303);
  const state = world.state;
  state.score = 48900;
  state.lives = 2;
  state.kills = 71;
  // The Relay is invulnerable while the wave spawns in: without that, the
  // 27 raiders tear it down before the Warden ever appears.
  state.station.hp = 9999;
  state.player.bombs = 1;
  startWave(state, 10, random);
  // Run until the Warden appears (its spawn happens once the queue is empty:
  // announce 2.2s + 27 spawns at 0.55s, so allow a full 20 seconds).
  for (let i = 0; i < 1200 && !state.wave.wardenSpawned; i += 1) {
    world.step(1 / 60, { move: { x: 0, y: 0 }, aim: { x: 640, y: 200 }, firing: false, bomb: false }, false);
  }
  // Clear the escort so the shot is the boss fight, not a crowd, and put the
  // Relay back to a fought-over 64 HP.
  for (const e of state.enemies) {
    if (e.active && e.kind !== KIND_WARDEN) e.active = false;
  }
  state.station.hp = 64;
  // Fight it for a few seconds: the player fires, the boss attacks. The
  // player is briefly invulnerable so the staging cannot end the game.
  state.player.x = 640;
  state.player.y = 560;
  state.player.angle = -Math.PI / 2;
  state.player.invulnerable = 5;
  for (let i = 0; i < 240; i += 1) {
    const t = i / 60;
    world.step(1 / 60, {
      move: { x: Math.sin(t * 1.8) * 0.5, y: Math.cos(t) * 0.2 },
      aim: { x: 640 + Math.sin(t) * 120, y: 150 },
      firing: i % 8 < 5,
      bomb: false,
    }, false);
    if (state.won || state.over) break;
  }
  // Frame the shot: the Sentinel near the bottom centre, the Warden up top,
  // visibly damaged, and no stale toast over the boss.
  state.player.x = 640;
  state.player.y = 560;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.angle = -Math.PI / 2;
  state.toast.text = '';
  state.toast.timer = 0;
  const warden = state.enemies.find((e) => e.active && e.kind === KIND_WARDEN);
  if (warden) {
    if (warden.hp > warden.maxHp * 0.6) warden.hp = Math.floor(warden.maxHp * 0.55);
    if (warden.y < 120) warden.y = 150;
  }
  return state;
}

/** The victory screen: the Warden slain, the win panel up, the field calm. */
function stageVictory(world) {
  world.reset();
  const random = createRandom(404);
  const state = world.state;
  state.score = 62350;
  state.lives = 2;
  state.kills = 94;
  state.shotsFired = 812;
  state.shotsHit = 611;
  state.comboBest = 18;
  state.waveNumber = 10;
  state.won = true;
  state.station.hp = 58;
  state.player.x = 640;
  state.player.y = 520;
  state.player.angle = -Math.PI / 2;
  spawnEnemy(state.enemies, KIND_DRONE, 300, 200, 1);
  spawnEnemy(state.enemies, KIND_WEAVER, 980, 240, 1);
  for (let i = 0; i < 60; i += 1) {
    world.step(1 / 60, { move: { x: 0, y: 0 }, aim: { x: 640, y: 200 }, firing: false, bomb: false }, true);
  }
  return state;
}

const STAGES = { start: stageStart, play: stagePlay, boss: stageBoss, victory: stageVictory };

/**
 * Stage a named scene. Returns the state to draw and the screen to show with
 * it ('title' for start, 'play' for play/boss, 'win' for victory). Unknown
 * names fall back to the start scene.
 */
export function stageShot(world, name) {
  const fn = STAGES[name] || STAGES.start;
  const state = fn(world);
  if (name === 'start') return { state, screen: 'title' };
  if (name === 'victory') return { state, screen: 'win' };
  return { state, screen: 'play' };
}
