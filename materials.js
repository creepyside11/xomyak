import * as THREE from './vendor/three.module.min.js';

// Small deterministic material maps: no network downloads or large texture assets.
const cache=new Map();
function texture(kind) {
  if(cache.has(kind))return cache.get(kind);
  const size=256,bytes=new Uint8Array(size*size*4);let seed=291;
  const random=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4;
    const grain=Math.sin(x*.48+Math.sin(y*.028)*1.4+Math.sin(y*.076)*.4);
    const fine=Math.sin(x*2.12+Math.sin(y*.022)*3);
    let value=kind==='wood'?.73+grain*.055+fine*.023+random()*.055:
      kind==='fur'?.79+Math.sin(x*1.7+Math.sin(y*.035)*2)*.075+random()*.085:
      .70+random()*.23;
    value=Math.max(0,Math.min(1,value));bytes[i]=bytes[i+1]=bytes[i+2]=Math.round(value*255);bytes[i+3]=255;
  }
  const map=new THREE.DataTexture(bytes,size,size,THREE.RGBAFormat);
  map.wrapS=map.wrapT=THREE.RepeatWrapping;map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;map.generateMipmaps=true;
  map.repeat.set(kind==='wood'?2:kind==='fur'?5:12,kind==='wood'?1:kind==='fur'?2:12);map.needsUpdate=true;
  cache.set(kind,map);return map;
}
export const woodMaterial=(color='#b39876')=>new THREE.MeshStandardMaterial({color,roughness:.86,map:texture('wood'),bumpMap:texture('wood'),bumpScale:.035});
export const beddingMaterial=()=>new THREE.MeshStandardMaterial({color:'#d5c5a5',roughness:1,map:texture('bedding'),bumpMap:texture('bedding'),bumpScale:.035});
export const furMaterial=(color)=>new THREE.MeshPhysicalMaterial({color,roughness:1,map:texture('fur'),bumpMap:texture('fur'),bumpScale:.012,sheen:.45,sheenColor:'#d1c5b1',sheenRoughness:1});
