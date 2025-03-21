#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\,/,g')")

case `uname` in
    *CYGWIN*|*MINGW*|*MSYS*) basedir=`cygpath -w "$basedir"`;;
esac

if [ -x "$basedir/node" ]; then
  exec "$basedir/node"  "$basedir/../mediainfo.js/dist/esm/cli.js" "$@"
else 
  exec node  "$basedir/../mediainfo.js/dist/esm/cli.js" "$@"
fi
