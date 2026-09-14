import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createScene, toAnsi } from '../src/scene.js';

execFileSync(process.execPath,[fileURLToPath(new URL('../tools/export-sprites.mjs',import.meta.url))]);
const data=JSON.parse(readFileSync(new URL('../src/sprites.json',import.meta.url),'utf8'));
const scene=createScene(data);
const repo=fileURLToPath(new URL('../../',import.meta.url));
execFileSync('make',['-C',repo+'/src','nyan10chan']);
test('all 24 browser frames exactly match the native C output',()=>{
  for(let i=0;i<24;i++) {
    const ppm=execFileSync(repo+'/src/nyan10chan',['--ppm',String(i)]);
    const header=Buffer.from('P6\n160 100\n255\n');
    assert.ok(ppm.subarray(0,header.length).equals(header));
    assert.deepEqual(Buffer.from(scene(i)),ppm.subarray(header.length),`frame ${i}`);
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
