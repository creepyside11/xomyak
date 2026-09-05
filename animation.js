import * as THREE from './vendor/three.module.min.js';
import {worldPosition,WHEEL,UNIT,FLOOR_Y,stairElevation,waterSurface} from './layout.js';

const lerp=THREE.MathUtils.lerp,clamp=THREE.MathUtils.clamp;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const up=new THREE.Vector3(0,1,0);
function bone(mesh,a,b){
  const delta=b.clone().sub(a);mesh.position.copy(a).add(b).multiplyScalar(.5);
  mesh.scale.y=Math.max(.001,delta.length());mesh.quaternion.setFromUnitVectors(up,delta.normalize());
}
export function actionDescription(h){
  if(h.target)return ({eat:'Идёт к корму',drink:'Идёт к воде',sleep:'Идёт в домик',slide:'Идёт к лестнице',wheel:'Идёт к колесу'})[h.target.activity]||'Исследует вольер';
  if(h.activity==='eat'){const t=h.activityTime%4;return t<1?'Берёт зёрнышко лапками':t<1.7?'Подносит корм ко рту':'Держит зёрнышко и жуёт';}
  if(h.activity==='drink')return 'Наклонился к воде · пьёт маленькими глотками';
  if(h.activity==='sleep')return 'Свернулся клубочком · спокойно дышит';
  if(h.activity==='slide')return ['Поднимается по ступеням','Разворачивается на площадке','Скользит вниз','Освобождает спуск'][h.slidePhase]||'На горке';
  if(h.activity==='wheel')return ({enter:'Забирается в колесо',run:'Бежит в колесе',exit:'Выходит из колеса'})[h.wheelPhase];
  return 'Остановился и принюхивается';
}

