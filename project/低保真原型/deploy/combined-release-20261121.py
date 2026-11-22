#!/usr/bin/env python3
"""Publish only the approved tree patch from the uploaded, pinned source archive.

Run with the existing root SSH login: python3 - < this-file.py
Existing account data, service configuration and report files are preserved.
The account service is restarted to load versioned assessment rules. Historic scoring remains available. Report presentation remains the restored four-tab version.
"""
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import stat
import subprocess
import sys
import tarfile
import sqlite3
import time
import urllib.request

BASE = Path('/srv/career-growth')
SOURCE = BASE / 'source'
CURRENT = BASE / 'current'
ARCHIVE = Path('/root/combined-release-20261121-source.tar.gz')
ARCHIVE_SHA = '86d322a468ec15da280d8d07f7549d6d04a8fd2d6afeb89c83a17e3d90f7c916'
PREFIX = 'combined-release-20261121/'
ORIGIN = 'https://47.250.133.180'
PREVIOUS_NAME = 'skill-alignment-20261120-20261120T163357Z'
# The four report files changed by the withdrawn V2 must still be the restored ones.
REPORT = {
    'src/ReportDecisionDesk.jsx': 'c431a8836d220072652a013239ee42544e4881707c2533b4c71bb2f1dfa324b4',
    'src/CareerReportPanels.jsx': '8ef7207073ff0b53dbe5b34a54e8fae1f3cc941c18e724030443b48896153604',
    'src/report-insights-model.js': '7b29e3c5dd971c2ac0d03839c64bcfc49b005c2cc9e9966187c5840b551b35b7',
    'src/i18n/report-full-ui.json': '0286455e632856ac148bab69bf64975070dada9c0e60e2e8b48606db7b33721c',
}
ROOT_FILES = ['index.html', 'package.json', 'package-lock.json', 'vite.config.js',
              '.env', '.env.local', '.env.server', '.env.server.local']


def require(ok, message):
    if not ok:
        raise RuntimeError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def file_sha(path):
    return sha(path.read_bytes()) if path.is_file() else None


def emit(event, **values):
    print(json.dumps({'event': event, **values}), flush=True)


def load_patch(archive):
    require(file_sha(archive) == ARCHIVE_SHA, 'Uploaded archive SHA-256 mismatch')
    with tarfile.open(archive, 'r:gz') as tar:
        members = {m.name: m for m in tar.getmembers()}
        require(len(members) == len(tar.getmembers()), 'Duplicate archive member')
        for m in members.values():
            require(m.isfile() and m.name.startswith(PREFIX) and
                    '..' not in PurePosixPath(m.name).parts, 'Unsafe archive member')
        manifest = json.load(tar.extractfile(PREFIX + 'manifest.json'))
        require(manifest['release'] == PREFIX[:-1] and len(manifest['files']) == 44,
                'Unexpected patch scope')
        patch = {}
        for item in manifest['files']:
            rel = item['path']
            require(rel.startswith(('src/','server/agent/','server/auth-server.mjs')) and '..' not in PurePosixPath(rel).parts,
                    'Unsafe source path')
            data = tar.extractfile(PREFIX + 'files/' + rel).read()
            require(sha(data) == item['afterSha256'] and len(data) == item['bytes'],
                    'Archive file mismatch: ' + rel)
            patch[rel] = data
        require(len(patch) == 44, 'Duplicate source path')
        return manifest, patch


def check_source(source, manifest):
    for item in manifest['files']:
        target = source / item['path']
        require(not target.is_symlink(), 'Source symlink: ' + item['path'])
        actual = file_sha(target)
        require(actual in (item['beforeSha256'], item['afterSha256']),
                'Source has other changes; stop for merge: ' + item['path'])
    for item in manifest['unchangedDependencies']:
        require(file_sha(source / item['path']) == item['sha256'],
                'Tree dependency has changed: ' + item['path'])
    for rel, expected in REPORT.items():
        require(file_sha(source / rel) == expected,
                'Restored report baseline mismatch: ' + rel)


