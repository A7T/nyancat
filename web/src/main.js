import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import data from './sprites.json';
import { createScene, toAnsi } from './scene.js';
import './style.css';

const $=id=>document.getElementById(id);
const terminal=new Terminal({
  fontFamily:'"SFMono-Regular", Consolas, "Liberation Mono", monospace',
  fontSize:12, lineHeight:1, letterSpacing:0, cursorBlink:true,
  theme:{background:'#003969',foreground:'#e5f0fa',cursor:'#d7e9f6',selectionBackground:'#98c1e650'},
  scrollback:300, convertEol:true, allowProposedApi:false,
});
const fit=new FitAddon();terminal.loadAddon(fit);terminal.open($('terminal'));
try {
  const webgl=new WebglAddon();
  webgl.onContextLoss(()=>webgl.dispose());
  terminal.loadAddon(webgl);
} catch {
  // xterm retains its DOM renderer if WebGL is unavailable.
}
terminal.textarea?.setAttribute('aria-label','终端输入');
const scene=createScene(data);
let mode='animation',playing=!matchMedia('(prefers-reduced-motion: reduce)').matches;
let tick=0,delay=90,mode256=false,busy=false,dirty=true,clear=true;
let lastTime=performance.now(),limit=0,shown=0,countedTick=-1,line='',history=[],historyIndex=0;

function syncControls() {
  $('status').textContent=mode==='shell'?'命令行 · 输入 help 查看命令':playing?'飞行中 · 歼10娘':'已暂停 · 歼10娘';
  $('terminal').dataset.mode=mode;
  $('terminal').dataset.playing=String(playing);
  $('terminal').setAttribute('aria-label',mode==='shell'?'nyan10chan 命令行':'歼10娘像素动画终端');
}
function geometry() {
  // Smaller cells for the artwork; readable command-line type at every width.
  terminal.options.fontSize=mode==='shell'?14:innerWidth<600?9:12;
  fit.fit();
  dirty=true;clear=true;
}
new ResizeObserver(geometry).observe($('terminal'));
document.fonts.ready.then(geometry);

