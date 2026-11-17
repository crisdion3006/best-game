// The Sentinel ship: velocity movement with acceleration and drag, aim at the
// mouse, fire toward it, and the Nova Bomb. The player object is plain state;
// this module moves it and fires its shots, and the world owns the collisions.

import { FIELD, PLAYER } from './config.js';

export function createPlayer() {
  return {
    x: FIELD.width / 2,
    y: FIELD.height - 110,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: PLAYER.radius,
    invulnerable: 0,
    fireCooldown: 0,
    spreadUntil: 0,
    rapidUntil: 0,
    shieldUntil: 0,
    shieldHits: 0,
    bombs: PLAYER.bombs,
    alive: true,
    thrusting: false,
    trailTimer: 0,
  };
}

export function resetPlayer(player) {
  player.x = FIELD.width / 2;
  player.y = FIELD.height - 110;
  player.vx = 0;
  player.vy = 0;
  player.angle = -Math.PI / 2;
  player.invulnerable = 0;
  player.fireCooldown = 0;
  player.spreadUntil = 0;
  player.rapidUntil = 0;
  player.shieldUntil = 0;
  player.shieldHits = 0;
  player.bombs = PLAYER.bombs;
  player.alive = true;
  player.thrusting = false;
  player.trailTimer = 0;
}

/**
 * Move and fire the ship for one step. Returns true when a shot was fired.
 * `aim` is the playfield point the ship points at (the mouse), `firing` whether
 * the trigger is held, `now` the world's clock (for timed power-ups).
 */
export function updatePlayer(player, move, aim, firing, dt, now, fireShot) {
  if (!player.alive) return false;
  player.vx += move.x * PLAYER.accel * dt;
  player.vy += move.y * PLAYER.accel * dt;
  const drag = Math.max(0, 1 - PLAYER.drag * dt);
  player.vx *= drag;
  player.vy *= drag;
  const speed = Math.hypot(player.vx, player.vy);
  if (speed > PLAYER.maxSpeed) {
    player.vx = (player.vx / speed) * PLAYER.maxSpeed;
    player.vy = (player.vy / speed) * PLAYER.maxSpeed;
  }
  player.x = Math.min(FIELD.width - player.radius, Math.max(player.radius, player.x + player.vx * dt));
  player.y = Math.min(FIELD.height - player.radius, Math.max(player.radius, player.y + player.vy * dt));
  player.thrusting = move.x !== 0 || move.y !== 0;
  player.angle = Math.atan2(aim.y - player.y, aim.x - player.x);
  if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);
  if (player.fireCooldown > 0) player.fireCooldown -= dt;

  if (!firing || player.fireCooldown > 0) return false;
  const interval = now < player.rapidUntil ? PLAYER.fireInterval * 0.55 : PLAYER.fireInterval;
  player.fireCooldown = interval;
  const spread = now < player.spreadUntil;
  const noseX = player.x + Math.cos(player.angle) * (player.radius + 6);
  const noseY = player.y + Math.sin(player.angle) * (player.radius + 6);
  fireShot(noseX, noseY, player.angle, PLAYER.bulletSpeed, PLAYER.bulletDamage);
  if (spread) {
    fireShot(noseX, noseY, player.angle - 0.16, PLAYER.bulletSpeed, PLAYER.bulletDamage);
    fireShot(noseX, noseY, player.angle + 0.16, PLAYER.bulletSpeed, PLAYER.bulletDamage);
  }
  return true;
}
