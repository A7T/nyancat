// Port of src/nyan10chan.c; covered by byte-for-byte C/JS frame comparisons.
export const WIDTH = 160, HEIGHT = 100;
export const POSES = [0,0,1,1,4,4,5,5,0,1,4,5,0,1,4,5,0,1,2,3,2,0,4,5];
const BOB = [0,0,-1,-1,0,0,1,1];
const STARS = [[18,15],[66,7],[135,20],[31,83],[121,91],[151,64],[7,57]];
export const RAINBOW = [[255,30,44],[255,153,0],[255,237,48],[63,237,34],[0,176,243],[113,57,249]];
export function createScene({palette, sprites}) {
  return tick => {
    const pixels = new Uint8Array(WIDTH * HEIGHT * 3);
    const put = (x,y,rgb) => {
      if(x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) pixels.set(rgb,(y*WIDTH+x)*3);
    };
    for(let i=0;i<WIDTH*HEIGHT;i++) pixels.set(palette[0],i*3);
    const dy = BOB[tick % 8];
    STARS.forEach(([sx, y],s) => {
      const x=(sx+WIDTH-(tick*2%WIDTH))%WIDTH, phase=(Math.floor(tick/3)+s)%4;
      const white=[238,255,255];
      if(phase!==3) put(x,y,white);
      if(phase===1 || phase===2) {
        const r=phase===1?1:3;
        put(x-r,y,white);put(x+r,y,white);put(x,y-r,white);put(x,y+r,white);
      }
    });
    // Stop beneath the torso, not in the face/left-arm gap.
    for(let x=0;x<110;x++) {
      const wave=Math.floor((x+(tick%8)*2)/10)%2;
      RAINBOW.forEach((rgb,band) => {
        for(let h=0;h<4;h++) put(x,39+wave*2+band*4+h+dy,rgb);
      });
    }
    const sprite=sprites[POSES[tick%24]];
    for(let y=0;y<80;y++) for(let x=0;x<80;x++) {
      const c=sprite[y*80+x];
      if(c) put(66+x,9+y+dy,palette[c]);
    }
    return pixels;
  };
}
const cache=new Map();
function nearest256(r,g,b) {
  const key=(r<<16)|(g<<8)|b;
  if(cache.has(key)) return cache.get(key);
  const ramp=[0,95,135,175,215,255];
  let best=16,distance=Infinity;
  for(let i=16;i<256;i++) {
    const n=i-16, red=i<232?ramp[Math.floor(n/36)]:8+10*(i-232);
    const green=i<232?ramp[Math.floor(n/6)%6]:red, blue=i<232?ramp[n%6]:red;
    const d=(red-r)**2+(green-g)**2+(blue-b)**2;
    if(d<distance) { best=i;distance=d; }
  }
  cache.set(key,best);return best;
}
export function toAnsi(pixels, columns, rows, mode256=false) {
  // Match the native renderer's aspect, sampling and centering.
  let w=columns,h=Math.floor(w*HEIGHT/WIDTH);
  if(h>(rows-1)*2) { h=(rows-1)*2;w=Math.floor(h*WIDTH/HEIGHT); }
  if(w<1 || h<2) return '';
  if(w>WIDTH) {w=WIDTH;h=HEIGHT;}
  const left=Math.floor((columns-w)/2),top=Math.floor((rows-Math.floor(h/2))/2);
  let out='\x1b[?25l',lastFg=-1,lastBg=-1;
  const escape=(offset,foreground) => {
    const [r,g,b]=pixels.subarray(offset,offset+3), key=(r<<16)|(g<<8)|b;
    if(key===(foreground?lastFg:lastBg)) return '';
    if(foreground) lastFg=key;else lastBg=key;
    return mode256?`\x1b[${foreground?38:48};5;${nearest256(r,g,b)}m`:
      `\x1b[${foreground?38:48};2;${r};${g};${b}m`;
  };
  for(let y=0;y<Math.floor(h/2);y++) {
    out+=`\x1b[${top+y+1};${left+1}H`;
    for(let x=0;x<w;x++) {
      const sx=Math.floor(x*WIDTH/w),sy=Math.floor(y*2*HEIGHT/h),by=Math.floor((y*2+1)*HEIGHT/h);
      out+=escape((sy*WIDTH+sx)*3,true)+escape((by*WIDTH+sx)*3,false)+'▀';
    }
  }
  return out+'\x1b[0m';
}
