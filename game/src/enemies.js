// The raiders: five kinds plus the Void Warden boss. Each kind has its own way
// of moving and fighting, all of them converging on the Relay station — the
// player intercepts them before they reach it. The boss runs a pattern cycle
// that grows fiercer as its health falls.

import {
  BULLET, ENEMY, EVENT_BOSS, EVENT_ENEMY_SHOOT, FIELD, KIND_BOMBER, KIND_BRUTE,
  KIND_DRONE, KIND_SPITTER, KIND_WARDEN, KIND_WEAVER, POOL,
} from './config.js';
import { range } from './random.js';

function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export function createEnemyPool() {
  const enemies = [];
  for (let i = 0; i < POOL.enemies; i += 1) {
    enemies.push({
      active: false, kind: KIND_DRONE, x: 0, y: 0, vx: 0, vy: 0,
      hp: 1, maxHp: 1, radius: 13, t: 0, seed: 0, fireTimer: 0,
      flash: 0, attackTimer: 2, pattern: 0, baseY: 0, chargeX: 0, chargeY: 0,
    });
  }
  return enemies;
}

function freeEnemy(enemies) {
  for (let i = 0; i < enemies.length; i += 1) if (!enemies[i].active) return enemies[i];
  return null;
}

/** Put an enemy of `kind` at (x, y); `hpScale` grows with the wave. Returns it or null. */
export function spawnEnemy(enemies, kind, x, y, hpScale = 1) {
  const e = freeEnemy(enemies);
  if (!e) return null;
  const def = ENEMY[kind];
  e.active = true;
  e.kind = kind;
  e.x = x;
  e.y = y;
  e.vx = 0;
  e.vy = 0;
  e.maxHp = Math.max(1, Math.round(def.hp * hpScale));
  e.hp = e.maxHp;
  e.radius = def.radius;
  e.t = 0;
  e.seed = Math.random() * Math.PI * 2;
  e.fireTimer = range(Math.random, 1.2, 2.4);
  e.flash = 0;
  e.attackTimer = 2.5;
  e.pattern = 0;
  e.baseY = y;
  return e;
}

/** A spawn point on the top or side edges, away from the player. */
export function spawnAtEdge(enemies, kind, random, hpScale = 1) {
  const edge = Math.floor(random() * 3);
  let x;
  let y;
  if (edge === 0) {
    x = range(random, 40, FIELD.width - 40);
    y = -30;
  } else if (edge === 1) {
    x = -30;
    y = range(random, 40, FIELD.height * 0.6);
  } else {
    x = FIELD.width + 30;
    y = range(random, 40, FIELD.height * 0.6);
  }
  return spawnEnemy(enemies, kind, x, y, hpScale);
}

/** The Warden's attack cycle: radial burst, aimed spread, drone call, charge. */
function wardenAttack(state, e, dt) {
  e.attackTimer -= dt;
  if (e.attackTimer > 0) return 0;
  const hpFrac = e.hp / e.maxHp;
  const player = state.player;
  let events = 0;
  const pattern = e.pattern % (hpFrac < 0.34 ? 4 : 3);
  e.pattern += 1;
  if (pattern === 0) {
    // Radial burst.
    const n = 12;
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2 + e.seed;
      state.bullets.fireEnemy(e.x, e.y, a, BULLET.enemySpeed * 0.75, 1);
    }
    e.attackTimer = hpFrac < 0.66 ? 2.2 : 2.8;
    events |= EVENT_ENEMY_SHOOT;
  } else if (pattern === 1) {
    // Aimed spread at the player.
    const base = Math.atan2(player.y - e.y, player.x - e.x);
    for (let d = -2; d <= 2; d += 1) {
      state.bullets.fireEnemy(e.x, e.y, base + d * 0.14, BULLET.enemySpeed * 1.1, 1);
    }
    e.attackTimer = hpFrac < 0.66 ? 1.8 : 2.4;
    events |= EVENT_ENEMY_SHOOT;
  } else if (pattern === 2) {
    // Call two drones.
    spawnEnemy(state.enemies, KIND_DRONE, e.x - 50, e.y + 30);
    spawnEnemy(state.enemies, KIND_DRONE, e.x + 50, e.y + 30);
    e.attackTimer = 2.6;
  } else {
    // Charge at the player's position (telegraphed by a flash first).
    e.chargeX = player.x;
    e.chargeY = player.y;
    e.flash = 0.5;
    e.attackTimer = 0.55;
    // The charge itself is a fast move handled in the boss drift below.
    e.vx = (e.chargeX - e.x) * 2.2;
    e.vy = (e.chargeY - e.y) * 2.2;
    events |= EVENT_ENEMY_SHOOT;
  }
  return events;
}

