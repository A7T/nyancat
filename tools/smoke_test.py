"""Integration checks: exports, arguments, finite output and PTY cleanup."""
import fcntl
import os
from pathlib import Path
import pty
import select
import signal
import struct
import subprocess
import termios
import time

binary = str(Path(__file__).resolve().parents[1]/'src/nyan10chan')
exports = [subprocess.check_output([binary,'--ppm',str(i)]) for i in range(24)]
assert all(p.startswith(b'P6\n160 100\n255\n') and len(p.split(b'\n',3)[3]) == 48000 for p in exports)
assert len(set(exports)) == 24
for args in [['-f','0'],['--ppm','24'],['-d','-1'],['--unknown'],['-f']]:
    assert subprocess.run([binary]+args,capture_output=True).returncode == 2
for mode in [[],['--256']]:
    p=subprocess.run([binary,'-f','2','-d','1']+mode,capture_output=True,timeout=5)
    assert p.returncode == 0 and p.stdout.endswith(b'\x1b[0m')
    assert (b';5;' if mode else b';2;') in p.stdout
master,slave=pty.openpty()
fcntl.ioctl(slave,termios.TIOCSWINSZ,struct.pack('HHHH',32,100,0,0))
p=subprocess.Popen([binary,'-d','10'],stdin=slave,stdout=slave,stderr=slave)
data=bytearray()
def drain(seconds):
    until=time.monotonic()+seconds
    while time.monotonic()<until:
        if select.select([master],[],[],0.01)[0]:
            data.extend(os.read(master,65536))
try:
    drain(.15)
    fcntl.ioctl(slave,termios.TIOCSWINSZ,struct.pack('HHHH',20,70,0,0))
    drain(.15)
    p.send_signal(signal.SIGINT)
    drain(.1)
    assert p.wait(timeout=2)==0
    assert b'\x1b[?1049h\x1b[?25l' in data
    assert data.endswith(b'\x1b[0m\x1b[?25h\x1b[?1049l')
    assert data.count(b'\x1b[2J')>=2
finally:
    if p.poll() is None: p.kill();p.wait()
    os.close(master);os.close(slave)
print('PASS: 24 PPM frames, invalid arguments, true/256 color, PTY resize and SIGINT restoration.')