// Articulated poses use simulation time: pausing freezes the entire action.
// Stride is distance-driven, so a stopped hamster cannot keep walking in place.
export function animateHamster(p,h,game,dt){
  const alpha=p.posed?1-Math.exp(-Math.max(0,dt)*12):1;
  p.posed=true;
  const t=h.activityTime||0,globalTime=game.elapsed;
  const eating=h.activity==='eat',drinking=h.activity==='drink',sleeping=h.activity==='sleep';
  const sliding=h.activity==='slide'&&h.slidePhase===2;
  const moving=!!h.target||h.activity==='wheel'||(h.activity==='slide'&&!sliding);
  const gait=(h.stride||0)/.36*Math.PI*2+h.id*.8;
  const breath=Math.sin(t*1.9)*.012;
  const headPos=new THREE.Vector3(0,.37,.31),headRot=new THREE.Vector3();
  const feet=p.feet.map((_,i)=>new THREE.Vector3(i<2?-.22:.22,.037,i%2===0?-.335:.305));
  let bodyY=0,bodyZ=0,bodyPitch=h.pitch||0,bodyRoll=0;
  let torsoScale=new THREE.Vector3(1,1,1),eyesOpen=1,jawY=-.10;
  let seedVisible=false,seedSize=1,tongueVisible=false;
  const seedPosition=new THREE.Vector3(0,.20,.64);
  if(moving){
    feet.forEach((f,i)=>{
      const phase=((gait/(Math.PI*2)+(i===0||i===3?0:.5))%1+1)%1;
      // Stance moves backwards at body speed; swing lifts and returns the paw.
      f.z+=(phase<.62?lerp(.11,-.11,phase/.62):lerp(-.11,.11,smooth((phase-.62)/.38)));
      if(phase>=.62)f.y+=Math.sin((phase-.62)/.38*Math.PI)*.083;
    });
    bodyY=Math.sin(gait*2)*.006;bodyRoll=Math.sin(gait)*.012;
    headRot.x=Math.sin(gait*2)*.018;
  }else if(eating){
    const cycle=t%4,reach=smooth(cycle/.7),lift=smooth((cycle-.85)/.75);
    const lower=smooth((cycle-3.55)/.45);
    const hold=lift*(1-lower);
    bodyZ=-.035;torsoScale.set(1.035,1.07,.94);
    headPos.set(0,lerp(.29,.415,hold),lerp(.40,.32,hold));
    headRot.x=lerp(.16,-.06,hold);
    const pawY=lerp(.205,.325,hold),pawZ=lerp(.64,.58,hold);
    for(const i of [1,3])feet[i].set((i===1?-1:1)*lerp(.19,.047,reach),pawY,pawZ);
    seedPosition.set(0,pawY+.02,pawZ+.005);seedVisible=cycle>.7&&cycle<3.58;
    seedSize=lerp(1,.40,smooth((cycle-1.7)/1.8));
    if(cycle>1.65&&cycle<3.55){jawY-=Math.abs(Math.sin(t*19))*.012;headRot.x+=Math.sin(t*19)*.015;}
  }else if(drinking){
    const surface=waterSurface(game.water);
    bodyPitch=0;
    headRot.x=.9;
    headPos.set(0,surface+.083*Math.cos(.9)+.348*Math.sin(.9),.55);
    headPos.y+=Math.sin(t*12)*.004;
    for(const i of [1,3])feet[i].set(i===1?-.20:.20,.045,.41);
    jawY-=Math.abs(Math.sin(t*16))*.008;
    tongueVisible=Math.sin(t*16)>.05;
  }else if(sleeping){
    torsoScale.set(1.11, .89+breath,.81);
    headPos.set(.08,.245,.145);headRot.set(.20,-.72,-.15);
    for(const i of [0,2])feet[i].set(i===0?-.17:.17,.035,-.24);
    for(const i of [1,3])feet[i].set(i===1?-.095:.13,.04,.22);
    eyesOpen=0;bodyY=Math.sin(t*1.9)*.002;
  }else if(sliding){
    torsoScale.set(1,.88,1.03);headPos.y=.31;
    for(const f of feet){f.y=.055;f.z-=.035;}
  }else{
    headRot.y=Math.sin(t*.75+h.id)*.08;headRot.x=Math.sin(t*3)*.025;
    torsoScale.y=1+Math.sin(t*2.2)*.008;
  }
  if(!sleeping){const blink=(globalTime+h.id*1.31)%5.8;eyesOpen=blink<.15?Math.abs(blink-.075)/.075:1;}

  p.group.position.set(...worldPosition(h.x,h.y,h.elevation));
  const turn=Math.atan2(Math.sin(h.heading-p.group.rotation.y),Math.cos(h.heading-p.group.rotation.y));
  p.group.rotation.y+=turn*alpha;
  p.bodyRoot.position.lerp(new THREE.Vector3(0,bodyY,bodyZ),alpha);
  p.bodyRoot.rotation.x=lerp(p.bodyRoot.rotation.x,bodyPitch,alpha);
  p.bodyRoot.rotation.z=lerp(p.bodyRoot.rotation.z,bodyRoll,alpha);
  p.torso.scale.lerp(torsoScale,alpha);p.head.position.lerp(headPos,alpha);
  for(const axis of ['x','y','z'])p.head.rotation[axis]=lerp(p.head.rotation[axis],headRot[axis],alpha);
  p.jaw.position.y=lerp(p.jaw.position.y,jawY,alpha);
  p.eyes.forEach((eye,i)=>{eye.scale.y=.038*eyesOpen;eye.visible=eyesOpen>.08;p.lids[i].visible=eyesOpen<.2;});
  p.seed.visible=seedVisible;p.seed.position.copy(seedPosition);p.seed.scale.set(.029*seedSize,.046*seedSize,.018*seedSize);
  p.tongue.visible=tongueVisible;p.tongue.scale.z=.043*(.6+.4*Math.abs(Math.sin(t*16)));
  feet.forEach((f,i)=>{
    const local=new THREE.Vector3(f.x,0,f.z).applyAxisAngle(up,p.group.rotation.y);
    if(h.activity==='slide'&&h.slidePhase===0)f.y+=stairElevation((p.group.position.z+local.z)/UNIT+50)-h.elevation;
    if(h.activity==='wheel'&&h.wheelPhase==='run'){
      const dx=p.group.position.x+local.x-WHEEL.x;
      f.y+=WHEEL.centerY-Math.sqrt(Math.max(.01,(WHEEL.radius-.02)**2-dx**2))-FLOOR_Y-h.elevation;
    }
    p.feet[i].position.lerp(f,alpha);
    p.feet[i].rotation.x=lerp(p.feet[i].rotation.x,eating&&i%2===1?-.55:0,alpha);
    const limb=p.limbs[i],shoulder=limb.shoulder.clone();
    if(sleeping){shoulder.z*=.8;shoulder.y*=.9;}
    const paw=p.feet[i].position,elbow=shoulder.clone().lerp(paw,.5);
    elbow.x+=Math.sign(paw.x)*.025;elbow.z-=.035;
    bone(limb.upper,shoulder,elbow);bone(limb.lower,elbow,paw);
    limb.shoulderJoint.position.copy(shoulder);limb.elbowJoint.position.copy(elbow);
  });
  p.ring.visible=h.id===game.selectedId;
}
