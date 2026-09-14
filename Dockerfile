FROM alpine:3.23 AS build
RUN apk add --no-cache build-base
WORKDIR /build
COPY src/ ./src/
RUN make -C src nyan10chan CFLAGS="-O2 -Wall -Wextra -std=c99 -pedantic" && strip src/nyan10chan
RUN sed -n '1,/\*\//p' src/nyancat.c > LICENSE.txt

FROM alpine:3.23
RUN apk add --no-cache socat && adduser -D -u 10001 nyan10chan
WORKDIR /app
COPY --from=build /build/src/nyan10chan ./src/nyan10chan
COPY tools/serve-telnet.sh ./tools/serve-telnet.sh
COPY README.md ./README.md
COPY --from=build /build/LICENSE.txt ./LICENSE.txt
USER nyan10chan
ENV BIND=0.0.0.0 PORT=2323
EXPOSE 2323
CMD ["sh", "tools/serve-telnet.sh"]
