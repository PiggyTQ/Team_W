"""Create and verify a consistent online SQLite backup without copying WAL files."""
import argparse
import json
import os
import datetime
import pathlib
import sqlite3
import tempfile
import time
from contextlib import closing

parser = argparse.ArgumentParser()
parser.add_argument('--database', default='/var/lib/career-growth/auth.sqlite')
parser.add_argument('--directory', default='/var/backups/career-growth')
parser.add_argument('--prefix', default='career')
parser.add_argument('--knowledge', default='/srv/career-growth/source/server/data/knowledge.sqlite')
parser.add_argument('--budget', default='/var/lib/career-growth/ai-budget.sqlite')
args = parser.parse_args()
if args.prefix not in ('career', 'before-business'):
    raise SystemExit('Unsupported backup prefix')
folder = pathlib.Path(args.directory).resolve()
folder.mkdir(parents=True, exist_ok=True, mode=0o700)
folder.chmod(0o700)
stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
target = folder / f'{args.prefix}-{stamp}.sqlite'
source = pathlib.Path(args.database).resolve()
with closing(sqlite3.connect(source.as_uri() + '?mode=ro', uri=True)) as live:
    with closing(sqlite3.connect(target)) as backup:
        live.backup(backup, pages=128)
        assert backup.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
        assert not backup.execute('PRAGMA foreign_key_check').fetchall()
target.chmod(0o600)
budget = pathlib.Path(args.budget).resolve()
if budget.is_file():
    # Never reset or restore an older cost ledger over newer reservations.
    # This is an independent forensic backup, not an automatic rollback input.
    budget_target = folder / f'{args.prefix}-{stamp}-ai-budget.sqlite'
    with closing(sqlite3.connect(budget.as_uri() + '?mode=ro', uri=True)) as ledger:
        with closing(sqlite3.connect(budget_target)) as saved_ledger:
            ledger.backup(saved_ledger, pages=128)
            assert saved_ledger.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
    budget_target.chmod(0o600)
knowledge = pathlib.Path(args.knowledge).resolve()
if knowledge.is_file():
    knowledge_target = folder / f'{args.prefix}-{stamp}-knowledge.sqlite'
    with closing(sqlite3.connect(knowledge.as_uri() + '?mode=ro', uri=True)) as catalog:
        with closing(sqlite3.connect(knowledge_target)) as saved_catalog:
            catalog.backup(saved_catalog, pages=128)
            assert saved_catalog.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
            assert saved_catalog.execute('SELECT count(*) FROM profiles').fetchone()[0] == 89
    knowledge_target.chmod(0o600)
with tempfile.TemporaryDirectory(prefix='restore-check-', dir=folder) as temp:
    restored = pathlib.Path(temp) / 'restored.sqlite'
    with closing(sqlite3.connect(target.as_uri() + '?mode=ro', uri=True)) as saved:
        with closing(sqlite3.connect(restored)) as check:
            saved.backup(check, pages=128)
            assert check.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
            assert not check.execute('PRAGMA foreign_key_check').fetchall()
cutoff = time.time() - 14 * 86400
for pattern in ('career-*.sqlite', 'before-business-*.sqlite'):
    for old in folder.glob(pattern):
        if old != target and not old.is_symlink() and old.is_file() and old.stat().st_mtime < cutoff:
            old.unlink()
receipt_temp = folder / f'.last-success-{stamp}.json'
receipt_temp.touch(mode=0o600, exist_ok=False)
receipt_temp.write_text(json.dumps({'verifiedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'accountBackup': target.name, 'restoreCheck': True}), encoding='utf-8')
os.replace(receipt_temp, folder / 'last-success.json')
print(f'Verified SQLite backup: {target}')
print('Restore check passed; managed backup retention: 14 days.')
