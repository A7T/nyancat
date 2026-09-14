# Nyan10chan · 彩虹10有人机（x）

基于 [klange/nyancat](https://github.com/klange/nyancat) 克隆开发。  
原作：[无残弹的钢坦克](https://space.bilibili.com/134980) · [彩虹10有人机（x）](https://www.bilibili.com/opus/1111297816944181257)。
依据作者[统一回复](https://www.bilibili.com/opus/1068864321750040592)，美术素材及衍生作品限署名、非商业使用。

![动画预览](assets/preview.gif)

## 纯前端终端页面

```sh
cd web
npm ci
npm run dev
```

打开终端输出的本地地址。页面使用 xterm.js 解析 ANSI 转义序列和 `▀` 半块字符，
保留终端缓冲区、键盘输入与大小调整；动画逻辑在浏览器内用 JavaScript 执行。
WebGL 插件将块字符绘制成连续像素，无 WebGL 时退回 xterm.js 的字体渲染。
无需服务端计算、WebSocket 或系统 PTY，开发服务器只提供静态文件。
这里的命令行是浏览器本地的动画命令解释器，不提供操作系统 shell。

- `Space` 暂停 / 继续，`R` 重播，`Ctrl-C` 或 `Q` 返回命令行。
- 命令行支持 `nyan10chan [--256] [-f N] [-d MS]`、`help`、`credits`、`clear`。
- 支持退格、上下键历史、Ctrl-C 取消输入、Ctrl-L 清屏。
- `F` 切换全屏；触屏轻点动画可暂停 / 继续。
- 页面仅保留终端和原作、上游、项目链接；尊重减少动态效果设置，后台标签页暂停绘制。

构建可部署到任何静态托管服务的文件：

```sh
cd web
npm run build
npm run preview
```

产物在仓库根目录的 `docs/`，包含终端库、精灵数据和许可证，无 CDN 或外部运行时请求。
将 `docs/` 随源码提交，在 GitHub Pages 中选择 **Deploy from a branch**，
分支选择 **nyan10chan**，目录选择 **/docs** 即可；无需在线构建。
`docs/` 由构建命令生成，请修改 `web/` 源码后重新构建，不要直接编辑产物。
使用相对资源路径，支持子路径部署；通过 HTTP(S) 提供这些文件，不要直接用 `file://` 打开。
`npm run sprites` 从 `src/nyan10chan_sprites.h` 导出数据，并由 dev/build 自动调用。
修改精灵后重新启动开发服务器或运行素材导出命令即可同步。

验证：`cd web && npm test` 将 JS 的全部 24 帧逐像素对照 C 程序，
因此需要本地 C 编译器和 make；`npm run test:browser` 用 Playwright + 本机 Chrome
检查桌面 / 手机布局、暂停、重播、命令行、色彩模式及减少动态效果。
所有新增代码沿用上游 NCSA 许可。
xterm.js 与插件的 MIT 许可随构建产物的 `THIRD-PARTY.txt` 提供。

## 本地 C 程序

```sh
make
./src/nyan10chan
```

按 Ctrl-C 退出。推荐 UTF-8、真彩色终端，窗口至少 100 列 × 32 行；
160 列 × 51 行可以显示完整原生细节。较小窗口自动缩放。
六张重新绘制的精灵差分组成 24 帧时间序列，包含小幅腿部摆动、眨眼和上下浮动；
彩虹连续延伸至角色身后，由精灵的不透明像素自然遮挡。
彩虹与星点由 C 程序生成。默认每帧 90 毫秒。

```sh
./src/nyan10chan --256          # 256 色终端
./src/nyan10chan -f 24 -d 100   # 播放一轮后退出
./src/nyan10chan --credits      # 显示作者与来源
./src/nyancat                   # 上游原版
```

常规编译运行只需要 C 编译器和 make，不依赖 Python 或图片文件。
`assets/redrawn-sheet.png` 是实际使用的六帧像素重绘图稿，
`tools/pack_sprites.py` 将其编译为两端共用的 `src/nyan10chan_sprites.h`。
`assets/preview.gif` 为 C 程序输出的动画预览。

如需重新编译素材及导出程序画面：

```sh
python3 -m venv .venv
.venv/bin/pip install Pillow
.venv/bin/python tools/pack_sprites.py
make
.venv/bin/python tools/preview.py
python3 tools/smoke_test.py
```

新程序支持本地终端，不包含上游的 telnet 服务模式。上游说明如下。

# Nyancat CLI (upstream)

Nyancat rendered in your terminal.

[![Nyancats](http://nyancat.dakko.us/nyancat.png)](http://nyancat.dakko.us/nyancat.png)

## Distributions

Nyancat is available in the following distributions:

- [Arch](https://www.archlinux.org/packages/?q=nyancat)
- [Debian](http://packages.qa.debian.org/n/nyancat.html)
- [Fedora](https://src.fedoraproject.org/rpms/nyancat)
- [Gentoo](http://packages.gentoo.org/package/games-misc/nyancat)
- [Mandriva](http://sophie.zarb.org/rpms/928724d4aea0efdbdeda1c80cb59a7d3)
- [Ubuntu](https://launchpad.net/ubuntu/+source/nyancat)

And also on some BSD systems:

- [FreeBSD](http://www.freshports.org/net/nyancat/)
- [OpenBSD](http://openports.se/misc/nyancat)
- [NetBSD](http://pkgsrc.se/misc/nyancat)

## Setup

First build the C application:

    make && cd src

You can run the C application standalone.

    ./nyancat

To use the telnet server, you need to add a configuration that runs:

    nyancat -t

We recommend `openbsd-inetd`, but both `xinetd` and `systemd` work as well. You
should be able to use any other compatible `inetd` flavor too.

## Distribution Specific Information

#### Debian/Ubuntu

Debian and Ubuntu provide the nyancat binary through the `nyancat` package. A
`nyancat-server` package is provided to automatically setup and enable a nyancat
telnet server upon installation. I am not the maintainer of these packages;
please direct any questions or bugs to the relevant distribution's bug tracking
system.

## Licenses, References, etc.

The original source of the Nyancat animation is
[prguitarman](http://www.prguitarman.com/index.php?id=348).

The code provided here is provided under the terms of the
[NCSA license](http://en.wikipedia.org/wiki/University_of_Illinois/NCSA_Open_Source_License).
