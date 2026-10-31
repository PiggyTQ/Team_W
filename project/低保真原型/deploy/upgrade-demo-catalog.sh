#!/bin/bash
set -Eeuo pipefail
cd /srv/career-growth/source
stamp=$(date -u +%Y%m%dT%H%M%SZ)
previous=$(readlink -f /srv/career-growth/current)
echo "$previous" > "/srv/career-growth/backups/before-demo-$stamp-release.txt"
python3 server/backup-db.py --prefix before-business
tar -czf "/srv/career-growth/backups/before-demo-$stamp-source.tar.gz" src/main.jsx src/JobDiscovery.jsx src/CareerDetail.jsx src/SearchWorkbench.jsx src/EvidenceAssessment.jsx src/auth-client.js server/auth-server.mjs server/backup-db.py PRODUCT.md
tar -xzf /srv/career-growth/demo-catalog-source-20261027.tar.gz -C /srv/career-growth/source
install -d -m 755 server/data
install -m 644 /srv/career-growth/demo-knowledge-20261027.sqlite server/data/knowledge.sqlite
mkdir -p checks/展示数据接入_20261027 checks/芝识分子原模动作_20261025
node --test tests/*.test.mjs > checks/展示数据接入_20261027/server-tests.txt 2>&1
npm run build:server > checks/展示数据接入_20261027/server-build.txt 2>&1
release="/srv/career-growth/releases/demo-catalog-$stamp"
install -d -m 755 "$release"
cp -a dist/. "$release/"
chmod -R go-w /srv/career-growth/source /srv/career-growth/releases
systemctl restart career-auth
attempt=0
until curl --fail --silent http://127.0.0.1:3001/api/ready; do
  attempt=$((attempt+1)); test "$attempt" -lt 15; sleep 1
done
ln -sfn "$release" /srv/career-growth/current
python3 server/backup-db.py
systemctl is-active career-auth nginx career-backup.timer
echo "Release: $release"
tail -n 9 checks/展示数据接入_20261027/server-tests.txt
