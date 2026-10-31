#!/bin/bash
set -Eeuo pipefail
cd /srv/career-growth/source
stamp=$(date -u +%Y%m%dT%H%M%SZ)
previous=$(readlink -f /srv/career-growth/current)
backup="/srv/career-growth/backups/before-password-$stamp-source.tar.gz"
tar -czf "$backup" src server scripts tests package.json vite.config.js
python3 server/backup-db.py --prefix before-business
changed=0
rollback(){
  if [ "$changed" = 1 ]; then
    tar -xzf "$backup"
    ln -sfn "$previous" /srv/career-growth/current
    systemctl restart career-auth
  fi
}
trap rollback ERR
changed=1
tar -xzf /srv/career-growth/password-source-20261028.tar.gz
export COURSE_PACK_ROOT=/srv/career-growth/source/资料收集/展示资料包_20261027
mkdir -p checks/密码规则_20261028
node --test tests/*.test.mjs > checks/密码规则_20261028/server-tests.txt 2>&1
npm run build:server > checks/密码规则_20261028/server-build.txt 2>&1
release="/srv/career-growth/releases/password-$stamp"
install -d -m 755 "$release"
cp -a dist/. "$release/"
chmod -R go-w src server scripts tests "$release"
chmod 644 package.json vite.config.js
systemctl restart career-auth
attempt=0
until curl --fail --silent http://127.0.0.1:3001/api/ready; do
  attempt=$((attempt+1)); test "$attempt" -lt 15; sleep 1
done
ln -sfn "$release" /srv/career-growth/current
changed=0
python3 server/backup-db.py
systemctl is-active career-auth nginx career-backup.timer career-certbot.timer
printf '\nRelease: %s\n' "$release"
tail -n 9 checks/密码规则_20261028/server-tests.txt