/**
 * Move every active enemy one step. `state` carries the player, the station,
 * the bullet pools and the particle system. Returns event flags.
 */
export function updateEnemies(state, dt) {
  let events = 0;
  const player = state.player;
  const station = state.station;
  for (let i = 0; i < state.enemies.length; i += 1) {
    const e = state.enemies[i];
    if (!e.active) continue;
    e.t += dt;
    if (e.flash > 0) e.flash -= dt;
    const def = ENEMY[e.kind];
    const toStationX = station.x - e.x;
    const toStationY = station.y - e.y;
    const dStation = Math.max(1, Math.hypot(toStationX, toStationY));
    const toPlayerX = player.x - e.x;
    const toPlayerY = player.y - e.y;
    const dPlayer = Math.max(1, Math.hypot(toPlayerX, toPlayerY));

    if (e.kind === KIND_DRONE) {
      const wob = Math.sin(e.t * 3 + e.seed) * 40;
      e.vx = (toStationX / dStation) * def.speed + wob * 0.4;
      e.vy = (toStationY / dStation) * def.speed;
    } else if (e.kind === KIND_WEAVER) {
      const px = -toStationY / dStation;
      const py = toStationX / dStation;
      const sway = Math.sin(e.t * 4 + e.seed) * 130;
      e.vx = (toStationX / dStation) * def.speed + px * sway;
      e.vy = (toStationY / dStation) * def.speed + py * sway;
    } else if (e.kind === KIND_SPITTER) {
      // Hold a standoff ring around the station and shoot the player.
      const want = 260;
      const radial = (dStation - want) / want;
      e.vx = (toStationX / dStation) * def.speed * radial + Math.sin(e.t + e.seed) * 30;
      e.vy = (toStationY / dStation) * def.speed * radial + Math.cos(e.t * 0.7 + e.seed) * 30;
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && player.alive && dPlayer < 560) {
        e.fireTimer = range(Math.random, 1.6, 2.4);
        const a = Math.atan2(toPlayerY, toPlayerX);
        state.bullets.fireEnemy(e.x, e.y, a, BULLET.enemySpeed, 1);
        events |= EVENT_ENEMY_SHOOT;
      }
    } else if (e.kind === KIND_BRUTE) {
      e.vx = (toStationX / dStation) * def.speed;
      e.vy = (toStationY / dStation) * def.speed;
    } else if (e.kind === KIND_BOMBER) {
      // Dive straight at the station, fast.
      e.vx = (toStationX / dStation) * def.speed;
      e.vy = (toStationY / dStation) * def.speed;
    } else if (e.kind === KIND_WARDEN) {
      // Hover near the top, strafing; charge when its pattern says so.
      if (e.t < 2.5) {
        e.vx = 0;
        e.vy = (150 - e.y) * 0.8;
      } else if (Math.abs(e.vx) > 200 || Math.abs(e.vy) > 200) {
        // Charging: keep the velocity, decay it back.
        e.vx *= 1 - 0.9 * dt;
        e.vy *= 1 - 0.9 * dt;
      } else {
        e.vx = Math.sin(e.t * 0.6 + e.seed) * 90;
        e.vy = Math.sin(e.t * 1.3) * 24;
      }
      events |= wardenAttack(state, e, dt);
    }

    e.x += e.vx * dt;
    e.y += e.vy * dt;
    // Keep everything inside the field except fresh spawns above the top.
    if (e.y > FIELD.height + 40) e.y = FIELD.height + 40;
    if (e.x < -60) e.x = -60;
    if (e.x > FIELD.width + 60) e.x = FIELD.width + 60;
  }
  return events;
}

/** How many enemies are still active. */
export function countEnemies(enemies) {
  let n = 0;
  for (let i = 0; i < enemies.length; i += 1) if (enemies[i].active) n += 1;
  return n;
}

/** The active Warden, if one is on the field. */
export function findWarden(enemies) {
  for (let i = 0; i < enemies.length; i += 1) {
    if (enemies[i].active && enemies[i].kind === KIND_WARDEN) return enemies[i];
  }
  return null;
}

/** Spawn the boss with a warning event. */
export function spawnWarden(state) {
  const e = spawnEnemy(state.enemies, KIND_WARDEN, FIELD.width / 2, -70, 1);
  if (e) {
    e.baseY = 150;
    return EVENT_BOSS;
  }
  return 0;
}
