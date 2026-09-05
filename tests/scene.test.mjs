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
    for(const goal of [{x:74,y:30},{x:25,y:40},{x:37,y:70},{x:65.5,y:73},{x:85,y:70}]) {
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
    if(started&&h.activity!=='slide'){finished=true;break;}
  }
  assert.ok(maximum>=1.59);assert.ok(finished);assert.equal(h.elevation,0);
  assert.ok(!blocked(h.x,h.y));
});
test('navigation and simulation remain outside obstacles on the ground',()=>{
  let seed=7;const g=new Game(()=>{seed=seed*16807%2147483647;return seed/2147483647;});
  for(let i=0;i<7;i++)g.add();
  for(let t=0;t<1800;t++){
    g.tick(.25);
    for(const h of g.hamsters)if(h.activity!=='slide')assert.ok(!blocked(h.x,h.y),`${h.name} ${h.x},${h.y}`);
  }
});
