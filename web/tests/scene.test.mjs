import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

execFileSync(process.execPath,[fileURLToPath(new URL('../tools/export-sprites.mjs',import.meta.url))]);
const { createScene, toAnsi, toRgb } = await import('../src/scene.js');
const data=JSON.parse(readFileSync(new URL('../src/sprites.json',import.meta.url),'utf8'));
const scene=createScene(data);
const repo=fileURLToPath(new URL('../../',import.meta.url));
execFileSync('make',['-C',repo+'/src','nyan10chan']);
test('all 24 reference rasters match C in every color mode',()=>{
  for(const [flag,mode] of [['--truecolor',false],['--256',true],['--16',16]]) for(let i=0;i<24;i++) {
    const ppm=execFileSync(repo+'/src/nyan10chan',[flag,'--ppm',String(i)]);
    const header=Buffer.from('P6\n160 100\n255\n');
    assert.ok(ppm.subarray(0,header.length).equals(header));
    assert.deepEqual(Buffer.from(toRgb(scene(i),mode,i)),ppm.subarray(header.length),`frame ${i}`);
  }
});
test('ANSI truecolor and 256-color streams keep cursor and pixel cells',()=>{
  for(const [cols,rows] of [[160,51],[80,25],[35,18]]) {
    for(const mode256 of [false,true]) {
      const ansi=toAnsi(scene(0),cols,rows,mode256);
      assert.ok(ansi.startsWith('\x1b[?25l'));
      assert.ok(ansi.endsWith('\x1b[0m'));
      assert.ok(ansi.includes(mode256?';5;':';2;'));
      const cells=ansi.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g,'');
      assert.match(cells,/^▀+$/u);
      assert.ok(cells.length<=cols*rows);
    }
  }
  assert.equal(toAnsi(scene(0),1,1),'');
});

test('all color modes produce identical C and browser terminal frames',()=>{
  for(const [arg,mode] of [['--truecolor',false],['--256',true],['--16',16]]) {
    const output=execFileSync(repo+'/src/nyan10chan',[arg,'-f','24','-d','1'],{maxBuffer:8*1024*1024}).toString();
    const frames=output.split('\x1b[H').slice(1);
    assert.equal(frames.length,24);
    for(let tick=0;tick<24;tick++) {
      const c=frames[tick].replace(/\x1b\[0m$/,'');
      const js=toAnsi(scene(tick),80,25,mode,tick).replace(/^\x1b\[\?25l/,'').replace(/\x1b\[0m$/,'');
      assert.equal(js,c,`${arg} frame ${tick}`);
    }
  }
});

test('16-color skin stays white and all six smoke bands remain distinct',()=>{
  const skin=new Set(data.palette.slice(6,10).map(rgb=>rgb.join(',')));
  for(let tick=0;tick<24;tick++) {
    const rgb=scene(tick);
    const ppm=execFileSync(repo+'/src/nyan10chan',['--16','--ppm',String(tick)]);
    const limited=ppm.subarray(Buffer.byteLength('P6\n160 100\n255\n'));
    for(let i=0;i<rgb.length;i+=3) {
      if(skin.has(rgb.subarray(i,i+3).join(',')))
        assert.equal(limited.subarray(i,i+3).join(','),'255,255,255',`skin at frame ${tick}, pixel ${i/3}`);
    }
    if(tick===0) {
      const bands=Array.from({length:6},(_,band)=>{
        const offset=(39+band*4)*160*3;
        return limited.subarray(offset,offset+3).join(',');
      });
      assert.equal(new Set(bands).size,6);
    }
  }
});
