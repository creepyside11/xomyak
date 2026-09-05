import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.min.js';
import {createHamster} from '../hamster.js';
import {animateHamster} from '../animation.js';
import {FLOOR_Y,STATIONS,worldPosition,waterSurface} from '../layout.js';
import '../engine.js';
const {Game}=globalThis.HamsterGame;
const pose=(p,h,g,time,stride=0)=>{h.activityTime=time;h.stride=stride;g.elapsed=time;animateHamster(p,h,g,1);p.group.updateMatrixWorld(true);};

test('feeding paw reaches the bowl then lifts a visible seed to the mouth',()=>{
  const g=new Game(()=>.5),h=g.selected,p=createHamster();
  Object.assign(h,{activity:'eat',target:null,heading:Math.PI,x:STATIONS.eat.x,y:STATIONS.eat.y+6.5});
  pose(p,h,g,.8);
  const reach=p.feet[1].position.clone();assert.ok(p.seed.visible);
  const seedAtBowl=p.seed.getWorldPosition(new THREE.Vector3()),bowl=new THREE.Vector3(...worldPosition(STATIONS.eat.x,STATIONS.eat.y));
  assert.ok(Math.hypot(seedAtBowl.x-bowl.x,seedAtBowl.z-bowl.z)<.49);
  assert.ok(Math.abs(seedAtBowl.y-(FLOOR_Y+.2))<.05);
  pose(p,h,g,2.1);
  assert.ok(p.feet[1].position.y>reach.y+.10);assert.ok(p.seed.visible);
  assert.ok(p.seed.position.distanceTo(p.feet[1].position)<.065);
  const jaw=p.jaw.getWorldPosition(new THREE.Vector3()),seed=p.seed.getWorldPosition(new THREE.Vector3());
  assert.ok(jaw.distanceTo(seed)<.12,'food must actually reach the mouth');
  pose(p,h,g,3.85);assert.ok(!p.seed.visible);
});

test('drinking mouth contacts the water, tongue laps and jaw moves',()=>{
  const g=new Game(()=>.5),h=g.selected,p=createHamster();
  Object.assign(h,{activity:'drink',target:null,heading:Math.PI,x:STATIONS.drink.x,y:STATIONS.drink.y+6.5});
  pose(p,h,g,.08);
  const water=new THREE.Vector3(...worldPosition(STATIONS.drink.x,STATIONS.drink.y,waterSurface(g.water)));
  const mouth=p.tongue.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.abs(mouth.y-water.y)<.025,`${mouth.y} vs water ${water.y}`);
  assert.ok(Math.hypot(mouth.x-water.x,mouth.z-water.z)<.47*.78,'mouth must reach inside the dish');
  assert.ok(p.tongue.visible);const jaw=p.jaw.position.y;
  pose(p,h,g,.26);assert.ok(!p.tongue.visible);assert.notEqual(p.jaw.position.y,jaw);
});

test('walking lifts alternating paws and sleeping closes eyes while the body breathes',()=>{
  const g=new Game(()=>.5),h=g.selected,p=createHamster();
  h.activity='walk';h.target={x:50,y:55,activity:'walk'};
  pose(p,h,g,1,0);const first=p.feet.map(f=>f.position.clone());
  pose(p,h,g,1.2,.27);
  assert.ok(p.feet.some((f,i)=>f.position.y>first[i].y+.04));
  assert.ok(p.feet.some((f,i)=>Math.abs(f.position.z-first[i].z)>.05));
  h.activity='sleep';h.target=null;pose(p,h,g,Math.PI/3.8);
  assert.ok(p.eyes.every(e=>!e.visible)&&p.lids.every(e=>e.visible));
  assert.ok(p.head.position.z<.2&&p.torso.scale.z<.85);
  const resting=p.torso.scale.y;pose(p,h,g,3*Math.PI/3.8);assert.ok(Math.abs(resting-p.torso.scale.y)>.006);
  const before=p.group.toJSON();animateHamster(p,h,g,0);assert.deepEqual(p.group.toJSON(),before,'paused poses must remain still');
});
