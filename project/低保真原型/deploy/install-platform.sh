#!/bin/sh
set -eu
export DEBIAN_FRONTEND=noninteractive
apt-get install -y -qq python3-venv
install -d /opt/career-node-download
cd /opt/career-node-download
curl -fsS --retry 3 https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt -o SHASUMS256.txt
filename=$(awk '$2 ~ /^node-v24\.[0-9]+\.[0-9]+-linux-x64.tar.xz$/ { print $2; exit }' SHASUMS256.txt)
test -n "$filename"
curl -fsS --retry 3 "https://nodejs.org/dist/latest-v24.x/$filename" -o "$filename"
sha256sum --check --ignore-missing SHASUMS256.txt
tar -xJf "$filename" -C /opt
node_dir=${filename%.tar.xz}
ln -sfn "/opt/$node_dir/bin/node" /usr/local/bin/node
ln -sfn "/opt/$node_dir/bin/npm" /usr/local/bin/npm
ln -sfn "/opt/$node_dir/bin/npx" /usr/local/bin/npx
node --version
python3 -m venv /opt/career-certbot
/opt/career-certbot/bin/pip install -q 'certbot>=5.4'
/opt/career-certbot/bin/certbot certonly --non-interactive --agree-tos --register-unsafely-without-email --preferred-profile shortlived --webroot --webroot-path /var/lib/letsencrypt --ip-address 47.250.133.180 --cert-name career-ip
