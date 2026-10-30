#!/usr/bin/env python3
"""Fill the root-only AI environment file without echoing or logging its key."""
import getpass
import json
import os
from pathlib import Path
import re
import stat
import sys
import tempfile
import warnings

CONFIG = Path('/etc/career-growth/ai.env')


def safe_config(path, require_root=True):
    path = Path(path)
    if path.is_symlink() or path.parent.is_symlink():
        raise ValueError('Symlink configuration is not allowed')
    parent, info = path.parent.stat(), path.stat()
    if not stat.S_ISDIR(parent.st_mode) or stat.S_IMODE(parent.st_mode) != 0o700:
        raise ValueError('Configuration directory must be mode 700')
    if not stat.S_ISREG(info.st_mode) or stat.S_IMODE(info.st_mode) != 0o600 or info.st_nlink != 1:
        raise ValueError('Configuration must be a regular, single-link file with mode 600')
    if require_root and (info.st_uid != 0 or parent.st_uid != 0):
        raise ValueError('Configuration and directory must belong to root')
    content = path.read_text(encoding='utf-8')
    values = {}
    for line in content.splitlines():
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        key, sep, value = line.partition('=')
        if not sep or not re.fullmatch(r'[A-Z][A-Z0-9_]*', key) or key in values:
            raise ValueError('Invalid configuration format')
        values[key] = value
    return content, values


def save_key(path, key, require_root=True):
    if not re.fullmatch(r'[A-Za-z0-9_.-]{16,512}', key):
        raise ValueError('Invalid key format; no whitespace, quotes or line breaks are allowed')
    path = Path(path)
    content, values = safe_config(path, require_root)
    if 'DEEPSEEK_API_KEY' not in values or 'AI_ENABLED' not in values:
        raise ValueError('Expected AI configuration entries are missing')
    lines = []
    for line in content.splitlines():
        if line.startswith('DEEPSEEK_API_KEY='):
            line = 'DEEPSEEK_API_KEY=' + key
        elif line.startswith('AI_ENABLED='):
            line = 'AI_ENABLED=0'
        lines.append(line)
    descriptor, temporary = tempfile.mkstemp(prefix='.ai-env-', dir=path.parent)
    try:
        os.fchmod(descriptor, 0o600)
        with os.fdopen(descriptor, 'w', encoding='utf-8', newline='\n') as target:
            target.write('\n'.join(lines) + '\n')
            target.flush()
            os.fsync(target.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def main():
    if not hasattr(os, 'geteuid') or os.geteuid() != 0:
        raise ValueError('Run this helper as root on the server')
    if sys.argv[1:] == ['--status']:
        _, values = safe_config(CONFIG)
        print(json.dumps({'keyConfigured': bool(values.get('DEEPSEEK_API_KEY')),
                          'aiEnabled': values.get('AI_ENABLED') == '1',
                          'budgetCny': values.get('AI_BUDGET_CNY'),
                          'configMode': '0600', 'configOwner': 'root'}))
        return
    if sys.argv[1:]:
        raise ValueError('Usage: python3 /etc/career-growth/set-ai-key.py [--status]')
    if not sys.stdin.isatty():
        raise ValueError('An interactive terminal is required; the key is never accepted as an argument')
    safe_config(CONFIG)
    with warnings.catch_warnings():
        # Never fall back to visible input if terminal echo cannot be disabled.
        warnings.simplefilter('error', getpass.GetPassWarning)
        key = getpass.getpass('Paste DeepSeek API key (hidden): ')
        repeated = getpass.getpass('Paste it again to confirm (hidden): ')
    if key != repeated:
        raise ValueError('Entries differ; the configuration was not changed')
    save_key(CONFIG, key)
    print('Key saved privately. AI remains disabled. No service was restarted.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, KeyboardInterrupt, EOFError, getpass.GetPassWarning):
        # Never print exception details: third-party terminal errors may include input.
        print('Configuration not changed or unavailable. Check root access, file permissions and matching key input.', file=sys.stderr)
        sys.exit(1)
