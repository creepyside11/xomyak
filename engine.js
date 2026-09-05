import { STATIONS, SLIDE, WHEEL, stairElevation, sleepSpot, groundElevation } from './layout.js';
import { blocked, findPath } from './navigation.js';
(function (root) {
  'use strict';
  const TYPES = [
    { name: 'Сирийский', personality: 'любопытный непоседа', color: '#c98847' },
    { name: 'Джунгарский', personality: 'маленький исследователь', color: '#92999b' },
    { name: 'Белый', personality: 'ласковый мечтатель', color: '#c9bda5' },
  ];
  const NAMES = ['Персик', 'Пиксель', 'Снежок', 'Булочка', 'Тоша', 'Облачко', 'Карамель', 'Пончик', 'Пушок', 'Крошка'];
  const PET_NAMES = ['Персика', 'Пикселя', 'Снежка', 'Булочку', 'Тошу', 'Облачко', 'Карамель', 'Пончика', 'Пушка', 'Крошку'];

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
        elevation: 0, pitch: 0, heading: 0, wheelPhase: 'enter', route: [], slidePhase: 0, activity: 'idle', target: null, timer: 1 + this.random() * 4, petCooldown: 0, facing: 1 };
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
      for (const h of this.hamsters) if (h[stat] < 92 && !['sleep', 'slide', 'wheel'].includes(h.activity)) this.go(h, activity);
    }
    pet(id) {
      const h = this.hamsters.find(p => p.id === id);
      if (!h || h.petCooldown > 0) return false;
      h.happiness = clamp(h.happiness + 14); h.petCooldown = 8; return true;
    }
    go(h, activity) {
      if (['wheel', 'slide'].includes(activity) && this.hamsters.some(p => p.id !== h.id && (p.activity === activity || p.target?.activity === activity))) activity = 'walk';
      let p;
      if (activity === 'walk') {
        for (let attempt = 0; attempt < 30; attempt++) {
          p = { x: 13 + this.random() * 73, y: 18 + this.random() * 63 };
          if (!blocked(p.x, p.y)) break;
        }
        if (blocked(p.x,p.y)) p = {x:50,y:52};
      } else {
        p = activity==='sleep' ? sleepSpot(h.nameIndex) : {...STATIONS[activity]};
        const angle = h.nameIndex * Math.PI * 2 / 10;
        const spread = activity === 'eat' ? 8 : activity === 'drink' ? 6.5 : 0;
        p.x += Math.cos(angle) * spread; p.y += Math.sin(angle) * spread;
      }
      const path = findPath(h,p);
      if (!path.length) { h.activity='idle';h.target=null;h.route=[];h.timer=2;return; }
      h.route = path; h.target = {...p, activity}; h.activity = 'walk';h.elevation=0;h.pitch=0;
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
          const waypoint=h.route[0], dx=waypoint.x-h.x, dy=waypoint.y-h.y;
          const d=Math.hypot(dx,dy), travel=dt*6;
          h.heading=Math.atan2(dx,dy);
          if(d<=travel) {
            h.x=waypoint.x;h.y=waypoint.y;h.route.shift();
            if(!h.route.length) {
              h.activity=h.target.activity==='walk'?'idle':h.target.activity;
              h.target=null;h.timer=h.activity==='wheel'?14:4;
              if(h.activity==='slide') h.slidePhase=0;
              if(h.activity==='wheel'){h.wheelPhase='enter';h.timer=14;}
              if(h.activity==='sleep'){h.elevation=sleepSpot(h.nameIndex).e;h.heading=0;}
              if(h.activity==='eat'||h.activity==='drink') {const p=STATIONS[h.activity];h.heading=Math.atan2(p.x-h.x,p.y-h.y);}
            }
          } else {h.x+=dx/d*travel;h.y+=dy/d*travel;}
          h.distance+=Math.min(d,travel)*0.025;
          if(h.activity!=='slide'&&h.activity!=='wheel')h.elevation=groundElevation(h.x,h.y);
          continue;
        }
        h.timer -= dt;
        if (h.activity === 'eat') {
          const portion = Math.min(this.food, dt * 0.22); this.food -= portion; h.hunger = clamp(h.hunger + portion * (4.2 / 0.22));
          if (h.hunger >= 97 || this.food <= 0.001) { h.meals++; this.go(h, 'walk'); }
        } else if (h.activity === 'drink') {
          const sip = Math.min(this.water, dt * 0.22); this.water -= sip; h.thirst = clamp(h.thirst + sip * (4.8 / 0.22));
          if (h.thirst >= 97 || this.water <= 0.001) this.go(h, 'walk');
        } else if (h.activity === 'sleep') {
          h.energy = clamp(h.energy + dt * 1.9); h.happiness = clamp(h.happiness + dt * 0.08);
          if (h.energy >= 96) this.go(h, 'walk');
        } else if (h.activity === 'wheel') {
          if(h.wheelPhase==='run') {
            h.wheelTime+=dt;h.distance+=dt*.08;h.happiness=clamp(h.happiness+dt*.45);
            h.heading=Math.PI/2;
            if(h.timer<=0||h.energy<25)h.wheelPhase='exit';
          } else {
            const goal=h.wheelPhase==='enter'?WHEEL.run:WHEEL.entry;
            const dx=goal.x-h.x,dy=goal.y-h.y,d=Math.hypot(dx,dy),ratio=d<.001?1:Math.min(1,dt*6/d);
            h.heading=Math.atan2(dx,dy);h.x+=dx*ratio;h.y+=dy*ratio;h.elevation+=(goal.e-h.elevation)*ratio;
            if(ratio===1){if(h.wheelPhase==='enter'){h.wheelPhase='run';h.timer=14;}else {h.elevation=0;this.decide(h);}}
          }
        } else if (h.activity === 'slide') {
          const points=[SLIDE.top,SLIDE.turn,SLIDE.end];
          const goal=points[h.slidePhase], dx=goal.x-h.x,dy=goal.y-h.y,d=Math.hypot(dx,dy);
          const speed=h.slidePhase===2?17:6, ratio=d<0.001?1:Math.min(1,dt*speed/d);
          h.heading=Math.atan2(dx,dy);h.x+=dx*ratio;h.y+=dy*ratio;h.elevation+=(goal.e-h.elevation)*ratio;
          if(h.slidePhase===0)h.elevation=stairElevation(h.y);
          h.pitch=h.slidePhase===2?Math.atan2(SLIDE.turn.e,Math.hypot(SLIDE.end.x-SLIDE.turn.x,SLIDE.end.y-SLIDE.turn.y)*.16):0;
          h.happiness=clamp(h.happiness+dt*0.8);
          if(ratio===1) {h.slidePhase++;if(h.slidePhase===3){h.elevation=0;this.go(h,'walk');}}
        } else if (h.timer <= 0) this.decide(h);
      }
    }
  }
  root.HamsterGame = { Game, TYPES, NAMES, PET_NAMES, STATIONS, ACTIVITIES, clamp };
})(globalThis);
