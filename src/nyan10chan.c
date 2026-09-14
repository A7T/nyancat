/* A character edition of klange/nyancat. Artwork terms: ../README.md.
 * ANSI animation and square-wave rainbow approach follow nyancat.c.
 * Code additions use the same NCSA license as nyancat.c.
 */
#define _POSIX_C_SOURCE 200809L
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <signal.h>
#include <unistd.h>
#include <time.h>
#include <sys/ioctl.h>
#include "nyan10chan_sprites.h"

#define WIDTH 160
#define HEIGHT 100
static unsigned char canvas[HEIGHT][WIDTH][3];
static volatile sig_atomic_t running = 1;
static void stop(int sig) { (void)sig; running = 0; }
static void pixel(int x, int y, const unsigned char *rgb) {
    if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT)
        memcpy(canvas[y][x], rgb, 3);
}
static void scene(unsigned tick) {
    static const unsigned char rainbow[6][3] = {
        {255,30,44},{255,153,0},{255,237,48},
        {63,237,34},{0,176,243},{113,57,249}};
    static const unsigned char white[3] = {238,255,255};
    static const int stars[][2] = {{18,15},{66,7},{135,20},{31,83},{121,91},{151,64},{7,57}};
    static const int poses[] = {0,0,1,1,4,4,5,5,0,1,4,5,0,1,4,5,0,1,2,3,2,0,4,5};
    static const int bob[] = {0,0,-1,-1,0,0,1,1};
    int frame = poses[tick % 24], dy = bob[tick % 8];
    for (int y=0;y<HEIGHT;y++) for(int x=0;x<WIDTH;x++)
        memcpy(canvas[y][x],palette[0],3);
    for (int s=0;s<7;s++) {
        int x = (stars[s][0]+WIDTH-(int)(tick*2 % WIDTH)) % WIDTH;
        int y = stars[s][1], phase = (tick/3+s)%4;
        if (phase != 3) pixel(x,y,white);
        if (phase == 1 || phase == 2) {
            int radius = phase == 1 ? 1 : 3;
            pixel(x-radius,y,white); pixel(x+radius,y,white);
            pixel(x,y-radius,white); pixel(x,y+radius,white);
        }
    }
    /* End under the torso, before the open gap between face and left arm. */
    for(int x=0;x<110;x++) {
        int wave = ((x+(int)(tick%8)*2)/10)%2;
        for(int band=0;band<6;band++) for(int h=0;h<4;h++)
            pixel(x,39+wave*2+band*4+h+dy,rainbow[band]);
    }
    for(int y=0;y<SPRITE_SIZE;y++) for(int x=0;x<SPRITE_SIZE;x++) {
        unsigned char color = sprites[frame][y*SPRITE_SIZE+x];
        if(color) pixel(66+x,9+y+dy,palette[color]);
    }
}
static int number(const char *s, int max) {
    char *end; long n = strtol(s,&end,10);
    if (!*s || *end || n<1 || n>max) {
        fprintf(stderr,"Invalid positive number: %s\n",s); exit(2);
    }
    return (int)n;
}
static void help(void) {
    puts("nyan10chan — J-10 girl parade smoke edition of nyancat\n"
         "Usage: nyan10chan [-f frames] [-d milliseconds] [--256] [--ppm frame]\n"
         "  -f, --frames N   Stop after N frames (default: loop)\n"
         "  -d, --delay MS   Frame duration (default: 90 ms)\n"
         "  --256           Use xterm 256 colors instead of true color\n"
         "  --ppm N         Export frame N (0–23) as binary PPM to stdout\n"
         "  --credits       Show artwork attribution\n"
         "Ctrl-C exits and restores the terminal. UTF-8 terminal required.");
}
static int indexed(const unsigned char *p) {
    int best=16, distance=1000000;
    static const int ramp[]={0,95,135,175,215,255};
    for(int i=16;i<256;i++) {
        int n=i-16;
        int r=i<232?ramp[n/36]:8+10*(i-232);
        int g=i<232?ramp[(n/6)%6]:r, b=i<232?ramp[n%6]:r;
        int d=(r-p[0])*(r-p[0])+(g-p[1])*(g-p[1])+(b-p[2])*(b-p[2]);
        if(d<distance) {distance=d;best=i;}
    }
    return best;
}
static void color(const unsigned char *p,int foreground,int mode256) {
    if(mode256) printf("\033[%d;5;%dm",foreground?38:48,indexed(p));
    else printf("\033[%d;2;%d;%d;%dm",foreground?38:48,p[0],p[1],p[2]);
}
int main(int argc,char **argv) {
    unsigned limit=0; int delay=90,mode256=0,ppm=-1;
    for(int a=1;a<argc;a++) {
        if(!strcmp(argv[a],"--help") || !strcmp(argv[a],"-h")) {help();return 0;}
        else if(!strcmp(argv[a],"--credits")) {
            puts("原作：无残弹的钢坦克 · 彩虹10有人机（x）\n"
                 "https://www.bilibili.com/opus/1111297816944181257\n"
                 "署名、非商业使用：https://www.bilibili.com/opus/1068864321750040592\n"
                 "Original terminal program: K. Lange / klange/nyancat (NCSA)."); return 0;
        } else if(!strcmp(argv[a],"--256")) mode256=1;
        else if(a+1<argc && (!strcmp(argv[a],"-f") || !strcmp(argv[a],"--frames"))) limit=number(argv[++a],10000000);
        else if(a+1<argc && (!strcmp(argv[a],"-d") || !strcmp(argv[a],"--delay"))) delay=number(argv[++a],10000);
        else if(a+1<argc && !strcmp(argv[a],"--ppm")) {
            const char *s=argv[++a]; ppm=!strcmp(s,"0")?0:number(s,23);
        } else {fprintf(stderr,"Unknown or incomplete option: %s\n",argv[a]);return 2;}
    }
    if(ppm>=0) {
        scene((unsigned)ppm); printf("P6\n%d %d\n255\n",WIDTH,HEIGHT);
        return fwrite(canvas,1,sizeof(canvas),stdout)==sizeof(canvas)?0:1;
    }
    if(!isatty(STDOUT_FILENO) && !limit) {
        fputs("Use -f N for redirected output, or --ppm N to export a frame.\n",stderr);return 2;
    }
    signal(SIGINT,stop);signal(SIGTERM,stop);signal(SIGHUP,stop);signal(SIGPIPE,stop);
    int tty = isatty(STDOUT_FILENO);
    if(tty) printf("\033[?1049h\033[?25l");
    struct timespec pause={delay/1000,(delay%1000)*1000000L};
    int previous_columns=0,previous_rows=0;
    for(unsigned t=0;running && (!limit || t<limit);t++) {
        struct winsize ws={0}; int columns=80,rows=25;
        if(ioctl(STDOUT_FILENO,TIOCGWINSZ,&ws)==0 && ws.ws_col && ws.ws_row) {columns=ws.ws_col;rows=ws.ws_row;}
        if(columns!=previous_columns || rows!=previous_rows) {
            printf("\033[0m\033[2J"); previous_columns=columns; previous_rows=rows;
        }
        int w=columns, h=w*HEIGHT/WIDTH;
        if(h>(rows-1)*2) {h=(rows-1)*2;w=h*WIDTH/HEIGHT;}
        if(w<1 || h<2) {nanosleep(&pause,NULL);continue;}
        if(w>WIDTH) {w=WIDTH;h=HEIGHT;}
        scene(t);
        printf("\033[H");
        int left=(columns-w)/2,top=(rows-h/2)/2;
        for(int y=0;y<h/2;y++) {
            printf("\033[%d;%dH",top+y+1,left+1);
            for(int x=0;x<w;x++) {
                const unsigned char *fg=canvas[(y*2)*HEIGHT/h][x*WIDTH/w];
                const unsigned char *bg=canvas[(y*2+1)*HEIGHT/h][x*WIDTH/w];
                color(fg,1,mode256);color(bg,0,mode256);fputs("▀",stdout);
            }
        }
        if(fflush(stdout)==EOF) break;
        if(!limit || t+1<limit) nanosleep(&pause,NULL);
    }
    printf("\033[0m");
    if(tty) printf("\033[?25h\033[?1049l");
    return ferror(stdout)?1:0;
}