function draw() {
  if(busy || mode!=='animation') return;
  busy=true;dirty=false;
  const frame=tick;
  if(frame!==countedTick) {shown++;countedTick=frame;}
  const output=(clear?'\x1b[0m\x1b[2J':'')+toAnsi(scene(frame),terminal.cols,terminal.rows,mode256);
  clear=false;
  terminal.write(output,()=>{busy=false;});
  $('terminal').dataset.frame=String(frame);
}
function animate(now) {
  if(mode==='animation' && !document.hidden && !busy) {
    if(playing && shown>0 && now-lastTime>=delay) {
      if(limit && shown>=limit) {enterShell(`Completed ${limit} frames.`);}
      else {tick++;dirty=true;lastTime=now;}
    }
    if(dirty) draw();
  }
  requestAnimationFrame(animate);
}
document.addEventListener('visibilitychange',()=>{lastTime=performance.now();});
function start({frames=0,ms=delay,color256=mode256}={}) {
  if(mode==='shell') terminal.write('\x1b[?1049h');
  mode='animation';playing=true;tick=0;limit=frames;shown=0;countedTick=-1;delay=ms;mode256=color256;
  dirty=true;clear=true;lastTime=performance.now();geometry();syncControls();
}
function toggle() {
  if(mode==='shell') return start();
  playing=!playing;lastTime=performance.now();syncControls();
}
const prompt=()=>terminal.write('\x1b[38;2;155;207;239mj10@browser\x1b[0m:~$ ');
function enterShell(message='') {
  if(mode==='shell') {terminal.focus();return;}
  mode='shell';playing=false;line='';geometry();
  terminal.write('\x1b[?1049l\x1b[0m\x1b[?25h\x1b[2J\x1b[H');
  terminal.writeln('J-10 / TERMINAL FLIGHT');
  terminal.writeln('浏览器本地命令行 · 输入 help 查看命令，nyan10chan 开始飞行。');
  if(message) terminal.writeln(message);
  terminal.writeln('');prompt();syncControls();terminal.focus();
}
function execute(command) {
  const parts=command.trim().split(/\s+/),name=parts.shift();
  if(!name) return;
  if(name==='help') {
    terminal.writeln('nyan10chan [--256] [-f N] [-d MS]  播放动画');
    terminal.writeln('credits                         原作与许可');
    terminal.writeln('clear                           清屏');
    terminal.writeln('动画中：Space 暂停，R 重播，Ctrl-C / Q 返回命令行。');
    terminal.writeln('这是浏览器内的动画命令解释器，不连接系统 shell 或远程主机。');
  } else if(name==='credits') {
    terminal.writeln('原作：无残弹的钢坦克 · 彩虹10有人机（x）');
    terminal.writeln('https://www.bilibili.com/opus/1111297816944181257');
    terminal.writeln('署名、非商业使用：https://www.bilibili.com/opus/1068864321750040592');
    terminal.writeln('原程序：K. Lange / klange/nyancat (NCSA)');
    terminal.writeln('终端模拟器：xterm.js (MIT)');
  } else if(name==='clear') terminal.write('\x1b[2J\x1b[H');
  else if(name==='nyan10chan' || name==='./nyan10chan') {
    let frames=0,ms=90,color256=false;
    for(let i=0;i<parts.length;i++) {
      if(parts[i]==='--256') color256=true;
      else if(parts[i]==='--help' || parts[i]==='-h') {
        terminal.writeln('nyan10chan [--256] [-f 1..10000000] [-d 1..10000]');return;
      } else if(['-f','--frames','-d','--delay'].includes(parts[i])) {
        const frameOption=['-f','--frames'].includes(parts[i]);
        const value=parts[++i],n=Number(value);
        if(!/^\d+$/.test(value??'') || !Number.isSafeInteger(n) || n<1 || n>(frameOption?10000000:10000)) {
          terminal.writeln('参数无效：请输入有效范围内的正整数。');return;
        }
        if(frameOption) frames=n;else ms=n;
      } else {terminal.writeln(`未知参数：${parts[i]}`);return;}
    }
    start({frames,ms,color256});
  } else terminal.writeln(`未知命令：${name}。输入 help 查看可用命令。`);
}
function replaceLine(next) {
  terminal.write('\r\x1b[2K');prompt();line=next;terminal.write(line);
}
terminal.onData(input=>{
  if(mode==='animation') {
    if(input==='\x03' || input.toLowerCase()==='q') enterShell('^C');
    else if(input===' ') toggle();
    else if(input.toLowerCase()==='r') start();
    else if(input.toLowerCase()==='f') fullscreen();
    return;
  }
  if(input==='\x1b[A') {historyIndex=Math.max(0,historyIndex-1);replaceLine(history[historyIndex]??'');return;}
  if(input==='\x1b[B') {historyIndex=Math.min(history.length,historyIndex+1);replaceLine(history[historyIndex]??'');return;}
  if(input.startsWith('\x1b')) return;
  for(const char of input) {
    if(mode!=='shell') break;
    if(char==='\r' || char==='\n') {
      const command=line;line='';terminal.writeln('');
      if(command.trim()) {history.push(command);history=history.slice(-100);historyIndex=history.length;}
      execute(command);if(mode==='shell') prompt();
    } else if(char==='\x03') {line='';terminal.writeln('^C');prompt();}
    else if(char==='\x0c') {terminal.write('\x1b[2J\x1b[H');prompt();terminal.write(line);}
    else if(char==='\x7f' || char==='\b') {if(line.length) {line=line.slice(0,-1);terminal.write('\b \b');}}
    // Commands are ASCII; ignore control sequences and cap pasted input.
    else if(char>=' ' && char<='~' && line.length<256) {line+=char;terminal.write(char);}
  }
});
async function fullscreen() {
  try {
    if(document.fullscreenElement) await document.exitFullscreen();
    else await document.querySelector('.workspace').requestFullscreen();
  } catch { $('status').textContent='当前浏览器不支持全屏。'; }
}
document.addEventListener('fullscreenchange',geometry);
$('terminal').addEventListener('pointerup',event=>{
  if(event.pointerType==='touch' && mode==='animation') toggle();
});
terminal.write('\x1b[?1049h\x1b[?25l');
geometry();syncControls();terminal.focus();requestAnimationFrame(animate);
// Development-only access to the parsed terminal buffer for integration tests.
if(import.meta.env.DEV) window.__j10Terminal=terminal;
