/* Telnet stream adapter; NCSA license as in nyancat.c.
 * Uses upstream telnet.h constants; state survives arbitrary TCP fragmentation.
 */
#include <errno.h>
#include <poll.h>
#include <sys/socket.h>
#include <sys/time.h>
#ifdef ECHO
#undef ECHO
#endif
#include "telnet.h"

static int tn_columns=80,tn_rows=25,tn_state=0,tn_command=0;
static unsigned char tn_us[256],tn_peer[256],tn_sb[128];
static size_t tn_length=0;
static int tn_overflow=0,tn_asked_type=0;
enum { TN_COLOR16=16, TN_COLOR256=256, TN_TRUECOLOR=16777216 };
static int tn_color=TN_COLOR16,tn_requests=0,tn_replies=0;
static char tn_type[80];
static void tn_request_type(void) {
    const unsigned char request[]={IAC,SB,TTYPE,SEND,IAC,SE};
    fwrite(request,1,sizeof(request),stdout);tn_requests++;
}
static int tn_suffix(const char *name,const char *suffix) {
    size_t n=strlen(name),s=strlen(suffix);
    return n>=s && !strcmp(name+n-s,suffix);
}
static int tn_named_color(const char *name) {
    if(tn_suffix(name,"-truecolor") || tn_suffix(name,"-direct") ||
       !strcmp(name,"xterm-kitty") || !strcmp(name,"wezterm") ||
       !strcmp(name,"foot") || !strcmp(name,"foot-extra")) return TN_TRUECOLOR;
    if(tn_suffix(name,"-256color")) return TN_COLOR256;
    return TN_COLOR16;
}
static void tn_terminal_type(const unsigned char *bytes,size_t n) {
    if(!tn_asked_type || tn_replies>=tn_requests || n==0 || n>=sizeof(tn_type)) return;
    char name[80];
    for(size_t i=0;i<n;i++) {
        if(bytes[i]<32 || bytes[i]>126) return;
        name[i]=(bytes[i]>='A' && bytes[i]<='Z')?(char)(bytes[i]+32):(char)bytes[i];
    }
    name[n]=0;tn_replies++;
    int repeated=!strcmp(name,tn_type),mtts=0;
    if(!strncmp(name,"mtts ",5)) {
        const char *digits=name+5;int valid=*digits!=0;
        for(const char *c=digits;*c;c++) if(*c<'0' || *c>'9') valid=0;
        if(valid) {
            char *end;errno=0;unsigned long flags=strtoul(digits,&end,10);
            if(!errno && !*end) {
                /* MTTS capabilities are explicit and override name heuristics. */
                tn_color=(flags&256)?TN_TRUECOLOR:(flags&8)?TN_COLOR256:TN_COLOR16;
                mtts=1;
            }
        }
    } else {
        int candidate=tn_named_color(name);
        if(candidate>tn_color) tn_color=candidate;
    }
    memcpy(tn_type,name,n+1);
    /* RFC 1091 cycling: stop on repetition, explicit MTTS, or eight replies. */
    if(!repeated && !mtts && tn_requests<8) tn_request_type();
}
static void tn_send(int command,int option) {
    unsigned char bytes[]={IAC,(unsigned char)command,(unsigned char)option};
    if(fwrite(bytes,1,sizeof(bytes),stdout)!=sizeof(bytes)) running=0;
}
static void tn_option(int command,int option) {
    if(command==DO) {
        if(option==BINARY || option==SGA || option==ECHO) {
            if(!tn_us[option]) tn_send(WILL,option);
            tn_us[option]=1;
        } else tn_send(WONT,option);
    } else if(command==DONT) {
        if(tn_us[option]) tn_send(WONT,option);
        tn_us[option]=0;
    } else if(command==WILL) {
        if(option==BINARY || option==SGA || option==NAWS || option==TTYPE) {
            if(!tn_peer[option]) tn_send(DO,option);
            tn_peer[option]=1;
            if(option==TTYPE && !tn_asked_type) {
                tn_asked_type=1;tn_request_type();
            }
        } else tn_send(DONT,option);
    } else if(command==WONT) {
        if(tn_peer[option]) tn_send(DONT,option);
        tn_peer[option]=0;
        if(option==TTYPE) {
            tn_color=TN_COLOR16;tn_asked_type=0;tn_requests=0;tn_replies=0;tn_type[0]=0;
        }
    }
}
static void tn_subnegotiation(void) {
    if(tn_overflow || !tn_length) return;
    if(tn_sb[0]==NAWS && tn_peer[NAWS] && tn_length==5) {
        int w=tn_sb[1]*256+tn_sb[2],h=tn_sb[3]*256+tn_sb[4];
        if(w) tn_columns=w>500?500:w;
        if(h) tn_rows=h>200?200:h;
    } else if(tn_sb[0]==TTYPE && tn_peer[TTYPE] && tn_length>2 && tn_sb[1]==IS) {
        tn_terminal_type(tn_sb+2,tn_length-2);
    }
}
static void tn_append(unsigned char c) {
    if(tn_length<sizeof(tn_sb)) tn_sb[tn_length++]=c;
    else tn_overflow=1;
}
static void tn_byte(unsigned char c) {
    switch(tn_state) {
        case 0:
            if(c==IAC) tn_state=1;
            else if(c==3 || c=='q' || c=='Q') running=0;
            break;
        case 1:
            tn_state=0;
            if(c==DO || c==DONT || c==WILL || c==WONT) {tn_command=c;tn_state=2;}
            else if(c==SB) {tn_length=0;tn_overflow=0;tn_state=3;}
            else if(c==IP || c==BRK || c==AO) running=0;
            break;
        case 2:tn_option(tn_command,c);tn_state=0;break;
        case 3:if(c==IAC) tn_state=4;else tn_append(c);break;
        case 4:
            if(c==SE) {tn_subnegotiation();tn_state=0;}
            else if(c==IAC) {tn_append(c);tn_state=3;}
            else {tn_overflow=1;tn_state=3;}
            break;
    }
}
static long long tn_milliseconds(void) {
    struct timespec ts;clock_gettime(CLOCK_MONOTONIC,&ts);
    return (long long)ts.tv_sec*1000+ts.tv_nsec/1000000;
}
static void tn_wait(int milliseconds) {
    long long end=tn_milliseconds()+milliseconds;
    do {
        long long remaining=end-tn_milliseconds();
        struct pollfd fd={STDIN_FILENO,POLLIN,0};
        int rc=poll(&fd,1,remaining>0?(int)remaining:0);
        if(rc<0) {if(errno==EINTR) continue;running=0;break;}
        if(rc==0) break;
        if(fd.revents&(POLLIN|POLLHUP)) {
            unsigned char buffer[1024];ssize_t n=read(STDIN_FILENO,buffer,sizeof(buffer));
            if(n<=0) {if(n<0 && errno==EINTR) continue;running=0;break;}
            for(ssize_t i=0;i<n;i++) tn_byte(buffer[i]);
            if(fflush(stdout)==EOF) {running=0;break;}
        } else if(fd.revents&(POLLERR|POLLNVAL)) {running=0;break;}
    } while(running && tn_milliseconds()<end);
}
static void tn_begin(void) {
    /* A stalled TCP reader must not keep a worker blocked indefinitely. */
    struct timeval timeout={5,0};
    setsockopt(STDOUT_FILENO,SOL_SOCKET,SO_SNDTIMEO,&timeout,sizeof(timeout));
    int local[]={BINARY,SGA,ECHO},remote[]={BINARY,SGA,NAWS,TTYPE};
    for(size_t i=0;i<sizeof(local)/sizeof(local[0]);i++) {tn_us[local[i]]=1;tn_send(WILL,local[i]);}
    for(size_t i=0;i<sizeof(remote)/sizeof(remote[0]);i++) {tn_peer[remote[i]]=1;tn_send(DO,remote[i]);}
    tn_send(DONT,LINEMODE);fflush(stdout);
    tn_wait(150);
}
