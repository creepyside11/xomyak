import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';

const world = (x, y, elevation = 0) => new THREE.Vector3((x - 50) * .16, elevation + .08, (y - 50) * .16);
const mat = (color, roughness = .75, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
const sphere = new THREE.SphereGeometry(1, 20, 14);
const cube = new THREE.BoxGeometry(1, 1, 1);
function mesh(parent, geo, material, position, scale = [1,1,1]) {
  const m = new THREE.Mesh(geo, material); m.position.set(...position); m.scale.set(...scale);
  m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
const ball = (p,m,pos,s) => mesh(p,sphere,m,pos,s);
const box = (p,m,pos,s) => mesh(p,cube,m,pos,s);
function rod(parent, a, b, radius, material) {
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
  const m=mesh(parent,new THREE.CylinderGeometry(radius,radius,delta.length(),10),material,start.add(end).multiplyScalar(.5).toArray());
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()); return m;
}

// All in-enclosure objects are actual meshes. No scene/background billboards.
export function createHabitat() {
  const group=new THREE.Group();
  const wood=mat('#b77e4b'),lightWood=mat('#d4aa76'),darkWood=mat('#80573a'),bedding=mat('#e9cda0');
  const green=mat('#7b9564'),terra=mat('#cc855d'),blue=mat('#83aeba'),cream=mat('#f3e5cd');
  box(group,wood,[0,-.32,0],[14.4,.62,11.9]);
  box(group,bedding,[0,.015,0],[13.9,.13,11.4]);
  for(const z of [-5.85,5.85]) box(group,lightWood,[0,.27,z],[14.5,.5,.22]);
  for(const x of [-7.1,7.1]) box(group,lightWood,[x,.27,0],[.22,.5,11.6]);
  const glass=new THREE.MeshPhysicalMaterial({color:'#d1e8dc',transparent:true,opacity:.13,roughness:.1,metalness:0,depthWrite:false,side:THREE.DoubleSide});
  for(const z of [-5.8,5.8]) {const m=box(group,glass,[0,1,z],[14,1.25,.035]);m.castShadow=false;}
  for(const x of [-7.05,7.05]) {const m=box(group,glass,[x,1,0],[.035,1.25,11.6]);m.castShadow=false;}
  for(const x of [-7.1,7.1]) for(const z of [-5.85,5.85]) rod(group,[x,0,z],[x,1.7,z],.07,lightWood);
  // Hundreds of bedding chips share a single draw call.
  const chips=new THREE.InstancedMesh(new THREE.BoxGeometry(.09,.015,.035),mat('#d1af7b'),520);
  const dummy=new THREE.Object3D();let seed=19;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  for(let i=0;i<520;i++){dummy.position.set((random()-.5)*13.6,.093,(random()-.5)*11);dummy.rotation.y=random()*Math.PI;dummy.scale.setScalar(.7+random());dummy.updateMatrix();chips.setMatrixAt(i,dummy.matrix);}
  chips.receiveShadow=true;group.add(chips);

  // Open-front house with an actual interior and a removable-looking pitched roof.
  const house=new THREE.Group();house.position.copy(world(74,30));group.add(house);
  box(house,lightWood,[0,.72,-1.25],[3.15,1.45,.16]);
  for(const x of [-1.5,1.5])box(house,lightWood,[x,.72,0],[.16,1.45,2.6]);
  for(const x of [-1.23,1.23])box(house,lightWood,[x,.7,1.25],[.52,1.4,.14]);
  box(house,lightWood,[0,1.37,1.25],[2.1,.23,.14]);
  const roof=new THREE.Group();house.add(roof);
  for(const sign of [-1,1]){const m=box(roof,green,[sign*.79,1.78,0],[1.94,.16,2.95]);m.rotation.z=-sign*.35;}
  rod(roof,[0,2.09,-1.5],[0,2.09,1.5],.09,green);
  const bed=ball(house,mat('#bdac82'),[0,.06,0],[1.15,.13,.94]);
  for(let i=0;i<8;i++) {const a=i*Math.PI/4;ball(house,cream,[Math.cos(a)*.86,.12,Math.sin(a)*.64],[.26,.1,.17]);}

  // Drum rotates around Z; its lowest point is just above the bedding.
  const wheel=new THREE.Group();wheel.position.copy(world(25,40));group.add(wheel);
  box(wheel,darkWood,[0,.05,-.25],[2.6,.15,1.25]);
  for(const x of [-1,1])rod(wheel,[x,0,-.7],[0,1.43,-.7],.07,wood);
  const drum=new THREE.Group();drum.position.set(0,1.43,-.27);wheel.add(drum);
  for(const z of [-.38,.38])mesh(drum,new THREE.TorusGeometry(1.3,.065,10,48),terra,[0,0,z]);
  const back=mesh(drum,new THREE.CircleGeometry(1.3,48),mat('#b4714c',.8,{side:THREE.DoubleSide}),[0,0,-.39]);
  for(let i=0;i<28;i++){const a=i/28*Math.PI*2;const m=box(drum,lightWood,[Math.cos(a)*1.29,Math.sin(a)*1.29,0],[.18,.045,.76]);m.rotation.z=a+Math.PI/2;}
  for(let i=0;i<6;i++){const a=i*Math.PI/3;rod(drum,[0,0,-.41],[Math.cos(a)*1.23,Math.sin(a)*1.23,-.41],.035,wood);}
  ball(drum,wood,[0,0,-.32],[.15,.15,.12]);

  // Stairs and slide match the elevated simulation route exactly.
  const top=world(85,52),turn=world(80,52),end=world(65,68),entry=world(85,70);
  box(group,lightWood,[5.1,1.59,.32],[1.72,.18,1.6]);
  for(const x of [4.35,5.8])for(const z of [-.3,.95])rod(group,[x,.1,z],[x,1.6,z],.075,wood);
  for(let i=0;i<9;i++){const t=(i+.5)/9;box(group,lightWood,[entry.x, .08+t*1.6,entry.z+(top.z-entry.z)*t],[.93,.17,.35]);}
  rod(group,[entry.x-.5,.4,entry.z],[top.x-.5,2.05,top.z],.045,wood);
  rod(group,[entry.x+.5,.4,entry.z],[top.x+.5,2.05,top.z],.045,wood);
  const a=new THREE.Vector3(turn.x,1.7,turn.z),b=new THREE.Vector3(end.x,.12,end.z),direction=b.clone().sub(a);
  const ramp=new THREE.Group();ramp.position.copy(a.clone().add(b).multiplyScalar(.5));
  ramp.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),direction.clone().normalize());group.add(ramp);
  box(ramp,green,[0,0,0],[.95,.09,direction.length()]);
  for(const x of [-.47,.47])box(ramp,green,[x,.1,0],[.075,.23,direction.length()]);

  function bowl(x,y,color,r) {
    const p=world(x,y),g=new THREE.Group();g.position.copy(p);group.add(g);
    mesh(g,new THREE.CylinderGeometry(r*.83,r,.17,32),color,[0,.085,0]);
    const rim=mesh(g,new THREE.TorusGeometry(r*.85,.09,12,32),color,[0,.25,0]);rim.rotation.x=Math.PI/2;
    const contents=mesh(g,new THREE.CircleGeometry(r*.76,32),mat('#ddae66'),[0,.2,0]);contents.rotation.x=-Math.PI/2;
    return {g,contents};
  }
  const food=bowl(29,70,cream,.62),water=bowl(72,73,blue,.47);
  water.contents.material=mat('#78bed4',.2,{transparent:true,opacity:.85});
  const seeds=new THREE.InstancedMesh(sphere,mat('#a17442'),26);
  for(let i=0;i<26;i++){const a=random()*Math.PI*2,r=Math.sqrt(random())*.42;dummy.position.set(Math.cos(a)*r,.23+random()*.07,Math.sin(a)*r);dummy.rotation.set(random(),random()*3,random());dummy.scale.set(.045,.025,.075);dummy.updateMatrix();seeds.setMatrixAt(i,dummy.matrix);}
  food.g.add(seeds);
  const bottle=mesh(water.g,new THREE.CylinderGeometry(.23,.23,1.3,20),new THREE.MeshPhysicalMaterial({color:'#b8dce6',transparent:true,opacity:.45,roughness:.12,depthWrite:false}),[.5,1,.03]);
  mesh(water.g,new THREE.CylinderGeometry(.25,.25,.12,20),blue,[.5,1.7,.03]);
  rod(water.g,[.5,.33,.03],[.22,.2,.02],.04,mat('#a5b1b2',.25,{metalness:.7}));
  // Timber tunnel and a few leaves make the empty corners feel inhabited.
  const tunnel=mesh(group,new THREE.CylinderGeometry(.62,.62,1.45,24,1,true),mat('#c99f6c',.9,{side:THREE.DoubleSide}),[-1,.54,-3.8]);tunnel.rotation.z=Math.PI/2;
  for(const x of [-6.4,6.4]) for(const z of [-5,4.9]){
    ball(group,mat('#89936b'),[x,.14,z],[.37,.16,.32]);
    for(let i=0;i<4;i++){const leaf=ball(group,green,[x+Math.sin(i*2)*.21,.3+i*.055,z+Math.cos(i*2)*.21],[.13,.27,.05]);leaf.rotation.z=i*.8;}
  }
  return {group,drum,roof,food:food.contents,seeds,water:water.contents};
}

