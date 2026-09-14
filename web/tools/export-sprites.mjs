// The C header is the single source of truth for both renderers.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const source = readFileSync(new URL('../../src/nyan10chan_sprites.h', import.meta.url), 'utf8');
function array(name) {
  const literal = source.match(new RegExp(`${name}\\[[^=]+?=\\s*([\\s\\S]*?);`))?.[1];
  if (!literal) throw new Error(`Missing C array: ${name}`);
  return JSON.parse(literal.replaceAll('{', '[').replaceAll('}', ']'));
}
const palette = array('palette'), sprites = array('sprites');
if (sprites.length !== 6 || sprites.some(f => f.length !== 6400)) throw new Error('Invalid sprite dimensions');
mkdirSync(new URL('src/', root), { recursive: true });
writeFileSync(new URL('src/sprites.json', root), JSON.stringify({ palette, sprites }));
mkdirSync(new URL('public/', root), { recursive: true });
const upstream = readFileSync(new URL('../src/nyancat.c', root), 'utf8').split('*/')[0] + '*/\n';
writeFileSync(new URL('public/LICENSE.txt', root), upstream);
const licenses=['xterm','addon-fit','addon-webgl'].map(name=>
  `@xterm/${name} (MIT)\n\n`+readFileSync(new URL(`node_modules/@xterm/${name}/LICENSE`,root),'utf8'));
writeFileSync(new URL('public/THIRD-PARTY.txt',root),licenses.join('\n\n'));
const colors = readFileSync(new URL('../../src/nyan10chan_colors.h', import.meta.url), 'utf8');
const colorMap = [...colors.split('static const unsigned char ansi16')[0].matchAll(/\{\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\}/g)]
  .map(m => m.slice(1).map(Number));
if(colorMap.length !== 31) throw new Error('Incomplete terminal palette');
function colorArray(name) {
  const literal=colors.match(new RegExp(`${name}\\[[^=]+?=\\s*([\\s\\S]*?);`))?.[1];
  if(!literal) throw new Error(`Missing color array: ${name}`);
  return JSON.parse(literal.replaceAll('{','[').replaceAll('}',']'));
}
writeFileSync(new URL('src/colors.json', root), JSON.stringify({colors:colorMap,
  wingRegions:colorArray('wing_regions'),wingInks:colorArray('wing_inks'),ansi16:colorArray('ansi16'),wingMaterials:colorArray('wing_materials'),wingAccents:colorArray('wing_accents')}));
console.log('Exported the six approved C sprites and attribution for the browser.');
