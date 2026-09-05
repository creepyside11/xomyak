import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';

import { worldPosition, waterSurface } from './layout.js';
import { animateHamster } from './animation.js';
import { mesh, sphere, cube, mat } from './geometry.js';
import { createHabitat } from './furniture.js';
import { createHamster } from './hamster.js';
export { createHabitat, createHamster };
const world=(x,y,e=0)=>new THREE.Vector3(...worldPosition(x,y,e));

export class HabitatScene {
  constructor(container, game, onSelect) {
    this.container=container;this.game=game;this.onSelect=onSelect;this.pets=new Map();this.lastTime=game.elapsed;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#e8e9e5');
    this.camera=new THREE.PerspectiveCamera(39,1,.1,100);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.0;
    const canvas=this.renderer.domElement;canvas.className='scene-canvas';canvas.tabIndex=0;
    canvas.setAttribute('aria-label','3D-вольер. Перетаскивайте для вращения, колесо мыши для приближения. Стрелки вращают камеру, плюс и минус меняют масштаб. Хомяка также можно выбрать в списке.');
    container.prepend(canvas);
    this.scene.add(new THREE.HemisphereLight('#eef0ee','#99958a',1.6));
    const sun=new THREE.DirectionalLight('#fff3de',2.4);sun.position.set(-4,11,5);sun.castShadow=true;
    sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.5,far:35});sun.shadow.normalBias=.035;sun.shadow.bias=-.0002;this.scene.add(sun);
    const fill=new THREE.DirectionalLight('#e3e8ee',.6);fill.position.set(5,5,-8);this.scene.add(fill);
    const ground=mesh(this.scene,new THREE.PlaneGeometry(200,200),mat('#e5e6e1'),[0,-.67,0]);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
    this.habitat=createHabitat();this.scene.add(this.habitat.group);
    this.controls=new OrbitControls(this.camera,canvas);this.controls.enableDamping=true;this.controls.dampingFactor=.09;
    this.controls.enablePan=false;this.controls.minPolarAngle=.15;this.controls.maxPolarAngle=Math.PI*.475;
    this.controls.minDistance=6;this.controls.maxDistance=36;this.controls.rotateSpeed=.65;
    this.controls.zoomSpeed=.75;this.controls.target.set(0,.3,0);
    this.controls.addEventListener('start',()=>{this.manualOrbit=true;this.followOffset=null;});
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
    this.following=false;this.controls.minDistance=3;
    const ratio=this.container.clientWidth/Math.max(1,this.container.clientHeight),distance=ratio<1?26:23;
    this.controls.target.set(0,.3,0);this.camera.position.set(distance*.56,distance*.66,distance*.64);this.controls.update();
  }
  zoom(factor) {const offset=this.camera.position.clone().sub(this.controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*factor,3,36));this.camera.position.copy(this.controls.target).add(offset);this.controls.update();}
  follow(enabled=true) {
    this.following=enabled;this.manualOrbit=false;this.followAction=null;
    if(!enabled){this.resetCamera();return;}
    const h=this.game.selected,target=world(h.x,h.y,h.elevation+.35);
    this.followOffset=this.actionView(h);this.controls.target.copy(target);this.camera.position.copy(target).add(this.followOffset);
    this.controls.update();
  }
  actionView(h){if(h.activity==='sleep')return new THREE.Vector3(.6,3.6,1.1);const a=h.heading;return new THREE.Vector3(Math.sin(a)*2.3+Math.cos(a)*2.1,2.0,Math.cos(a)*2.3-Math.sin(a)*2.1);}
  toggleRoof(){this.roofHidden=this.habitat.roof.visible;this.roofOverride=true;}
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
    const running=this.game.hamsters.some(h=>h.activity==='wheel'&&h.wheelPhase==='run');if(running)this.habitat.drum.rotation.z-=dt*3;
    this.habitat.food.visible=this.game.food>.5;this.habitat.seeds.count=Math.round(this.game.food/100*48);this.habitat.water.visible=this.game.water>.5;
    this.habitat.water.position.y=waterSurface(this.game.water);
    const drinking=this.game.hamsters.some(h=>h.activity==='drink');
    this.habitat.ripples.forEach((r,i)=>{
      const phase=(t*1.5+i/3)%1;r.visible=drinking&&this.game.water>.5;
      r.position.y=this.habitat.water.position.y+.004;r.scale.setScalar(.3+phase*.7);r.material.opacity=(1-phase)*.33;
    });
    const selected=this.game.selected;
    this.habitat.roof.visible=this.roofOverride?!this.roofHidden:!(this.following&&selected.activity==='sleep');
    if(this.following){
      const target=world(selected.x,selected.y,selected.elevation+.35);
      const shift=target.sub(this.controls.target).multiplyScalar(.14);
      this.controls.target.add(shift);this.camera.position.add(shift);
      const action=`${selected.id}:${selected.activity}`;
      if(action!==this.followAction){
        if(!this.manualOrbit&&['eat','drink','sleep'].includes(selected.activity))this.followOffset=this.actionView(selected);
        this.followAction=action;
      }
      if(this.followOffset){
        const goal=this.controls.target.clone().add(this.followOffset);this.camera.position.lerp(goal,.10);
        if(this.camera.position.distanceTo(goal)<.005)this.followOffset=null;
      }
    }
    this.controls.update();this.camera.updateMatrixWorld(true);
    for(const h of this.game.hamsters){
      const p=this.pets.get(h.id);
      animateHamster(p,h,this.game,dt);
      const v=p.group.position.clone().add(new THREE.Vector3(0,.98,0)).project(this.camera);
      const visible=v.z>-1&&v.z<1&&Math.abs(v.x)<1.05&&Math.abs(v.y)<1.05;
      p.label.hidden=!visible||(this.following&&h.id!==this.game.selectedId);p.label.style.left=`${(v.x*.5+.5)*100}%`;p.label.style.top=`${(-v.y*.5+.5)*100}%`;
      p.label.classList.toggle('selected',h.id===this.game.selectedId);p.label.setAttribute('aria-pressed',h.id===this.game.selectedId);
      p.label.querySelector('span').textContent=h.name+(h.activity==='sleep'?' ᶻᶻ':'');
      const value=Math.min(h.hunger,h.thirst,h.health);const bar=p.label.querySelector('b');bar.style.width=`${value}%`;bar.style.background=value<30?'#c57656':'#809659';
      p.label.setAttribute('aria-label',`${h.name}, состояние ${Math.round(value)} процентов. Выбрать хомяка`);
    }
    this.renderer.render(this.scene,this.camera);
  }
}
