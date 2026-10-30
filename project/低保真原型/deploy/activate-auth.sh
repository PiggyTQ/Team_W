#!/bin/sh
set -eu
cd /srv/career-growth/source
chmod -R go-w /srv/career-growth/source /srv/career-growth/releases
id career >/dev/null 2>&1 || useradd --system --home /var/lib/career-growth --shell /usr/sbin/nologin career
install -d -o career -g career -m 700 /var/lib/career-growth
install -m 644 deploy/career-auth.service /etc/systemd/system/career-auth.service
install -m 644 deploy/career-certbot.service /etc/systemd/system/career-certbot.service
install -m 644 deploy/career-certbot.timer /etc/systemd/system/career-certbot.timer
systemctl daemon-reload
systemctl enable --now career-auth career-certbot.timer
systemctl restart career-auth
install -m 644 deploy/nginx-https.conf /etc/nginx/sites-available/career-growth
nginx -t
systemctl reload nginx
systemctl is-active career-auth career-certbot.timer
