// Ground navigation uses the same coordinates as the furniture in scene.js.
const OBSTACLES = [
  [38, 22, 49, 30], // timber tunnel
  [15, 23, 34, 37], // wheel back and support
  [63, 19, 85, 22], [63, 19, 66, 38], [82, 19, 85, 38], // house walls, open doorway
  [75, 46, 90, 64], // elevated slide platform; approached from the stairs
  [24, 65, 34, 75], // food bowl
  [68, 69, 76, 77], // water bowl
];
const BOUNDS = { minX: 9, maxX: 91, minY: 15, maxY: 85 };
function blocked(x, y) {
  return x < 9 || x > 91 || y < 15 || y > 85 || OBSTACLES.some(([a,b,c,d]) => x >= a && x <= c && y >= b && y <= d);
}
function clearLine(a, b) {
  if (blocked(a.x,a.y) || blocked(b.x,b.y)) return false;
  // Exact segment/rectangle intersection: sampled rays can cut a thin corner.
  for (const [x0,y0,x1,y1] of OBSTACLES) {
    let low=0,high=1;
    for (const [origin,delta,min,max] of [[a.x,b.x-a.x,x0,x1],[a.y,b.y-a.y,y0,y1]]) {
      if(Math.abs(delta)<1e-10) {if(origin<min||origin>max){low=2;break;}}
      else {const t0=(min-origin)/delta,t1=(max-origin)/delta;low=Math.max(low,Math.min(t0,t1));high=Math.min(high,Math.max(t0,t1));}
    }
    if(low<=high) return false;
  }
  return true;
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