export function createHamster(type=0) {
  const g=new THREE.Group(),bodyRoot=new THREE.Group();g.add(bodyRoot);
  const fur=mat(['#ce954f','#94979e','#e8e1d4'][type]),belly=mat('#f6e9d5'),pink=mat('#dca5a0'),black=mat('#252727',.16),white=mat('#ffffff');
  const body=ball(bodyRoot,fur,[0,.38,-.08],[.34,.34,.49]);
  ball(bodyRoot,belly,[0,.26,.18],[.285,.23,.32]);
  const head=new THREE.Group();head.position.set(0,.47,.3);bodyRoot.add(head);
  ball(head,fur,[0,0,0],[.32,.27,.29]);
  for(const s of [-1,1]) {
    ball(head,fur,[s*.235,.23,-.06],[.135,.15,.08]);
    ball(head,pink,[s*.235,.238,-.015],[.085,.105,.035]);
    ball(head,belly,[s*.125,-.09,.205],[.17,.125,.14]);
    ball(head,black,[s*.16,.055,.232],[.05,.065,.032]);
    ball(head,white,[s*.17,.073,.256],[.012,.016,.006]);
    for(let i=0;i<3;i++)rod(head,[s*.12,-.045,.29],[s*(.34+i*.025),-.025+(i-1)*.052,.31-i*.035],.004,belly);
  }
  ball(head,pink,[0,-.035,.335],[.052,.035,.027]);
  ball(head,belly,[0,-.13,.31],[.035,.03,.018]);
  ball(bodyRoot,pink,[0,.28,-.55],[.065,.07,.075]);
  const feet=[];
  for(const x of [-.22,.22]) for(const z of [-.32,.25])feet.push(ball(bodyRoot,pink,[x,.075,z],[.11,.065,.14]));
  if(type===1)ball(bodyRoot,mat('#636770'),[0,.684,-.1],[.065,.035,.36]);
  if(type===2)ball(bodyRoot,mat('#d2c6ad'),[.04,.696,-.24],[.09,.017,.12]);
  const ring=mesh(g,new THREE.TorusGeometry(.53,.018,6,40),new THREE.MeshBasicMaterial({color:'#627e43'}),[0,.025,0]);ring.rotation.x=Math.PI/2;ring.visible=false;ring.castShadow=false;
  return {group:g,bodyRoot,head,feet,ring};
}

