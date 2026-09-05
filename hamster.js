import * as THREE from './vendor/three.module.min.js';
import {furMaterial} from './materials.js';
import {ball,rod,mesh,mat} from './geometry.js';

export function createHamster(type=0){
  const group=new THREE.Group(),bodyRoot=new THREE.Group();group.add(bodyRoot);
  const colors=['#b58e5a','#85817a','#e2dfd5'],fur=furMaterial(colors[type]),cream=furMaterial('#ded4bc');
  const skin=mat('#b9958d',.86),eye=mat('#131714',.075);
  const torso=new THREE.Group();bodyRoot.add(torso);
  ball(torso,fur,[0,.335,-.12],[.31,.29,.51]);
  ball(torso,cream,[0,.24,.04],[.265,.205,.38]);
  const head=new THREE.Group();head.position.set(0,.37,.31);bodyRoot.add(head);
  ball(head,fur,[0,0,0],[.235,.218,.255]);
  const eyes=[],lids=[];
  for(const s of [-1,1]){
    const ear=ball(head,fur,[s*.179,.174,-.074],[.097,.108,.049]);ear.rotation.z=-s*.18;
    const inner=ball(head,skin,[s*.18,.179,-.035],[.064,.072,.012]);inner.rotation.z=-s*.18;
    ball(head,cream,[s*.074,-.067,.194],[.105,.082,.14]);
    eyes.push(ball(head,eye,[s*.162,.036,.171],[.031,.038,.025]));
    const lid=ball(head,fur,[s*.162,.036,.176],[.034,.04,.026]);rod(lid,[-.65,-.04,.72],[.65,-.04,.72],.065,mat('#6d6255'));lid.visible=false;lids.push(lid);
    for(let i=0;i<4;i++)rod(head,[s*.083,-.036,.272],[s*(.285+i*.028),-.008+(i-1.5)*.038,.3-i*.031],.0025,mat('#d4cfbf',1));
  }
  ball(head,skin,[0,-.052,.327],[.034,.022,.023]);
  const jaw=ball(head,cream,[0,-.10,.249],[.067,.036,.076]);
  rod(jaw,[-.3,-.1,.68],[.3,-.1,.68],.035,mat('#8f7567'));
  const tongue=ball(head,skin,[0,-.083,.348],[.018,.008,.043]);tongue.visible=false;
  const seedMesh=ball(bodyRoot,mat('#92734a',.8),[0,.30,.58],[.029,.046,.018]);seedMesh.visible=false;
  seedMesh.rotation.x=.3;
  rod(seedMesh,[0,-.7,1.01],[0,.7,1.01],.04,mat('#c8b28b'));
  ball(torso,skin,[0,.22,-.61],[.038,.035,.051]);
  const feet=[],limbs=[];
  for(const x of [-.22,.22])for(const z of [-.37,.27]){
    const shoulder=new THREE.Vector3(x,.27,z-.025);
    const upper=mesh(bodyRoot,new THREE.CylinderGeometry(.073,.083,1,12),fur,[x,.18,z]);
    const lower=mesh(bodyRoot,new THREE.CylinderGeometry(.052,.035,1,12),fur,[x,.09,z]);
    const foot=new THREE.Group();foot.position.set(x,.037,z+.035);bodyRoot.add(foot);
    ball(foot,skin,[0,0,0],[.071,.037,.092]);
    for(let d=0;d<4;d++)ball(foot,skin,[(d-1.5)*.028,-.006,.074],[.016,.02,.042]);
    feet.push(foot);
    const shoulderJoint=ball(bodyRoot,fur,shoulder.toArray(),[.091,.092,.092]);
    const elbowJoint=ball(bodyRoot,fur,[x,.14,z],[.060,.060,.060]);
    limbs.push({shoulder,upper,lower,shoulderJoint,elbowJoint});
  }
  if(type===1)ball(torso,furMaterial('#514d44'),[0,.608,-.13],[.037,.019,.33]);
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
  torso.add(new THREE.LineSegments(fibres,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.42,depthWrite:false})));
  const ring=mesh(group,new THREE.TorusGeometry(.54,.012,6,48),new THREE.MeshBasicMaterial({color:'#89917b',transparent:true,opacity:.7}),[0,.013,0]);ring.rotation.x=Math.PI/2;ring.visible=false;ring.castShadow=false;
  return {group,bodyRoot,torso,head,feet,limbs,eyes,lids,jaw,tongue,seed:seedMesh,ring,posed:false};
}
