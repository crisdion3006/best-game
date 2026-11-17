// The game's rules and state, with no drawing and no browser in it: the ship,
// the Relay station, the raiders, the bullets, the power-ups, the waves, the
// collisions, the score and the combo. step() advances one fixed step and
// returns what happened as bit flags, so the caller can play a sound or
// announce it without the world knowing about screens or sound.

import {
  ENEMY, EVENT_BOMB, EVENT_HIT, EVENT_KILL, EVENT_OVER, EVENT_POWERUP,
  EVENT_SHIELD, EVENT_SHOOT, EVENT_STATION_HIT, EVENT_WAVE_CLEAR,
  EVENT_WAVE_START, EVENT_WIN, KIND_BOMBER, KIND_BRUTE, KIND_DRONE,
  KIND_SPITTER, KIND_WARDEN, KIND_WEAVER, LIVES, PLAYER, STATION,
} from './config.js';
import { createPlayer, resetPlayer, updatePlayer } from './player.js';
import { createBullets } from './bullets.js';
import { createEnemyPool, updateEnemies } from './enemies.js';
import { createPowerupPool, applyPowerup, spawnPowerup, updatePowerups } from './powerups.js';
import { createStation, damageStation, repairStation, resetStation, updateStation } from './station.js';
import { createWave, resetWave, startWave, updateWave } from './waves.js';
import { createParticles } from './particles.js';

/** Station damage when a raider of each kind reaches the Relay. */
const STATION_DAMAGE = {
  [KIND_DRONE]: 6,
  [KIND_WEAVER]: 7,
  [KIND_SPITTER]: 5,
  [KIND_BRUTE]: 12,
  [KIND_BOMBER]: 16,
  [KIND_WARDEN]: 20,
};

/** Brutes always drop a power-up; other kills drop one this often. */
const DROP_CHANCE = 0.09;

function circlesHit(a, ar, b, br) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = ar + br;
  return dx * dx + dy * dy < r * r;
}

