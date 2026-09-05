(function (root) {
  'use strict';
  const TYPES = [
    { name: 'Сирийский', personality: 'любопытный непоседа', color: '#c98847' },
    { name: 'Джунгарский', personality: 'маленький исследователь', color: '#92999b' },
    { name: 'Белый', personality: 'ласковый мечтатель', color: '#c9bda5' },
  ];
  const NAMES = ['Персик', 'Пиксель', 'Снежок', 'Булочка', 'Тоша', 'Облачко', 'Карамель', 'Пончик', 'Пушок', 'Крошка'];
  const PET_NAMES = ['Персика', 'Пикселя', 'Снежка', 'Булочку', 'Тошу', 'Облачко', 'Карамель', 'Пончика', 'Пушка', 'Крошку'];
  const STATIONS = { eat: { x: 27, y: 72 }, drink: { x: 72, y: 75 }, sleep: { x: 77, y: 37 }, wheel: { x: 21, y: 41 }, slide: { x: 81, y: 52 } };
  const ACTIVITIES = { walk: 'Исследует вольер', eat: 'Хрустит зёрнышками', drink: 'Пьёт водичку', sleep: 'Сладко спит', wheel: 'Бежит в колесе', slide: 'Катается с горки', idle: 'Нюхает воздух' };
  const clamp = (n, a = 0, b = 100) => Math.min(b, Math.max(a, n));
  class Game {
    constructor(random = Math.random) {
      this.random = random; this.hamsters = []; this.nextId = 0;
      this.food = 75; this.water = 75; this.elapsed = 0; this.paused = false; this.speed = 1; this.selectedId = 0;
      for (let i = 0; i < 3; i++) this.add();
    }
    add() {
      if (this.hamsters.length >= 10) return null;
      const occupied = new Set(this.hamsters.map(h => h.nameIndex));
      let nameIndex = 0; while (occupied.has(nameIndex)) nameIndex++;
      const id = this.nextId++;
      const h = { id, nameIndex, name: NAMES[nameIndex], type: id % 3, x: 35 + this.random() * 29, y: 48 + this.random() * 20,
        hunger: 70 + this.random() * 20, thirst: 65 + this.random() * 20, energy: 65 + this.random() * 20,
        happiness: 80 + this.random() * 15, health: 100, distance: 0, wheelTime: 0, meals: 0,
        activity: 'idle', target: null, timer: 1 + this.random() * 4, petCooldown: 0, facing: 1 };
      this.hamsters.push(h); return h;
    }
    remove() {
      if (this.hamsters.length <= 1) return null;
      const removed = this.hamsters.pop();
      if (this.selectedId === removed.id) this.selectedId = this.hamsters[0].id;
      return removed;
    }
    get selected() { return this.hamsters.find(h => h.id === this.selectedId) || this.hamsters[0]; }
    feed() { this.food = 100; this.invite('eat', 'hunger'); }
    fillWater() { this.water = 100; this.invite('drink', 'thirst'); }
    invite(activity, stat) {
      for (const h of this.hamsters) if (h[stat] < 92 && h.activity !== 'sleep') this.go(h, activity);
    }
    pet(id) {
      const h = this.hamsters.find(p => p.id === id);
      if (!h || h.petCooldown > 0) return false;
      h.happiness = clamp(h.happiness + 14); h.petCooldown = 8; return true;
    }
    go(h, activity) {
      const p = STATIONS[activity] || { x: 31 + this.random() * 38, y: 48 + this.random() * 30 };
      // Spread visitors around shared stations so a full enclosure remains selectable.
      const angle = h.id * 2.4, spread = activity === 'walk' ? 0 : 2.8;
      h.target = { x: p.x + Math.cos(angle) * spread, y: p.y + Math.sin(angle) * spread, activity };
      h.activity = 'walk';
    }
    decide(h) {
      if (h.thirst < 58 && this.water > 0) return this.go(h, 'drink');
      if (h.hunger < 60 && this.food > 0) return this.go(h, 'eat');
      if (h.energy < 30) return this.go(h, 'sleep');
      const choices = ['walk', 'wheel', 'walk', 'slide', 'idle'];
      const choice = choices[Math.floor(this.random() * choices.length)];
      if (choice === 'idle') { h.activity = 'idle'; h.timer = 3 + this.random() * 5; }
      else this.go(h, choice);
    }
    tick(seconds) {
      if (this.paused || !Number.isFinite(seconds) || seconds <= 0) return;
      // Small simulation steps keep movement and resource consumption stable at every speed.
      let remaining = Math.min(seconds, 1) * this.speed;
      while (remaining > 0.000001) { const dt = Math.min(0.1, remaining); this.step(dt); remaining -= dt; }
    }
    step(dt) {
      this.elapsed += dt;
      for (const h of this.hamsters) {
        h.petCooldown = Math.max(0, h.petCooldown - dt);
        h.hunger = clamp(h.hunger - dt * 0.09);
        h.thirst = clamp(h.thirst - dt * 0.12);
        h.energy = clamp(h.energy - dt * (h.activity === 'wheel' ? 0.65 : 0.09));
        h.happiness = clamp(h.happiness - dt * (h.hunger < 25 || h.thirst < 25 ? 0.2 : 0.025));
        h.health = clamp(h.health + dt * (h.hunger < 15 || h.thirst < 15 ? -0.18 : h.hunger > 45 && h.thirst > 45 ? 0.25 : 0));
        if (h.target) {
          const dx = h.target.x - h.x, dy = h.target.y - h.y, d = Math.hypot(dx, dy), travel = dt * 4.8;
          if (d <= travel) {
            h.x = h.target.x; h.y = h.target.y; h.activity = h.target.activity;
            h.target = null; h.timer = h.activity === 'sleep' ? 40 : h.activity === 'wheel' ? 14 : h.activity === 'slide' ? 5 : 4;
          } else { h.x += dx / d * travel; h.y += dy / d * travel; h.facing = dx >= 0 ? 1 : -1; }
          h.distance += Math.min(d, travel) * 0.025;
          continue;
        }
        h.timer -= dt;
        if (h.activity === 'eat') {
          const portion = Math.min(this.food, dt * 0.6); this.food -= portion; h.hunger = clamp(h.hunger + portion * 7);
          if (h.hunger >= 97 || this.food <= 0.001) { h.meals++; this.go(h, 'walk'); }
        } else if (h.activity === 'drink') {
          const sip = Math.min(this.water, dt * 0.6); this.water -= sip; h.thirst = clamp(h.thirst + sip * 8);
          if (h.thirst >= 97 || this.water <= 0.001) this.go(h, 'walk');
        } else if (h.activity === 'sleep') {
          h.energy = clamp(h.energy + dt * 1.9); h.happiness = clamp(h.happiness + dt * 0.08);
          if (h.energy >= 96) this.go(h, 'walk');
        } else if (h.activity === 'wheel') {
          h.wheelTime += dt; h.distance += dt * 0.08; h.happiness = clamp(h.happiness + dt * 0.45);
          if (h.timer <= 0 || h.energy < 25) this.decide(h);
        } else if (h.activity === 'slide') {
          h.x -= dt * 1.25; h.y += dt * 2.8; h.happiness = clamp(h.happiness + dt * 0.8);
          if (h.timer <= 0) this.decide(h);
        } else if (h.timer <= 0) this.decide(h);
      }
    }
  }
  root.HamsterGame = { Game, TYPES, NAMES, PET_NAMES, STATIONS, ACTIVITIES, clamp };
})(globalThis);
