"""Exercise the real C byte stream with fragmented and malformed telnet input."""
import select
import socket
import subprocess
import time
from pathlib import Path

binary = str(Path(__file__).resolve().parents[1] / 'src/nyan10chan')
IAC = b'\xff'

def receive(sock, seconds=.12):
    data = bytearray()
    end = time.monotonic() + seconds
    while time.monotonic() < end:
        if select.select([sock], [], [], max(0, end-time.monotonic()))[0]:
            part = sock.recv(65536)
            if not part: break
            data.extend(part)
    return bytes(data)

def naws(cols, rows):
    raw = cols.to_bytes(2, 'big') + rows.to_bytes(2, 'big')
    return IAC+b'\xfa\x1f'+raw.replace(IAC, IAC*2)+IAC+b'\xf0'

def session(*args):
    client, worker = socket.socketpair()
    proc = subprocess.Popen([binary, '-t', '-d', '10', *args], stdin=worker, stdout=worker, stderr=subprocess.PIPE)
    worker.close()
    return client, proc

c, p = session()
try:
    hello = receive(c,.03)
    assert IAC+b'\xfd\x1f' in hello and IAC+b'\xfb\x00' in hello
    handshake = IAC+b'\xfb\x1f'+IAC+b'\xfb\x18'+IAC+b'\xfd\x00'+IAC+b'\xfb\x00'
    handshake += IAC+b'\xfa\x18\x00xterm-256color'+IAC+b'\xf0'+naws(100,32)
    for byte in handshake: c.sendall(bytes([byte]))
    output = receive(c,.25)
    assert IAC+b'\xfa\x18\x01'+IAC+b'\xf0' in output
    assert b'\x1b[?1049h\x1b[?25l' in output and b';5;' in output
    assert '▀'.encode() in output and b'\x1b[31;1H' in output
    # Unsupported negotiation, even with a 'q' option number, is not user input.
    c.sendall(IAC+b'\xfbq')
    assert IAC+b'\xfeq' in receive(c)
    assert p.poll() is None
    # Oversized SB is ignored; the following valid escaped-255 NAWS still works.
    c.sendall(IAC+b'\xfa\x1f'+b'x'*300+IAC+b'\xf0'+naws(255,51))
    output = receive(c)
    assert b'\x1b[2J' in output and b'\x1b[50;48H' in output
    c.sendall(naws(80,25))
    output = receive(c)
    assert b'\x1b[2J' in output and b'\x1b[24;3H' in output
    c.sendall(IAC+b'\xf4')  # Telnet Interrupt Process
    output = receive(c,.3)
    assert p.wait(timeout=2)==0
    assert output.endswith(b'\x1b[0m\x1b[?25h\x1b[?1049l')
finally:
    c.close()
    if p.poll() is None: p.kill();p.wait()

c,p=session('--truecolor','-f','2')
try:
    output=receive(c,.4)
    assert b';2;' in output and p.wait(timeout=2)==0
finally:
    c.close()
    if p.poll() is None: p.kill();p.wait()

c,p=session()
c.close()
assert p.wait(timeout=2) in (0,1)
assert subprocess.run([binary,'-t','--ppm','0'],capture_output=True).returncode==2
print('PASS: fragmented negotiation, NAWS resize/IAC escaping, malformed SB, IP/EOF cleanup, truecolor and finite playback.')

# Exercise color negotiation through the same socket protocol as a telnet client.
import re
SEND_TYPE = IAC+b'\xfa\x18\x01'+IAC+b'\xf0'
def until(sock, marker, timeout=2):
    data = bytearray()
    end = time.monotonic()+timeout
    while marker not in data and time.monotonic()<end:
        data.extend(receive(sock,.01))
    assert marker in data, (marker, bytes(data[-100:]))
    return bytes(data)

def color_case(names, expected, *args, late=False):
    c,p=session(*args)
    try:
        until(c,IAC+b'\xfd\x18')
        if late:
            initial=until(c,b'\x1b[H')+receive(c,.02)
            assert not re.search(rb'\x1b\[(38|48);[25];',initial)
        if names:
            c.sendall(IAC+b'\xfb\x18')
            for index,name in enumerate(names):
                until(c,SEND_TYPE)
                c.sendall(IAC+b'\xfa\x18\x00'+name.encode()+IAC+b'\xf0')
        # Drain frames emitted before the final response was processed.
        receive(c,.04)
        output=until(c,b'\x1b[H')+receive(c,.02)
        rgb=bool(re.search(rb'\x1b\[(38|48);2;',output))
        indexed=bool(re.search(rb'\x1b\[(38|48);5;',output))
        assert (rgb,indexed)==(expected=='rgb',expected=='256'), (names,args,expected)
        if expected=='16':
            assert re.search(rb'\x1b\[(3[0-7]|4[0-7]|9[0-7]|10[0-7])m',output)
        c.sendall(b'q');receive(c,.1)
        assert p.wait(timeout=2)==0
    finally:
        c.close()
        if p.poll() is None: p.kill();p.wait()

for name in ['XTERM-TRUECOLOR','xterm-direct','xterm-kitty','wezterm','foot','foot-extra']:
    color_case([name],'rgb')
for name in ['xterm-256color','screen-256color']:
    color_case([name],'256')
for names in [[],['xterm'],['unknown'],['client','MTTS 1'],['client','MTTS -1'],
              ['client','MTTS 9999999999999999999999999999999999999'],['client','MTTS 256junk']]:
    color_case(names,'16')
color_case(['client','XTERM','MTTS 269'],'rgb')
color_case(['client','XTERM','MTTS 13'],'256')
color_case(['xterm-truecolor','MTTS 1'],'16')
color_case(['xterm','xterm'],'16')
color_case(['xterm-direct'],'rgb',late=True)
color_case(['xterm-direct'],'16','--16')
color_case(['xterm-direct'],'256','--256')
color_case(['xterm'],'rgb','--truecolor')
color_case(['xterm-256color'],'256','--truecolor','--auto')
print('PASS: terminal names, MTTS, malformed capability flags, late replies and manual color overrides.')

for names in [['xterm','xterm'], ['client','MTTS 269'], [f'unknown-{i}' for i in range(8)]]:
    c,p=session()
    try:
        until(c,IAC+b'\xfd\x18')
        c.sendall(IAC+b'\xfb\x18')
        for name in names:
            until(c,SEND_TYPE)
            c.sendall(IAC+b'\xfa\x18\x00'+name.encode()+IAC+b'\xf0')
        assert SEND_TYPE not in receive(c,.2), names
        c.sendall(b'q');receive(c,.1)
        assert p.wait(timeout=2)==0
    finally:
        c.close()
        if p.poll() is None: p.kill();p.wait()
print('PASS: TTYPE cycling stops on repetition, explicit capabilities or the request limit.')
