// One coordinate system for furniture, walking surfaces and autonomous movement.
export const FLOOR_Y = .08;
export const UNIT = .16;
export const waterSurface=level=>.06+.025*Math.max(0,Math.min(100,level))/100;
export const worldPosition = (x,y,e=0) => [(x-50)*UNIT,FLOOR_Y+e,(y-50)*UNIT];
export const planPosition = (x,z,e=0) => ({x:x/UNIT+50,y:z/UNIT+50,e});
export const HOUSE = {x:3.4,z:-3.15,width:4,depth:3.1,wallHeight:1.45,wall:.14};
export const WHEEL = {x:-4,z:-1.65,radius:1.3,centerY:1.6,depth:1.1};
WHEEL.entry = planPosition(WHEEL.x,-.42);
WHEEL.run = planPosition(WHEEL.x,WHEEL.z,WHEEL.centerY-WHEEL.radius-FLOOR_Y+.045);
export const SLIDE = {
  entry:planPosition(5.44,3.6),
  top:planPosition(5.44,.32,1.6),
  turn:planPosition(4.8,.32,1.6),
  end:planPosition(2.4,2.88),
  steps:12,width:1.05,deckThickness:.12,
};
// The slide is reserved until the whole body has cleared its landing.
const rampDX=SLIDE.end.x-SLIDE.turn.x,rampDY=SLIDE.end.y-SLIDE.turn.y;
const rampLength=Math.hypot(rampDX,rampDY);
SLIDE.exit={x:SLIDE.end.x+rampDX/rampLength*.95/UNIT,y:SLIDE.end.y+rampDY/rampLength*.95/UNIT,e:0};
export const RAMP_OBSTACLE={
  x:(SLIDE.turn.x+SLIDE.end.x)/2,y:(SLIDE.turn.y+SLIDE.end.y)/2,
  dx:rampDX/rampLength,dy:rampDY/rampLength,
  halfWidth:(SLIDE.width/2+.65)/UNIT,halfLength:rampLength/2+.65/UNIT,
};
export const stairElevation = (y) => {
  const t=Math.max(0,Math.min(1,(SLIDE.entry.y-y)/(SLIDE.entry.y-SLIDE.top.y)));
  return t===0?0:Math.ceil(t*SLIDE.steps-1e-8)/SLIDE.steps*SLIDE.top.e;
};
export const STATIONS = {
  eat:{x:29,y:70},drink:planPosition(-.15,3.75),sleep:planPosition(HOUSE.x,HOUSE.z),
  wheel:WHEEL.entry,slide:SLIDE.entry,
};
export const sleepSpot = i => planPosition(HOUSE.x-1.48+(i%5)*.74,HOUSE.z-.69+Math.floor(i/5)*1.32,.06);
export const HOUSE_WALLS = [
  {center:[HOUSE.x,FLOOR_Y+HOUSE.wallHeight/2,HOUSE.z-HOUSE.depth/2],size:[HOUSE.width+.14,HOUSE.wallHeight,.14]},
  ...[-1,1].map(s=>({center:[HOUSE.x+s*HOUSE.width/2,FLOOR_Y+HOUSE.wallHeight/2,HOUSE.z],size:[.14,HOUSE.wallHeight,HOUSE.depth]})),
  ...[-1,1].map(s=>({center:[HOUSE.x+s*1.72,FLOOR_Y+.64,HOUSE.z+HOUSE.depth/2],size:[.55,1.28,.14]})),
];
const rectangle = (x0,z0,x1,z1,margin=.29) => [
  (x0-margin)/UNIT+50,(z0-margin)/UNIT+50,(x1+margin)/UNIT+50,(z1+margin)/UNIT+50,
];
export const OBSTACLES = [
  ...HOUSE_WALLS.map(({center:[x,,z],size:[w,,d]})=>rectangle(x-w/2,z-d/2,x+w/2,z+d/2)),
  rectangle(WHEEL.x-1.36,WHEEL.z-.62,WHEEL.x+1.36,WHEEL.z+.62),
  rectangle(4.2,-.48,6.03,3.2), // platform and stair approach; entry is outside
  rectangle(-1.77,-4.4,-.23,-3.16), // tunnel
  rectangle(-3.36-.62,3.2-.62,-3.36+.62,3.2+.62,.16),
  rectangle(-.15-.47,3.75-.47,-.15+.47,3.75+.47,.16),
];

export const groundElevation=(x,y)=>{const [wx,,wz]=worldPosition(x,y);return Math.abs(wx-HOUSE.x)<1.8&&Math.abs(wz-HOUSE.z)<1.36?.05:0;};
