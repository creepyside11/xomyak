import {STATIONS,SLIDE,WHEEL,worldPosition,FLOOR_Y,stairElevation,sleepSpot} from '../layout.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.min.js';
import { createHabitat, createHamster } from '../scene.js';
import { findPath, clearLine, blocked } from '../navigation.js';
import '../engine.js';
const { Game }=globalThis.HamsterGame;

test('all three hamster variants and habitat build real, finite 3D geometry',()=>{
  const habitat=createHabitat();
  for(const group of [habitat.group,...[0,1,2].map(i=>createHamster(i).group)]) {
    group.updateMatrixWorld(true);let meshes=0;
    group.traverse(o=>{assert.ok(o.matrixWorld.elements.every(Number.isFinite));if(o.isMesh){meshes++;assert.ok(o.geometry.attributes.position.count>0);}});
    const bounds=new THREE.Box3().setFromObject(group),size=bounds.getSize(new THREE.Vector3());
    assert.ok(size.x>0&&size.y>0&&size.z>0);assert.ok(meshes>20);
  }
  assert.ok(habitat.drum.children.length>20);
});
test('paths to the house, wheel, food and water avoid solid furniture',()=>{
  for(const start of [{x:50,y:52},{x:17,y:78},{x:89,y:24}]) {
    for(const goal of [{x:74,y:30},STATIONS.wheel,{x:37,y:70},{x:STATIONS.drink.x-6.5,y:STATIONS.drink.y},STATIONS.slide]) {
      const path=findPath(start,goal);assert.ok(path.length>0);let previous=start;
      for(const p of path){assert.ok(clearLine(previous,p));previous=p;}
      assert.deepEqual(path.at(-1),goal);
    }
  }
});
test('a hamster climbs and slides through real elevation, returns to ground and cannot share the slide',()=>{
  const g=new Game(()=>.5),h=g.selected,other=g.hamsters[1];
  g.go(h,'slide');g.go(other,'slide');assert.notEqual(other.target?.activity,'slide');
  let maximum=0,started=false,finished=false;
  for(let i=0;i<1400;i++){
    g.tick(.05);maximum=Math.max(maximum,h.elevation);
    if(h.activity==='slide')started=true;
    if(started&&!['slide','wheel'].includes(h.activity)){finished=true;break;}
  }
  assert.ok(maximum>=1.59);assert.ok(finished);assert.equal(h.elevation,0);
  assert.ok(!blocked(h.x,h.y));
});
test('navigation and simulation remain outside obstacles on the ground',()=>{
  let seed=7;const g=new Game(()=>{seed=seed*16807%2147483647;return seed/2147483647;});
  for(let i=0;i<7;i++)g.add();
  for(let t=0;t<1800;t++){
    g.tick(.25);
    for(const h of g.hamsters)if(!['slide','wheel'].includes(h.activity))assert.ok(!blocked(h.x,h.y),`${h.name} ${h.x},${h.y}`);
  }
});

test('slide surface has no sideways roll and exactly joins platform and floor',()=>{
  const h=createHabitat();h.group.updateMatrixWorld(true);
  const surface=h.group.getObjectByName('slide-surface'),platform=h.group.getObjectByName('slide-platform');
  const parent=surface.parent;
  const left=parent.localToWorld(new THREE.Vector3(-SLIDE.width/2,0,0));
  const right=parent.localToWorld(new THREE.Vector3(SLIDE.width/2,0,0));
  assert.ok(Math.abs(left.y-right.y)<1e-8,'ramp is twisted');
  const length=surface.scale.z;
  const top=parent.localToWorld(new THREE.Vector3(0,0,-length/2));
  const bottom=parent.localToWorld(new THREE.Vector3(0,0,length/2));
  assert.ok(top.distanceTo(new THREE.Vector3(...worldPosition(SLIDE.turn.x,SLIDE.turn.y,SLIDE.turn.e)))<1e-8);
  assert.ok(bottom.distanceTo(new THREE.Vector3(...worldPosition(SLIDE.end.x,SLIDE.end.y)))<1e-8);
  const bounds=new THREE.Box3().setFromObject(platform);
  assert.ok(Math.abs(top.y-bounds.max.y)<1e-7);
  assert.ok(top.x>bounds.min.x&&top.x<bounds.max.x&&top.z>bounds.min.z&&top.z<bounds.max.z);
});

test('stair movement matches all twelve actual tread heights',()=>{
  const h=createHabitat();h.group.updateMatrixWorld(true);const ray=new THREE.Raycaster();
  for(let i=0;i<SLIDE.steps;i++){
    const y=SLIDE.entry.y+(SLIDE.top.y-SLIDE.entry.y)*(i+.5)/SLIDE.steps;
    const [x,,z]=worldPosition(SLIDE.entry.x,y);
    ray.set(new THREE.Vector3(x,4,z),new THREE.Vector3(0,-1,0));
    const hit=ray.intersectObject(h.group.getObjectByName(`stair-${i}`))[0];assert.ok(hit);
    assert.ok(Math.abs(hit.point.y-(FLOOR_Y+stairElevation(y)))<.002);
  }
});

test('wheel has a continuous tread and hamster enters and exits without teleporting',()=>{
  const h=createHabitat();h.group.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(WHEEL.x,.9,WHEEL.z),new THREE.Vector3(0,-1,0));
  const hit=ray.intersectObject(h.group.getObjectByName('wheel-tread'))[0];assert.ok(hit);
  assert.ok(Math.abs(hit.point.y-(WHEEL.centerY-WHEEL.radius))<.005);
  const g=new Game(()=>.5),pet=g.selected;g.go(pet,'wheel');let ran=false,exited=false,previous={...pet};
  for(let i=0;i<1400;i++){
    g.tick(.05);
    assert.ok(Math.hypot(pet.x-previous.x,pet.y-previous.y)<.31);
    assert.ok(Math.abs(pet.elevation-previous.elevation)<.03);
    if(pet.wheelPhase==='run')ran=true;
    if(ran&&pet.activity!=='wheel'){exited=true;break;}previous={...pet};
  }
  assert.ok(ran&&exited);assert.equal(pet.elevation,0);assert.ok(!blocked(pet.x,pet.y));
});

test('all ten feeding, drinking and sleeping spots are reachable',()=>{
  const g=new Game(()=>.5);for(let i=0;i<7;i++)g.add();
  for(const activity of ['eat','drink','sleep'])for(const pet of g.hamsters){
    pet.x=50;pet.y=52;g.go(pet,activity);
    assert.equal(pet.target?.activity,activity,`${pet.name} cannot reach ${activity}`);
    assert.ok(!blocked(pet.target.x,pet.target.y));
  }
  for(let a=0;a<10;a++)for(let b=a+1;b<10;b++){
    const pa=sleepSpot(a),pb=sleepSpot(b);assert.ok(Math.hypot(pa.x-pb.x,pa.y-pb.y)*.16>.7);
  }
});
