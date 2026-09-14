OBJECTS = nyancat.o

CC	?=
CFLAGS	 ?= -g -Wall -Wextra -std=c99 -pedantic -Wwrite-strings
CPPFLAGS ?=
LDFLAGS  ?=

all: nyancat nyan10chan

nyancat.o: animation.c telnet.h

nyan10chan: nyan10chan.c nyan10chan_sprites.h
	$(CC) $(CPPFLAGS) $(CFLAGS) $(LDFLAGS) nyan10chan.c -o $@

nyancat: $(OBJECTS)
	$(CC) $(CPPFLAGS) $(CFLAGS) $(LDFLAGS) $(OBJECTS) -o $@

clean:
	-rm -f $(OBJECTS) nyancat nyan10chan

check: all
	python3 ../tools/smoke_test.py

.PHONY: all clean check
