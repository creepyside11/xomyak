import * as THREE from './vendor/three.module.min.js';
import {furMaterial} from './materials.js';
import {ball,rod,mesh,mat} from './geometry.js';

export function createHamster(type=0){
  const group=new THREE.Group(),bodyRoot=new THREE.Group();group.add(bodyRoot);
  const colors=['#b58e5a','#85817a','#e2dfd5'],fur=furMaterial(colors[type]),cream=furMaterial('#ded4bc');
  const skin=mat('#b9958d',.86),eye=mat('#131714',.075);
  ball(bodyRoot,fur,[0,.335,-.12],[.31,.29,.51]);
  ball(bodyRoot,cream,[0,.24,.04],[.265,.205,.38]);
  const head=new THREE.Group();head.position.set(0,.37,.31);bodyRoot.add(head);
  ball(head,fur,[0,0,0],[.235,.218,.255]);
  for(const s of [-1,1]){
    const ear=ball(head,fur,[s*.179,.174,-.074],[.097,.108,.049]);ear.rotation.z=-s*.18;
    const inner=ball(head,skin,[s*.18,.179,-.035],[.064,.072,.012]);inner.rotation.z=-s*.18;
    ball(head,cream,[s*.074,-.067,.194],[.105,.082,.14]);
    ball(head,eye,[s*.162,.036,.171],[.031,.038,.025]);
    for(let i=0;i<4;i++)rod(head,[s*.083,-.036,.272],[s*(.285+i*.028),-.008+(i-1.5)*.038,.3-i*.031],.0025,mat('#d4cfbf',1));
  }
  ball(head,skin,[0,-.052,.327],[.034,.022,.023]);
  rod(head,[-.025,-.088,.293],[.025,-.088,.293],.003,mat('#8f7567'));
  ball(bodyRoot,skin,[0,.22,-.61],[.038,.035,.051]);
  const feet=[];
  for(const x of [-.22,.22])for(const z of [-.37,.27]){
    const leg=ball(bodyRoot,fur,[x,.17,z],[.093,.12,.105]);
    const foot=new THREE.Group();foot.position.set(x,.037,z+.035);bodyRoot.add(foot);
    ball(foot,skin,[0,0,0],[.071,.037,.092]);
    for(let d=0;d<4;d++)ball(foot,skin,[(d-1.5)*.028,-.006,.074],[.016,.02,.042]);
    feet.push(foot);
  }
  if(type===1)ball(bodyRoot,furMaterial('#514d44'),[0,.608,-.13],[.037,.019,.33]);
  // Short directional fibres soften the outline without billboard fur cards.
  const positions=[],rgb=[],base=new THREE.Color(colors[type]);let seed=91+type;
  const random=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
  for(let i=0;i<1400;i++){
    const theta=random()*Math.PI*2,phi=Math.acos(random()*1.7-.7);
    const nx=Math.sin(phi)*Math.cos(theta),ny=Math.cos(phi),nz=Math.sin(phi)*Math.sin(theta);
    const x=nx*.312,y=.335+ny*.292,z=-.12+nz*.512;
    if(y<.15)continue;
    positions.push(x,y,z,x+nx*.013,y+ny*.012-.008,z+nz*.009-.018);
    const c=base.clone().multiplyScalar(.75+random()*.4);rgb.push(c.r,c.g,c.b,c.r*1.08,c.g*1.08,c.b*1.08);
  }
  const fibres=new THREE.BufferGeometry();fibres.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));fibres.setAttribute('color',new THREE.Float32BufferAttribute(rgb,3));
  bodyRoot.add(new THREE.LineSegments(fibres,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.42,depthWrite:false})));
  const ring=mesh(group,new THREE.TorusGeometry(.54,.012,6,48),new THREE.MeshBasicMaterial({color:'#89917b',transparent:true,opacity:.7}),[0,.013,0]);ring.rotation.x=Math.PI/2;ring.visible=false;ring.castShadow=false;
  return {group,bodyRoot,head,feet,ring};
}
