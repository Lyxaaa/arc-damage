#!/bin/sh
# Builds the web app and stages host files in deploy/{app,arcs}, ready to copy to /opt/docker/arc-damage/ on the server.
# Usage: scripts/package-for-host.sh [user@host]   (with a host, also rsyncs to /opt/docker/arc-damage/)
set -e
cd "$(dirname "$0")/.."
[ -d web/public/arcs ] && [ -n "$(ls web/public/arcs)" ] || node scripts/publish-arcs.mjs
(cd web && npm run build)
rm -rf deploy && mkdir -p deploy/app deploy/arcs
cp -r web/dist/. deploy/app/
rm -rf deploy/app/arcs
cp -r web/public/arcs/. deploy/arcs/
du -sh deploy/app deploy/arcs
if [ -n "$1" ]; then rsync -a --delete deploy/app/ "$1:/opt/docker/arc-damage/app/"; rsync -a --delete deploy/arcs/ "$1:/opt/docker/arc-damage/arcs/"; fi
