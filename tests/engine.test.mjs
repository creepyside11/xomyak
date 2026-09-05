import test from 'node:test';
import assert from 'node:assert/strict';
import '../engine.js';
const { Game } = globalThis.HamsterGame;
const advance = (g, seconds) => { for (let i = 0; i < seconds; i++) g.tick(1); };
test('starts with three distinct types; population stays between one and ten', () => {
  const g = new Game(); assert.equal(new Set(g.hamsters.map(h => h.type)).size, 3);
  for (let i = 0; i < 20; i++) g.add();
  assert.equal(g.hamsters.length, 10); assert.equal(new Set(g.hamsters.map(h => h.name)).size, 10);
  g.selectedId = g.hamsters.at(-1).id; g.remove(); assert.ok(g.selected);
  for (let i = 0; i < 20; i++) g.remove(); assert.equal(g.hamsters.length, 1);
});
test('pause freezes needs, movement and elapsed time; speed scales time', () => {
  const g = new Game(); g.paused = true; const before = JSON.stringify(g);
  advance(g, 30); assert.equal(JSON.stringify(g), before);
  g.paused = false; g.speed = 4; advance(g, 10); assert.ok(Math.abs(g.elapsed - 40) < 0.001);
});
test('hungry and thirsty residents reach stations and consume refilled resources', () => {
  const g = new Game(() => 0.5); for (const h of g.hamsters) { h.hunger = 15; h.thirst = 15; }
  g.food = 0; g.water = 0; g.feed(); g.fillWater(); advance(g, 100);
  for (const h of g.hamsters) { assert.ok(h.hunger > 60); assert.ok(h.thirst > 60); }
  assert.ok(g.food < 100 && g.water < 100); assert.ok(g.food >= 0 && g.water >= 0);
});
test('tired residents rest and petting improves mood with a cooldown', () => {
  const g = new Game(() => 0.1), h = g.selected; h.energy = 10; h.happiness = 30;
  assert.equal(g.pet(h.id), true); assert.equal(g.pet(h.id), false); assert.equal(h.happiness, 44);
  advance(g, 65); assert.ok(h.energy > 75); assert.equal(g.pet(h.id), true);
});
test('ten residents remain finite and inside the habitat with exhausted supplies', () => {
  let seed=17;const g = new Game(()=>{seed=seed*16807%2147483647;return seed/2147483647;}); for (let i = 0; i < 7; i++) g.add(); g.food = 0; g.water = 0;
  advance(g, 2000);
  for (const h of g.hamsters) {
    for (const key of ['hunger', 'thirst', 'energy', 'happiness', 'health']) assert.ok(Number.isFinite(h[key]) && h[key] >= 0 && h[key] <= 100, key);
    assert.ok(h.x >= 9 && h.x <= 91 && h.y >= 15 && h.y <= 85);
  }
  g.feed(); g.fillWater(); advance(g, 180);
  assert.ok(g.hamsters.every(h => h.hunger > 0 && h.thirst > 0));
});
test('new session resets all previous progress', () => {
  const a = new Game(); a.add(); a.feed(); advance(a, 100);
  const b = new Game(); assert.equal(b.elapsed, 0); assert.equal(b.hamsters.length, 3); assert.equal(b.food, 75);
});
