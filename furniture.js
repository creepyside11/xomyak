import * as THREE from './vendor/three.module.min.js';
import {FLOOR_Y,HOUSE,HOUSE_WALLS,WHEEL,SLIDE,worldPosition,STATIONS} from './layout.js';
import {woodMaterial,beddingMaterial} from './materials.js';
import {mesh,box,ball,rod,incline,mat,sphere} from './geometry.js';

export function createHabitat(){
  const group=new THREE.Group(),wood=woodMaterial('#a88c68'),birch=woodMaterial('#d1ba92'),darkWood=woodMaterial('#82705a');
  const metal=mat('#8e9492',.33,{metalness:.65}),ceramic=mat('#b8b5a9',.35),bedding=beddingMaterial();
  box(group,wood,[0,-.32,0],[14.4,.62,11.9]);
  const floor=box(group,bedding,[0,.015,0],[13.9,.13,11.4]);floor.name='bedding';floor.userData.walkSurface=true;
  for(const z of [-5.85,5.85])box(group,birch,[0,.23,z],[14.5,.42,.22]);
  for(const x of [-7.1,7.1])box(group,birch,[x,.23,0],[.22,.42,11.6]);
  const glass=new THREE.MeshPhysicalMaterial({color:'#e4e9e8',transparent:true,opacity:.095,roughness:.1,metalness:.02,depthWrite:false,side:THREE.DoubleSide});
  for(const z of [-5.8,5.8]){const m=box(group,glass,[0,1,z],[14,1.4,.035]);m.castShadow=false;}
  for(const x of [-7.05,7.05]){const m=box(group,glass,[x,1,0],[.035,1.4,11.6]);m.castShadow=false;}
  for(const x of [-7.1,7.1])for(const z of [-5.85,5.85])rod(group,[x,.1,z],[x,1.7,z],.042,metal);
  const chips=new THREE.InstancedMesh(new THREE.BoxGeometry(.115,.016,.045),woodMaterial('#e1ceaa'),1800),dummy=new THREE.Object3D();
  let seed=19;const random=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
  for(let i=0;i<1800;i++){dummy.position.set((random()-.5)*13.7,FLOOR_Y+.01,(random()-.5)*11.2);dummy.rotation.set((random()-.5)*.5,random()*Math.PI,(random()-.5)*.4);dummy.scale.set(.6+random(),1,.7+random());dummy.updateMatrix();chips.setMatrixAt(i,dummy.matrix);chips.setColorAt(i,new THREE.Color().setScalar(.78+random()*.22));}
  chips.receiveShadow=true;group.add(chips);

  for(const wall of HOUSE_WALLS)box(group,birch,wall.center,wall.size);
  const frontZ=HOUSE.z+HOUSE.depth/2;
  box(group,birch,[HOUSE.x,FLOOR_Y+1.38,frontZ],[3.4,.14,.14]);
  const roof=new THREE.Group();group.add(roof);
  const eaveY=FLOOR_Y+HOUSE.wallHeight,ridgeY=eaveY+.64,roofHalf=2.18;
  for(const s of [-1,1]){
    const center=[HOUSE.x+s*roofHalf/2,(eaveY+ridgeY)/2,HOUSE.z];
    const roofMat=woodMaterial('#b6a384');
    const panel=box(roof,roofMat,center,[Math.hypot(roofHalf,ridgeY-eaveY),.10,HOUSE.depth+.36]);panel.rotation.z=-s*Math.atan2(ridgeY-eaveY,roofHalf);
    for(let j=0;j<5;j++){const z=HOUSE.z-HOUSE.depth/2+j*HOUSE.depth/4;rod(roof,[HOUSE.x,ridgeY+.065,z],[HOUSE.x+s*roofHalf,eaveY+.065,z],.015,darkWood);}
  }
  rod(roof,[HOUSE.x,ridgeY+.055,HOUSE.z-1.75],[HOUSE.x,ridgeY+.055,HOUSE.z+1.75],.055,birch);
  const bed=box(group,mat('#b4a78b',1),[HOUSE.x,FLOOR_Y+.025,HOUSE.z],[3.6,.05,2.72]);bed.name='sleep-bed';bed.userData.walkSurface=true;

  const wheel=new THREE.Group();wheel.position.set(WHEEL.x,0,WHEEL.z);group.add(wheel);
  box(wheel,darkWood,[0,FLOOR_Y+.055,-.12],[2.9,.11,1.55]);
  for(const x of [-1.04,1.04])rod(wheel,[x,FLOOR_Y+.11,-.75],[0,WHEEL.centerY,-.75],.055,metal);
  rod(wheel,[0,WHEEL.centerY,-.85],[0,WHEEL.centerY,.08],.06,metal);
  const drum=new THREE.Group();drum.position.set(0,WHEEL.centerY,0);wheel.add(drum);
  const tread=mesh(drum,new THREE.CylinderGeometry(WHEEL.radius,WHEEL.radius,WHEEL.depth,80,1,true),woodMaterial('#b7a17e'),[0,0,0]);
  tread.material.side=THREE.DoubleSide;tread.rotation.x=Math.PI/2;tread.name='wheel-tread';tread.userData.walkSurface=true;
  for(const z of [-WHEEL.depth/2,WHEEL.depth/2])mesh(drum,new THREE.TorusGeometry(WHEEL.radius,.042,10,80),birch,[0,0,z]);
  const back=mesh(drum,new THREE.CircleGeometry(WHEEL.radius,64),woodMaterial('#c4ad86'),[0,0,-WHEEL.depth/2]);back.material.side=THREE.DoubleSide;
  for(let i=0;i<40;i++){const a=i*Math.PI*2/40;const slat=box(drum,birch,[Math.cos(a)*(WHEEL.radius-.012),Math.sin(a)*(WHEEL.radius-.012),0],[.06,.016,WHEEL.depth-.05]);slat.rotation.z=a+Math.PI/2;}
  ball(drum,metal,[0,0,-WHEEL.depth/2+.04],[.1,.1,.07]);

  const entry=worldPosition(SLIDE.entry.x,SLIDE.entry.y),top=worldPosition(SLIDE.top.x,SLIDE.top.y,SLIDE.top.e),turn=worldPosition(SLIDE.turn.x,SLIDE.turn.y,SLIDE.turn.e),end=worldPosition(SLIDE.end.x,SLIDE.end.y);
  const platform=box(group,birch,[5.1,top[1]-.06,.32],[1.8,.12,1.6]);platform.name='slide-platform';platform.userData.walkSurface=true;
  for(const x of [4.3,5.9])for(const z of [-.38,1.02])rod(group,[x,FLOOR_Y,z],[x,top[1]-.1,z],.065,wood);
  const stepDepth=(entry[2]-top[2])/SLIDE.steps;
  for(let i=0;i<SLIDE.steps;i++){
    const stepTop=FLOOR_Y+(i+1)/SLIDE.steps*SLIDE.top.e,z=entry[2]-(i+.5)*stepDepth;
    const step=box(group,birch,[entry[0],stepTop-.047,z],[1.02,.094,stepDepth+.003]);step.name=`stair-${i}`;step.userData.walkSurface=true;
  }
  for(const s of [-1,1]){
    const x=entry[0]+s*.43;
    incline(group,[x,FLOOR_Y-.02,entry[2]],[x,top[1]-.1,top[2]],.09,.11,wood,`stair-stringer-${s}`);
    rod(group,[entry[0]+s*.58,FLOOR_Y+.25,entry[2]],[top[0]+s*.58,top[1]+.25,top[2]],.038,darkWood);
    for(const t of [.12,.48,.88]){
      const z=entry[2]+(top[2]-entry[2])*t,y=FLOOR_Y+SLIDE.top.e*t;
      rod(group,[x,y-.05,z],[entry[0]+s*.58,y+.25,z],.025,darkWood);
    }
  }
  const ramp=incline(group,turn,end,SLIDE.width,SLIDE.deckThickness,woodMaterial('#bdac8c'),'slide-surface');
  for(const x of [-SLIDE.width/2,SLIDE.width/2])box(ramp.group,birch,[x,.08,0],[.06,.18,ramp.length]);
  rod(group,[turn[0],FLOOR_Y,turn[2]],[turn[0],turn[1]-.10,turn[2]],.055,wood);

  function bowl(point,r,material,height=.27){
    const g=new THREE.Group();g.position.set(...worldPosition(point.x,point.y));group.add(g);
    const profile=[[0,0],[r*.8,0],[r,.035],[r,.22],[r*.94,.27],[r*.85,.25],[r*.77,.08],[0,.08]].map(([x,y])=>new THREE.Vector2(x,y*height/.27));
    mesh(g,new THREE.LatheGeometry(profile,48),material,[0,0,0]);
    const contents=mesh(g,new THREE.CircleGeometry(r*.78,40),mat('#b79461'),[0,.17,0]);contents.rotation.x=-Math.PI/2;
    return {g,contents};
  }
  const food=bowl(STATIONS.eat,.62,ceramic),water=bowl(STATIONS.drink,.47,mat('#909c9d',.28),.105);
  water.contents.material=mat('#abc8ca',.13,{metalness:.18,transparent:true,opacity:.9});
  const seeds=new THREE.InstancedMesh(sphere,mat('#a2845d'),48);
  for(let i=0;i<48;i++){const a=random()*Math.PI*2,r=Math.sqrt(random())*.44;dummy.position.set(Math.cos(a)*r,.18+random()*.025,Math.sin(a)*r);dummy.rotation.set(random(),random()*3,random());dummy.scale.set(.039,.023,.065);dummy.updateMatrix();seeds.setMatrixAt(i,dummy.matrix);seeds.setColorAt(i,new THREE.Color().setScalar(.65+random()*.35));}food.g.add(seeds);
  const ripples=[];
  for(let i=0;i<3;i++){
    const ring=mesh(water.g,new THREE.RingGeometry(.31,.322,48),new THREE.MeshBasicMaterial({color:'#f5ffff',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}),[0,.174,0]);
    ring.rotation.x=-Math.PI/2;ring.castShadow=false;ripples.push(ring);
  }
  const tunnel=mesh(group,new THREE.CylinderGeometry(.55,.55,1.45,40,1,true),woodMaterial('#a38c68'),[-1,FLOOR_Y+.55,-3.8]);tunnel.material.side=THREE.DoubleSide;tunnel.rotation.z=Math.PI/2;
  return {group,drum,roof,food:food.contents,seeds,water:water.contents,ripples};
}
