import * as THREE from './vendor/three.module.min.js';
export const sphere=new THREE.SphereGeometry(1,28,20),cube=new THREE.BoxGeometry(1,1,1);
export const mat=(color,roughness=.75,extra={})=>new THREE.MeshStandardMaterial({color,roughness,...extra});
export function mesh(parent,geometry,material,position,scale=[1,1,1]) {
  const m=new THREE.Mesh(geometry,material);m.position.set(...position);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
export const ball=(p,m,pos,s)=>mesh(p,sphere,m,pos,s);
export const box=(p,m,pos,s)=>mesh(p,cube,m,pos,s);
export function rod(parent,a,b,radius,material){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
  const m=mesh(parent,new THREE.CylinderGeometry(radius,radius,delta.length(),10),material,start.clone().add(end).multiplyScalar(.5).toArray());
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;
}
// Local Z follows the slope, local X remains horizontal: no unintended roll.
export function incline(parent,start,end,width,thickness,material,name){
  const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end),forward=b.clone().sub(a).normalize();
  const right=new THREE.Vector3(forward.z,0,-forward.x).normalize(),up=new THREE.Vector3().crossVectors(forward,right).normalize();
  const group=new THREE.Group();group.position.copy(a.clone().add(b).multiplyScalar(.5));
  group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,up,forward));parent.add(group);
  const floor=box(group,material,[0,-thickness/2,0],[width,thickness,a.distanceTo(b)]);floor.name=name;floor.userData.walkSurface=true;
  return {group,length:a.distanceTo(b),floor};
}
