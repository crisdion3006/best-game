// NOVA SENTINEL — boot and the screen state machine. The world does the
// rules, the renderer draws, the audio synth makes the noise; this file wires
// them together, runs the fixed-step loop, and turns world events into sounds.
// `?shot=<name>&seed=<n>` renders one deterministic scene instead of the
// interactive game, for the screenshots.

import { BEST_KEY, EVENT_BOMB, EVENT_BOSS, EVENT_ENEMY_SHOOT, EVENT_HIT, EVENT_KILL, EVENT_OVER, EVENT_POWERUP, EVENT_SHIELD, EVENT_SHOOT, EVENT_STATION_HIT, EVENT_WAVE_CLEAR, EVENT_WAVE_START, EVENT_WIN, FIELD, KIND_DRONE, KIND_SPITTER, KIND_WEAVER, STEP } from './config.js';
import { createRandom } from './random.js';
import { ACTION_BOMB, ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createWorld } from './world.js';
import { spawnAtEdge } from './enemies.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);
const input = createInput(canvas);
const audio = createAudio();
const random = createRandom(Date.now() % 2147483647);
const world = createWorld(random);
const state = world.state;

let screen = SCREEN_TITLE;
let best = 0;
let time = 0;
let accumulator = 0;
let lastFrame = 0;
let shotMode = null;
let shotState = null;
let titleSpawnTimer = 0;

try {
  best = Number(window.localStorage.getItem(BEST_KEY)) || 0;
} catch (error) {
  best = 0;
}

// A read-only handle for automated tests and debugging (does not affect play).
window.__nova = {
  get state() { return state; },
  get screen() { return screen; },
  get best() { return best; },
};

function saveBest() {
  if (state.score > best) {
    best = state.score;
    try {
      window.localStorage.setItem(BEST_KEY, String(best));
    } catch (error) {
      // Storage may be unavailable; the score still shows for this session.
    }
  }
}

/** Play the sound for a set of world events, in priority order. */
function playEvents(events) {
  if (events & EVENT_WIN) audio.victory();
  else if (events & EVENT_OVER) audio.gameOver();
  if (events & EVENT_BOSS) audio.bossAlarm();
  if (events & EVENT_BOMB) audio.bomb();
  if (events & EVENT_HIT) audio.hit();
  if (events & EVENT_STATION_HIT) audio.explode(false);
  if (events & EVENT_SHIELD) audio.shieldPop();
  if (events & EVENT_POWERUP) audio.pickup();
  if (events & EVENT_KILL) audio.explode(false);
  if (events & EVENT_SHOOT) audio.shoot();
  if (events & EVENT_ENEMY_SHOOT) audio.enemyShoot();
  if (events & EVENT_WAVE_START) audio.waveHorn();
  if (events & EVENT_WAVE_CLEAR) audio.powerup();
}

function startGame() {
  world.reset();
  screen = SCREEN_PLAY;
  audio.ensure();
  audio.startMusic();
  world.startWave(1);
}

function togglePause() {
  if (screen === SCREEN_PLAY) {
    screen = SCREEN_PAUSED;
    audio.stopMusic();
  } else if (screen === SCREEN_PAUSED) {
    screen = SCREEN_PLAY;
    audio.startMusic();
  }
}

/** One fixed step of the game, from the current input. */
function step(dt) {
  // takeActions returns bit flags (ACTION_*), not an object.
  const actions = input.takeActions();
  if (actions & ACTION_PAUSE) togglePause();
  if (actions & ACTION_MUTE) audio.setMuted(!audio.isMuted());
  if ((actions & ACTION_RESTART) && (screen === SCREEN_OVER || screen === SCREEN_WIN)) {
    startGame();
    return;
  }
  if (screen === SCREEN_TITLE) {
    if ((actions & ACTION_CONFIRM) || input.firing()) {
      startGame();
      return;
    }
    // The title screen is a live backdrop: a few raiders drift through,
    // nothing scores, nothing can be hurt.
    titleSpawnTimer -= dt;
    let drifting = 0;
    for (const e of state.enemies) {
      if (!e.active) continue;
      drifting += 1;
      if (e.y > FIELD.height + 120 || e.x < -120 || e.x > FIELD.width + 120) e.active = false;
    }
    if (titleSpawnTimer <= 0 && drifting < 4) {
      titleSpawnTimer = 2.0;
      const kinds = [KIND_DRONE, KIND_WEAVER, KIND_SPITTER];
      spawnAtEdge(state.enemies, kinds[Math.floor(Math.random() * kinds.length)], Math.random, 1);
    }
    world.step(dt, { move: { x: 0, y: 0 }, aim: { x: FIELD.width / 2, y: 200 }, firing: false, bomb: false }, true);
    return;
  }
  if (screen === SCREEN_PAUSED) return;
  if (screen === SCREEN_OVER || screen === SCREEN_WIN) {
    if ((actions & ACTION_CONFIRM) || input.firing()) startGame();
    return;
  }

  const move = input.move();
  // The mouse is in canvas CSS pixels; the world works in playfield pixels.
  const mouse = input.mouse();
  const aim = renderer.toField(mouse.x, mouse.y);
  const controls = { move, aim, firing: input.firing(), bomb: !!(actions & ACTION_BOMB) };
  const events = world.step(dt, controls, false);
  playEvents(events);
  if (state.won) {
    screen = SCREEN_WIN;
    saveBest();
    audio.stopMusic();
  } else if (state.over) {
    screen = SCREEN_OVER;
    saveBest();
    audio.stopMusic();
  }
}

function frame(timestamp) {
  requestAnimationFrame(frame);
  const now = timestamp / 1000;
  if (!lastFrame) lastFrame = now;
  let frameDt = now - lastFrame;
  lastFrame = now;
  if (frameDt > 0.25) frameDt = 0.25;
  time += frameDt;
  accumulator += frameDt;
  let guard = 0;
  while (accumulator >= STEP && guard < 5) {
    step(STEP);
    accumulator -= STEP;
    guard += 1;
  }
  if (shotMode) {
    renderer.draw(shotState, shotMode === 'start' ? SCREEN_TITLE : shotMode === 'victory' ? SCREEN_WIN : SCREEN_PLAY, best, time);
    if (!window.__shotReady) window.__shotReady = true;
  } else {
    renderer.draw(state, screen, best, time);
  }
}

function boot() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = Number(params.get('seed')) || 1;
  if (shot) {
    // Deterministic scene: re-seed the world and stage the named shot.
    const shotRandom = createRandom(seed * 7919 + 13);
    const shotWorld = createWorld(shotRandom);
    const staged = stageShot(shotWorld, shot);
    shotState = staged.state;
    shotMode = shot;
    // Give the scene a few more settled steps so particles are visible.
    for (let i = 0; i < 12; i += 1) {
      shotWorld.step(STEP, { move: { x: 0, y: 0 }, aim: { x: FIELD.width / 2, y: 200 }, firing: false, bomb: false }, shot === 'start' || shot === 'victory');
    }
    // __shotReady is set by frame() after the first paint, so a screenshot
    // taken on that flag sees the scene drawn.
    document.title = `NOVA SENTINEL — ${shot}`;
  }
  // Clicks and Space start/restart through the input actions (ACTION_CONFIRM),
  // picked up by step() — no separate listener, so a press is never counted twice.
  requestAnimationFrame(frame);
}

boot();