def input_snapshot(source):
    result = {}
    for name in ('src', 'public', 'scripts', 'server', 'course-packs', 'knowledge'):
        for p in sorted((source / name).rglob('*')):
            if name == 'server' and 'data' in p.relative_to(source / name).parts:
                continue
            require(not p.is_symlink(), 'Unexpected input symlink: ' + str(p))
            if p.is_file():
                result[str(p.relative_to(source))] = file_sha(p)
    for name in ROOT_FILES:
        if (source / name).is_file():
            result[name] = file_sha(source / name)
    return result


def stage_source(source, stage, patch):
    stage.mkdir(mode=0o700)
    for name in ('src', 'public', 'scripts', 'course-packs', 'knowledge'):
        shutil.copytree(source / name, stage / name)
    shutil.copytree(source / 'server', stage / 'server',
                    ignore=lambda directory, names: ['data'] if Path(directory) == source / 'server' else [])
    for name in ROOT_FILES:
        if (source / name).is_file():
            shutil.copy2(source / name, stage / name)
    (stage / 'node_modules').symlink_to(source / 'node_modules', target_is_directory=True)
    for rel, data in patch.items():
        (stage / rel).parent.mkdir(parents=True, exist_ok=True)
        (stage / rel).write_bytes(data)


def run_logged(args, cwd, log):
    with log.open('wb') as output:
        result = subprocess.run(args, cwd=cwd, stdin=subprocess.DEVNULL,
                                stdout=output, stderr=subprocess.STDOUT)
    if result.returncode:
        print(log.read_text(errors='replace')[-6000:], flush=True)
        raise RuntimeError('Check/build failed; log: ' + str(log))