export function createWorld(random) {
  const player = createPlayer();
  const station = createStation();
  const enemies = createEnemyPool();
  const bullets = createBullets();
  const powerups = createPowerupPool();
  const wave = createWave();
  const particles = createParticles();
  const state = {
    time: 0, score: 0, lives: LIVES, waveNumber: 0, kills: 0,
    shotsFired: 0, shotsHit: 0, combo: 0, comboTimer: 0, comboBest: 0,
    station, player, enemies, bullets, powerups, wave, particles,
    toast: { text: '', timer: 0 },
    won: false, over: false,
  };

  function reset() {
    resetPlayer(player);
    resetStation(station);
    for (const e of enemies) e.active = false;
    bullets.clear();
    for (const p of powerups) p.active = false;
    resetWave(wave);
    state.time = 0;
    state.score = 0;
    state.lives = LIVES;
    state.waveNumber = 0;
    state.kills = 0;
    state.shotsFired = 0;
    state.shotsHit = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.comboBest = 0;
    state.toast.text = '';
    state.toast.timer = 0;
    state.won = false;
    state.over = false;
  }

  function comboMultiplier() {
    return 1 + Math.min(4, Math.floor(state.combo / 5));
  }

  function toast(text, seconds = 2) {
    state.toast.text = text;
    state.toast.timer = seconds;
  }

  function killEnemy(e, awardScore) {
    e.active = false;
    const def = ENEMY[e.kind];
    state.kills += 1;
    if (awardScore) {
      state.combo += 1;
      state.comboTimer = 3.0;
      state.comboBest = Math.max(state.comboBest, state.combo);
      const points = def.score * comboMultiplier();
      state.score += points;
      particles.addText(e.x, e.y - 10, `+${points}`, '#eef2ff', 18);
    }
    particles.burst(e.x, e.y, def.color, e.kind === KIND_WARDEN ? 90 : e.kind === KIND_BRUTE ? 36 : 18, e.kind === KIND_WARDEN ? 320 : 220);
    particles.shake(e.kind === KIND_WARDEN ? 14 : e.kind === KIND_BRUTE ? 7 : 3);
    if (e.kind === KIND_BRUTE || random() < DROP_CHANCE) {
      spawnPowerup(powerups, e.x, e.y, random);
    }
    if (e.kind === KIND_WARDEN) {
      state.won = true;
      state.score += 500;
      particles.ring(e.x, e.y, '#fbbf24', 40, 420);
      particles.flash('#fbbf24');
    }
  }

  function hurtPlayer() {
    if (player.invulnerable > 0) return 0;
    if (state.time < player.shieldUntil && player.shieldHits > 0) {
      player.shieldHits -= 1;
      player.invulnerable = 1.2;
      particles.ring(player.x, player.y, '#4ade80', 24, 300);
      return EVENT_SHIELD;
    }
    state.lives -= 1;
    state.combo = 0;
    state.comboTimer = 0;
    player.invulnerable = PLAYER.invulnerable;
    particles.burst(player.x, player.y, '#22d3ee', 30, 260);
    particles.shake(9);
    particles.flash('#ff2d55');
    if (state.lives <= 0) {
      player.alive = false;
      state.over = true;
      return EVENT_HIT | EVENT_OVER;
    }
    return EVENT_HIT;
  }

  function hurtStation(e) {
    const amount = STATION_DAMAGE[e.kind] || 6;
    const destroyed = damageStation(station, amount);
    particles.burst(e.x, e.y, '#fbbf24', 22, 240);
    particles.shake(6);
    if (destroyed) {
      state.over = true;
      return EVENT_STATION_HIT | EVENT_OVER;
    }
    return EVENT_STATION_HIT;
  }

  /**
   * One fixed step. `controls` is { move, aim, firing, bomb }. With `harmless`
   * set (the title screen's backdrop) things drift but nothing touches the
   * player or the station and nothing scores.
   */
  function step(dt, controls, harmless) {
    let events = 0;
    state.time += dt;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    if (state.toast.timer > 0) state.toast.timer -= dt;
    particles.update(dt);
    updateStation(station, dt);

    const aim = controls.aim;
    const fired = updatePlayer(player, controls.move, aim, controls.firing && !harmless, dt, state.time, (x, y, angle, speed, damage) => {
      state.shotsFired += 1;
      bullets.firePlayer(x, y, angle, speed, damage);
    });
    if (fired) events |= EVENT_SHOOT;

    // Nova Bomb: clears the sky and wounds everything on it.
    if (controls.bomb && !harmless && player.alive && player.bombs > 0) {
      player.bombs -= 1;
      bullets.clear();
      particles.flash('#a5f3fc');
      particles.ring(player.x, player.y, '#22d3ee', 48, 520);
      particles.shake(12);
      events |= EVENT_BOMB;
      for (let i = 0; i < enemies.length; i += 1) {
        const e = enemies[i];
        if (!e.active) continue;
        e.hp -= 4;
        e.flash = 0.15;
        if (e.hp <= 0) {
          killEnemy(e, true);
          events |= EVENT_KILL;
          if (state.won) events |= EVENT_WIN;
        }
      }
    }

    if (!harmless && !state.over && !state.won) {
      events |= updateWave(state, dt, random);
      if (events & EVENT_WAVE_START) toast(`WAVE ${state.waveNumber}`, 2.2);
      if (events & EVENT_WAVE_CLEAR) {
        const bonus = 100 * state.waveNumber;
        state.score += bonus;
        repairStation(station, STATION.regenPerWave);
        toast(`WAVE ${state.waveNumber} CLEARED  +${bonus}`, 2.4);
      }
    }

    events |= updateEnemies(state, dt);
    bullets.update(dt);
    updatePowerups(powerups, dt);

    if (!harmless && !state.over && !state.won) {
      // Player bullets against raiders.
      for (let bi = 0; bi < bullets.playerBullets.length; bi += 1) {
        const b = bullets.playerBullets[bi];
        if (!b.active) continue;
        for (let ei = 0; ei < enemies.length; ei += 1) {
          const e = enemies[ei];
          if (!e.active) continue;
          if (!circlesHit(b, b.radius, e, e.radius)) continue;
          b.active = false;
          state.shotsHit += 1;
          e.hp -= b.damage;
          e.flash = 0.09;
          particles.burst(b.x, b.y, ENEMY[e.kind].color, 4, 120, 0.3, 2);
          if (e.hp <= 0) {
            killEnemy(e, true);
            events |= EVENT_KILL;
            if (state.won) events |= EVENT_WIN;
          }
          break;
        }
      }
      // Enemy bullets against the ship.
      for (let bi = 0; bi < bullets.enemyBullets.length; bi += 1) {
        const b = bullets.enemyBullets[bi];
        if (!b.active || !player.alive) continue;
        if (!circlesHit(b, b.radius, player, player.radius)) continue;
        b.active = false;
        events |= hurtPlayer();
        if (state.over) break;
      }
      // Raiders against the ship.
      for (let ei = 0; ei < enemies.length && !state.over; ei += 1) {
        const e = enemies[ei];
        if (!e.active || !player.alive) continue;
        if (!circlesHit(e, e.radius, player, player.radius + 2)) continue;
        if (player.invulnerable > 0) {
          killEnemy(e, false);
          events |= EVENT_KILL;
          continue;
        }
        killEnemy(e, false);
        events |= EVENT_KILL | hurtPlayer();
      }
      // Raiders against the Relay.
      for (let ei = 0; ei < enemies.length && !state.over; ei += 1) {
        const e = enemies[ei];
        if (!e.active) continue;
        if (!circlesHit(e, e.radius, station, station.radius)) continue;
        killEnemy(e, false);
        events |= EVENT_KILL | hurtStation(e);
      }
      // Power-ups against the ship.
      for (let pi = 0; pi < powerups.length; pi += 1) {
        const p = powerups[pi];
        if (!p.active || !player.alive) continue;
        if (!circlesHit(p, 16, player, player.radius + 6)) continue;
        p.active = false;
        const label = applyPowerup(state, p.kind, state.time);
        toast(label, 1.6);
        particles.ring(player.x, player.y, '#fbbf24', 18, 220);
        events |= EVENT_POWERUP;
      }
    }

    // Engine trail while thrusting.
    if (player.alive && player.thrusting && player.trailTimer <= 0) {
      player.trailTimer = 0.03;
      const backX = player.x - Math.cos(player.angle) * (player.radius + 4);
      const backY = player.y - Math.sin(player.angle) * (player.radius + 4);
      particles.trail(backX, backY, '#22d3ee', -player.vx * 0.2, -player.vy * 0.2);
    }
    if (player.trailTimer > 0) player.trailTimer -= dt;

    return events;
  }

  reset();
  return { state, reset, step, startWave: (index) => startWave(state, index, random) };
}