export class HabitatScene {
  constructor(container, game, onSelect) {
    this.container=container;this.game=game;this.onSelect=onSelect;this.pets=new Map();this.lastTime=game.elapsed;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#f3f1e8');
    this.camera=new THREE.PerspectiveCamera(39,1,.1,100);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.22;
    const canvas=this.renderer.domElement;canvas.className='scene-canvas';canvas.tabIndex=0;
    canvas.setAttribute('aria-label','3D-вольер. Перетаскивайте для вращения, колесо мыши для приближения. Стрелки вращают камеру, плюс и минус меняют масштаб. Хомяка также можно выбрать в списке.');
    container.prepend(canvas);
    this.scene.add(new THREE.HemisphereLight('#fff5df','#aab49c',2.7));
    const sun=new THREE.DirectionalLight('#fff0d7',3.5);sun.position.set(-4,11,5);sun.castShadow=true;
    sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.5,far:35});sun.shadow.normalBias=.035;sun.shadow.bias=-.0002;this.scene.add(sun);
    const fill=new THREE.DirectionalLight('#d5e4f0',1.1);fill.position.set(5,5,-8);this.scene.add(fill);
    const ground=mesh(this.scene,new THREE.PlaneGeometry(200,200),mat('#f0eee5'),[0,-.67,0]);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
    this.habitat=createHabitat();this.scene.add(this.habitat.group);
    this.controls=new OrbitControls(this.camera,canvas);this.controls.enableDamping=true;this.controls.dampingFactor=.09;
    this.controls.enablePan=false;this.controls.minPolarAngle=.15;this.controls.maxPolarAngle=Math.PI*.475;
    this.controls.minDistance=6;this.controls.maxDistance=36;this.controls.rotateSpeed=.65;
    this.controls.zoomSpeed=.75;this.controls.target.set(0,.3,0);
    this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();
    let down=null,maxTravel=0,multiTouch=false;const activePointers=new Set();
    canvas.addEventListener('pointerdown',e=>{activePointers.add(e.pointerId);if(activePointers.size>1)multiTouch=true;down={x:e.clientX,y:e.clientY};maxTravel=0;});
    canvas.addEventListener('pointermove',e=>{if(down)maxTravel=Math.max(maxTravel,Math.hypot(e.clientX-down.x,e.clientY-down.y));});
    canvas.addEventListener('pointerup',e=>{
      activePointers.delete(e.pointerId);
      if(down&&maxTravel<7&&!multiTouch&&e.button===0) this.pick(e.clientX,e.clientY);
      down=null;if(!activePointers.size)multiTouch=false;
    });
    canvas.addEventListener('pointercancel',e=>{activePointers.delete(e.pointerId);down=null;if(!activePointers.size)multiTouch=false;});
    canvas.addEventListener('keydown',e=>{
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key)) {
        e.preventDefault();if(e.key==='Home')this.resetCamera();
        else if(['+','=','-'].includes(e.key))this.zoom(e.key==='-'?1.15:1/1.15);
        else {const s=new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));s.theta+=e.key==='ArrowLeft'?.14:e.key==='ArrowRight'?-.14:0;s.phi=THREE.MathUtils.clamp(s.phi+(e.key==='ArrowUp'?-.1:e.key==='ArrowDown'?.1:0),.15,Math.PI*.475);this.camera.position.copy(new THREE.Vector3().setFromSpherical(s).add(this.controls.target));this.controls.update();}
      }
    });
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;this.showError('Графика приостановлена. Восстанавливаем 3D…');});
    canvas.addEventListener('webglcontextrestored',()=>{this.lost=false;document.getElementById('scene-error').hidden=true;});
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);
    this.resetCamera();this.resize();this.sync();
  }
  showError(message) {const e=document.getElementById('scene-error');e.textContent=message;e.hidden=false;}
  resize() {const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);}
  resetCamera() {
    const ratio=this.container.clientWidth/Math.max(1,this.container.clientHeight),distance=ratio<1?26:23;
    this.controls.target.set(0,.3,0);this.camera.position.set(distance*.56,distance*.66,distance*.64);this.controls.update();
  }
  zoom(factor) {const offset=this.camera.position.clone().sub(this.controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*factor,6,36));this.camera.position.copy(this.controls.target).add(offset);this.controls.update();}
  pick(x,y) {
    const rect=this.renderer.domElement.getBoundingClientRect();this.pointer.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);
    this.raycaster.setFromCamera(this.pointer,this.camera);
    const hit=this.raycaster.intersectObjects([...this.pets.values()].map(p=>p.group),true).find(h=>h.object.userData.petId!==undefined);
    if(hit)this.onSelect(hit.object.userData.petId);
  }
  sync() {
    for(const [id,pet] of this.pets)if(!this.game.hamsters.some(h=>h.id===id)){
      this.scene.remove(pet.group);pet.label.remove();
      const geometries=new Set(),materials=new Set();pet.group.traverse(o=>{if(o.geometry&&!([sphere,cube].includes(o.geometry)))geometries.add(o.geometry);if(o.material)materials.add(o.material);});
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.pets.delete(id);
    }
    for(const h of this.game.hamsters)if(!this.pets.has(h.id)){
      const pet=createHamster(h.type);pet.group.traverse(o=>{o.userData.petId=h.id;});
      this.scene.add(pet.group);const label=document.createElement('button');label.type='button';label.className='pet-label';label.innerHTML='<span></span><i><b></b></i>';
      label.addEventListener('click',()=>this.onSelect(h.id));this.container.append(label);pet.label=label;
      this.pets.set(h.id,pet);
    }
  }
  render() {
    if(this.lost)return;
    const t=this.game.elapsed,dt=t-this.lastTime;this.lastTime=t;
    const running=this.game.hamsters.some(h=>h.activity==='wheel');if(running)this.habitat.drum.rotation.z-=dt*3;
    this.habitat.food.visible=this.game.food>.5;this.habitat.seeds.count=Math.round(this.game.food/100*26);this.habitat.water.visible=this.game.water>.5;
    this.habitat.water.scale.setScalar(.3+.7*this.game.water/100);
    this.controls.update();
    for(const h of this.game.hamsters){
      const p=this.pets.get(h.id),moving=!!h.target||h.activity==='wheel'||h.activity==='slide';
      p.group.position.copy(world(h.x,h.y,h.elevation+(h.activity==='wheel'?.12:0)));
      const heading=h.activity==='wheel'?Math.PI/2:h.heading;
      p.group.rotation.y+=Math.atan2(Math.sin(heading-p.group.rotation.y),Math.cos(heading-p.group.rotation.y))*.16;
      const gait=t*(h.activity==='wheel'?21:13)+h.id;
      p.bodyRoot.position.y=moving?Math.sin(gait)*.025:Math.sin(t*2+h.id)*.009;
      p.bodyRoot.rotation.z=moving?Math.sin(gait)*.035:0;
      p.bodyRoot.scale.y=h.activity==='sleep'?.68:1;
      p.head.rotation.x=h.activity==='eat'?Math.sin(t*13)*.12:h.activity==='drink'?.25:h.activity==='sleep'?.22:0;
      p.feet.forEach((f,i)=>{f.rotation.x=moving?Math.sin(gait+(i===0||i===3?0:Math.PI))*.55:0;});
      p.ring.visible=h.id===this.game.selectedId;
      const v=p.group.position.clone().add(new THREE.Vector3(0,1.15,0)).project(this.camera);
      const visible=v.z>-1&&v.z<1&&Math.abs(v.x)<1.05&&Math.abs(v.y)<1.05;
      p.label.hidden=!visible;p.label.style.left=`${(v.x*.5+.5)*100}%`;p.label.style.top=`${(-v.y*.5+.5)*100}%`;
      p.label.classList.toggle('selected',h.id===this.game.selectedId);p.label.setAttribute('aria-pressed',h.id===this.game.selectedId);
      p.label.querySelector('span').textContent=h.name+(h.activity==='sleep'?' ᶻᶻ':'');
      const value=Math.min(h.hunger,h.thirst,h.health);const bar=p.label.querySelector('b');bar.style.width=`${value}%`;bar.style.background=value<30?'#c57656':'#809659';
      p.label.setAttribute('aria-label',`${h.name}, состояние ${Math.round(value)} процентов. Выбрать хомяка`);
    }
    this.renderer.render(this.scene,this.camera);
  }
}