def fetch(path):
    request = urllib.request.Request(ORIGIN + path, headers={'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(request, timeout=30) as response:
        require(response.status == 200, 'HTTP check failed: ' + path)
        return response.read()


def service_pid():
    return subprocess.check_output(['systemctl', 'show', 'career-auth',
                                    '--property=MainPID', '--value'], text=True).strip()


def atomic_link(target):
    temp = BASE / ('.tree-link-' + str(os.getpid()))
    require(not temp.exists() and not temp.is_symlink(), 'Link temporary path exists')
    temp.symlink_to(target, target_is_directory=True)
    os.replace(temp, CURRENT)


def atomic_write(target, data, owner):
    temp = target.with_name('.' + target.name + '.tree-' + str(os.getpid()))
    require(not temp.exists(), 'File temporary path exists: ' + str(temp))
    with temp.open('xb') as output:
        output.write(data)
        output.flush()
        os.fsync(output.fileno())
    os.chmod(temp, stat.S_IMODE(owner.st_mode) if stat.S_ISREG(owner.st_mode) else 0o644)
    os.chown(temp, owner.st_uid, owner.st_gid)
    os.replace(temp, target)


def environment_fingerprint(pid):
    entries = Path('/proc/'+str(pid)+'/environ').read_bytes().split(b'\0')
    selected = sorted(row for row in entries if row.split(b'=',1)[0].startswith((b'AI_',b'DEEPSEEK_',b'MAIL_',b'SMTP_',b'AUTH_',b'BACKUP_')))
    return sha(b'\0'.join(selected))


def publish():
    require(os.geteuid() == 0, 'Use the existing root SSH session')
    require(SOURCE.resolve() == SOURCE and SOURCE.is_dir(), 'Unexpected source directory')
    require(CURRENT.is_symlink(), 'Current release must be a symlink')
    previous = CURRENT.resolve(strict=True)
    require(previous.parent == BASE / 'releases' and previous.name == PREVIOUS_NAME,
            'Unexpected current release; stop for baseline review: ' + str(previous))
    manifest, patch = load_patch(ARCHIVE)
    check_source(SOURCE, manifest)
    require((SOURCE / 'node_modules/vite/bin/vite.js').is_file(), 'Existing Vite dependency missing')
    node = shutil.which('node')
    require(node, 'Node.js missing')
    version = subprocess.check_output([node, '--version'], text=True).strip()
    require(int(version.split('.')[0].lstrip('v')) >= 24, 'Node.js 24+ required')
    require(service_pid() not in ('', '0'), 'Account service is not running')
    pid = service_pid()
    protected_env = environment_fingerprint(pid)
    before_health = json.loads(fetch('/api/health'))
    require(before_health.get('status') == 'ok', 'API is not ready')
    require(fetch('/career-map') == (previous / 'index.html').read_bytes(),
            'HTTPS is not serving the expected current release')
    require(shutil.disk_usage(BASE).free > 600 * 1024 * 1024, 'Need 600 MB free staging space')
    snapshot = input_snapshot(SOURCE)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    name = 'combined-release-20261121-' + stamp
    backup = BASE / 'backups' / name
    backup.mkdir(mode=0o700, parents=True)
    stage = backup / 'build-source'
    release = BASE / 'releases' / name
    require(not release.exists(), 'Release already exists')
    emit('PREFLIGHT_OK', previous=str(previous), node=version, files=len(patch), reportBaseline='restored')
    stage_source(SOURCE, stage, patch)
    test_names = ['agent-contract.test.mjs', 'agent-session.test.mjs', 'agent-service.test.mjs', 'agent-api.test.mjs', 'agent-workflow.test.mjs', 'discussion-workflow.test.mjs', 'storage-recovery.test.mjs', 'business-store.test.mjs', 'business-commands.test.mjs', 'auth-server.test.mjs', 'business-api.test.mjs', 'skill-sequence.test.mjs', 'skill-alignment.test.mjs', 'skill-follow.test.mjs', 'skill-depth.test.mjs', 'skill-learning.test.mjs', 'skill-tree.test.mjs', 'skill-journey.test.mjs', 'skill-tree-camera.test.mjs', 'career-report-insights.test.mjs', 'language-native-tasks.test.mjs']
    with tarfile.open(ARCHIVE, 'r:gz') as tar:
        for member in tar.getmembers():
            if member.name.startswith(PREFIX + 'qa/tests/'):
                rel = member.name[len(PREFIX + 'qa/'):];target = stage / rel
                target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(tar.extractfile(member).read())
    run_logged([node, '--test'] + ['tests/' + name for name in test_names], stage, backup / 'tests.log')
    run_logged([node, 'scripts/prepare-bilingual.mjs', '--check'], stage, backup / 'i18n.log')
    run_logged([node, 'node_modules/vite/bin/vite.js', 'build', '--mode', 'server',
                '--outDir', str(release)], stage, backup / 'build.log')
    require((release / 'index.html').is_file(), 'Build index missing')
    require(input_snapshot(SOURCE) == snapshot and CURRENT.resolve() == previous,
            'Production source/release changed during build; stop for review')
    assets = sorted((release / 'assets').rglob('*'))
    assets = [p for p in assets if p.is_file()]
    for rel, data in patch.items():
        if rel.endswith('.webp'):
            require(any(file_sha(p) == sha(data) for p in assets), 'Built tree asset missing: ' + rel)
    require(any(b'assessment-paper' in p.read_bytes() for p in assets if p.suffix == '.css'),
            'Built tree styles missing')
    for p in release.rglob('*'):
        os.chmod(p, 0o755 if p.is_dir() else 0o644)
    os.chmod(release, 0o755)
    database = Path('/var/lib/career-growth/auth.sqlite')
    require(database.is_file(), 'Expected account database missing')
    with sqlite3.connect('file:' + str(database) + '?mode=ro', uri=True) as source_db:
        with sqlite3.connect(backup / 'auth-before.sqlite') as backup_db:
            source_db.backup(backup_db)
            require(backup_db.execute('PRAGMA quick_check').fetchone()[0]=='ok','Database backup consistency failed')
    os.chmod(backup / 'auth-before.sqlite', 0o600)
    original = {}
    owners = {}
    for rel in patch:
        target = SOURCE / rel
        original[rel] = target.read_bytes() if target.exists() else None
        owners[rel] = target.stat() if target.exists() else target.parent.stat()
        if original[rel] is not None:
            saved = backup / 'original' / rel
            saved.parent.mkdir(parents=True, exist_ok=True)
            saved.write_bytes(original[rel])
    receipt = {'release': str(release), 'previous': str(previous), 'archiveSha256': ARCHIVE_SHA,
               'files': list(patch), 'reportBaseline': 'restored-full-report',
               'accountDataRewrittenByPublisher': False, 'backendRestarted': True, 'databaseBackup': str(backup / 'auth-before.sqlite')}
    applied = []
    activated = False
    try:
        for rel, data in patch.items():
            atomic_write(SOURCE / rel, data, owners[rel])
            applied.append(rel)
        expected_snapshot = dict(snapshot)
        expected_snapshot.update({rel: sha(data) for rel, data in patch.items()})
        require(input_snapshot(SOURCE) == expected_snapshot, 'Unexpected source change before activation')
        subprocess.run(['systemctl','restart','career-auth'],check=True,timeout=40)
        for attempt in range(25):
            try:
                if json.loads(fetch('/api/health')).get('status') == 'ok': break
            except Exception: pass
            time.sleep(.4)
        else: raise RuntimeError('Backend readiness timed out')
        atomic_link(release)
        activated = True
        expected_html = (release / 'index.html').read_bytes()
        for route in ('/', '/career-map', '/assistant', '/reports', '/learning', '/plan'):
            require(fetch(route + '?tree-release=' + stamp) == expected_html,
                    'New HTML not served at ' + route)
        for p in assets:
            rel = p.relative_to(release).as_posix()
            require(sha(fetch('/' + rel)) == file_sha(p), 'Served asset mismatch: ' + rel)
        require(json.loads(fetch('/api/health')).get('status') == 'ok', 'API readiness failed')
        require(service_pid() not in ('', '0', pid), 'Backend did not restart with the new assessment rules')
        require(input_snapshot(SOURCE) == expected_snapshot, 'Unexpected source change after activation')
        require(environment_fingerprint(service_pid()) == protected_env, 'Protected service environment changed')
        receipt['protectedEnvironmentUnchanged'] = True
        receipt.update(status='DEPLOY_OK', checkedAssets=len(assets), checkedRoutes=6,
                       receipt=str(backup / 'receipt.json'))
        (backup / 'receipt.json').write_text(json.dumps(receipt, indent=2))
        emit('DEPLOY_OK', **receipt)
    except BaseException as error:
        if activated:
            require(CURRENT.resolve() == release, 'Release changed externally; manual rollback required')
            atomic_link(previous)
        for rel in reversed(applied):
            target = SOURCE / rel
            require(file_sha(target) == sha(patch[rel]), 'Source changed externally: ' + rel)
            if original[rel] is None:
                saved = backup / 'reverted-new' / rel
                saved.parent.mkdir(parents=True, exist_ok=True)
                os.replace(target, saved)
            else:
                atomic_write(target, original[rel], owners[rel])
        subprocess.run(['systemctl','restart','career-auth'],check=True,timeout=40)
        receipt.update(status='ROLLED_BACK', reason=str(error))
        (backup / 'receipt.json').write_text(json.dumps(receipt, indent=2))
        emit('ROLLED_BACK', **receipt)
        raise


if __name__ == '__main__':
    try:
        with open('/run/lock/career-growth-tree-deploy.lock', 'w') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            publish()
    except BaseException as error:
        emit('DEPLOY_STOPPED', reason=str(error))
        sys.exit(1)
