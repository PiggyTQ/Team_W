#!/bin/bash
set -Eeuo pipefail
cd /srv/career-growth/source
stamp=$(date -u +%Y%m%dT%H%M%SZ)
previous=$(readlink -f /srv/career-growth/current)
printf '%s\n' "$previous" > "/srv/career-growth/backups/before-courses-$stamp-release.txt"
python3 server/backup-db.py --prefix before-business
tar -czf "/srv/career-growth/backups/before-courses-$stamp-source.tar.gz" server/business-store.mjs server/auth-server.mjs src/auth-client.js src/auth-contract.js src/useServerWorkspace.js src/main.jsx src/model.js src/task-attempt-model.js src/LearningCentre.jsx src/LearningReadingGuide.jsx tests/business-store.test.mjs PRODUCT.md
tar -xzf /srv/career-growth/courses-source-20261027.tar.gz
export COURSE_PACK_ROOT=/srv/career-growth/source/资料收集/展示资料包_20261027
mkdir -p checks/课程接入与发布_20261027 checks/芝识分子原模动作_20261025
python3 "$COURSE_PACK_ROOT/tools/validate_materials.py" > checks/课程接入与发布_20261027/pack-validation.json
node --test tests/*.test.mjs > checks/课程接入与发布_20261027/server-tests.txt 2>&1
npm run build:server > checks/课程接入与发布_20261027/server-build.txt 2>&1
release="/srv/career-growth/releases/courses-$stamp"
install -d -m 755 "$release"
cp -a dist/. "$release/"
chmod -R go-w /srv/career-growth/source /srv/career-growth/releases
activating=1
trap 'if [ "${activating:-0}" = 1 ]; then systemctl start career-auth || true; fi' ERR
systemctl stop career-auth
python3 server/backup-db.py --prefix before-business
node server/import-course-pack.mjs /var/lib/career-growth/auth.sqlite "$COURSE_PACK_ROOT" > checks/课程接入与发布_20261027/import-report.json
for file in /var/lib/career-growth/auth.sqlite /var/lib/career-growth/auth.sqlite-wal /var/lib/career-growth/auth.sqlite-shm; do
  if [ -f "$file" ]; then chown career:career "$file"; chmod 600 "$file"; fi
done
systemctl start career-auth
attempt=0
until curl --fail --silent http://127.0.0.1:3001/api/ready; do
  attempt=$((attempt+1)); test "$attempt" -lt 15; sleep 1
done
ln -sfn "$release" /srv/career-growth/current
activating=0
python3 server/backup-db.py
systemctl is-active career-auth nginx career-backup.timer
printf '\nRelease: %s\n' "$release"
cat checks/课程接入与发布_20261027/import-report.json
tail -n 9 checks/课程接入与发布_20261027/server-tests.txt
