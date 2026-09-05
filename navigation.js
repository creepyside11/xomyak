// Ground navigation uses the same coordinates as the furniture in scene.js.
import { OBSTACLES, RAMP_OBSTACLE as ramp } from './layout.js';
const BOUNDS = { minX: 9, maxX: 91, minY: 15, maxY: 85 };
const rampLocal=p=>({x:(p.x-ramp.x)*ramp.dy-(p.y-ramp.y)*ramp.dx,y:(p.x-ramp.x)*ramp.dx+(p.y-ramp.y)*ramp.dy});
function intersects(a,b,[x0,y0,x1,y1]) {
  let low=0,high=1;
  for(const [origin,delta,min,max] of [[a.x,b.x-a.x,x0,x1],[a.y,b.y-a.y,y0,y1]]) {
    if(Math.abs(delta)<1e-10){if(origin<min||origin>max)return false;}
    else {const t0=(min-origin)/delta,t1=(max-origin)/delta;low=Math.max(low,Math.min(t0,t1));high=Math.min(high,Math.max(t0,t1));}
  }
  return low<=high;
}
function blocked(x, y) {
  const p=rampLocal({x,y});
  return x < 9 || x > 91 || y < 15 || y > 85 || (Math.abs(p.x)<=ramp.halfWidth&&Math.abs(p.y)<=ramp.halfLength) || OBSTACLES.some(([a,b,c,d]) => x >= a && x <= c && y >= b && y <= d);
}
function clearLine(a, b) {
  if (blocked(a.x,a.y) || blocked(b.x,b.y)) return false;
  // Exact segment/rectangle intersection: sampled rays can cut a thin corner.
  return !OBSTACLES.some(box=>intersects(a,b,box)) && !intersects(rampLocal(a),rampLocal(b),[-ramp.halfWidth,-ramp.halfLength,ramp.halfWidth,ramp.halfLength]);
}
function findPath(start, goal) {
  if (blocked(goal.x,goal.y)) return [];
  if (clearLine(start,goal)) return [{ ...goal }];
  const nearest = p => {
    let best = null, distance = Infinity;
    for(let x=10;x<=90;x+=2) for(let y=16;y<=84;y+=2) {
      const d=Math.hypot(x-p.x,y-p.y);
      if(d<distance && !blocked(x,y) && clearLine(p,{x,y})) {distance=d;best={x,y};}
    }
    return best;
  };
  const origin=nearest(start), finish=nearest(goal); if(!origin||!finish) return [];
  const key=p=>`${p.x},${p.y}`, open=[{...origin,g:0,f:0}], seen=new Map([[key(origin),0]]), parents=new Map();
  while(open.length) {
    open.sort((a,b)=>a.f-b.f); const p=open.shift();
    if(key(p)===key(finish)) {
      const path=[goal]; let cur=p;
      while(cur) {path.unshift({x:cur.x,y:cur.y});cur=parents.get(key(cur));}
      const smooth=[];let anchor=start;
      while(path.length) {let i=path.length-1;while(i>0&&!clearLine(anchor,path[i]))i--;anchor=path[i];smooth.push(anchor);path.splice(0,i+1);}
      return smooth;
    }
    for(const [dx,dy] of [[2,0],[-2,0],[0,2],[0,-2],[2,2],[-2,2],[2,-2],[-2,-2]]) {
      const q={x:p.x+dx,y:p.y+dy}; if(!clearLine(p,q))continue;
      const g=p.g+Math.hypot(dx,dy), k=key(q);if(g>=(seen.get(k)??Infinity))continue;
      seen.set(k,g);parents.set(k,p);open.push({...q,g,f:g+Math.hypot(q.x-finish.x,q.y-finish.y)});
    }
  }
  return [];
}
export { OBSTACLES, BOUNDS, blocked, clearLine, findPath };
