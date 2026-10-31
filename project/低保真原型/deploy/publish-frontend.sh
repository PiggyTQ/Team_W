#!/bin/sh
set -eu
cd /srv/career-growth
tar -xzf frontend-20261027.tar.gz -C releases/frontend-20261027
test -s releases/frontend-20261027/index.html
ln -sfn /srv/career-growth/releases/frontend-20261027 current
install -d /var/lib/letsencrypt/.well-known/acme-challenge
if [ -L /etc/nginx/sites-enabled/default ]; then
    mv /etc/nginx/sites-enabled/default backups/nginx-default-20261027
fi
install -m 644 source/deploy/nginx-http.conf /etc/nginx/sites-available/career-growth
ln -sfn /etc/nginx/sites-available/career-growth /etc/nginx/sites-enabled/career-growth
nginx -t
systemctl reload nginx
curl --fail --silent http://127.0.0.1/ | head -c 1000
