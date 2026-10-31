#!/bin/sh
set -eu
cd /srv/career-growth/source
python3 server/backup-db.py --prefix before-business
npm run build:server
node --test tests/auth-server.test.mjs tests/business-api.test.mjs tests/business-store.test.mjs tests/workspace-sync.test.mjs
release=/srv/career-growth/releases/business-$(date -u +%Y%m%dT%H%M%SZ)
install -d -m 755 "$release"
cp -a dist/. "$release/"
chmod -R go-w /srv/career-growth/source /srv/career-growth/releases
install -m 644 deploy/career-backup.service /etc/systemd/system/career-backup.service
install -m 644 deploy/career-backup.timer /etc/systemd/system/career-backup.timer
systemctl daemon-reload
systemctl restart career-auth
attempt=0
until curl --fail --silent http://127.0.0.1:3001/api/ready; do
    attempt=$((attempt+1))
    if [ "$attempt" -ge 15 ]; then exit 1; fi
    sleep 1
done
ln -sfn "$release" /srv/career-growth/current
systemctl enable --now career-backup.timer
systemctl start career-backup.service
systemctl is-active career-auth career-backup.timer
systemctl show career-backup.service --property=Result --property=ExecMainStatus
