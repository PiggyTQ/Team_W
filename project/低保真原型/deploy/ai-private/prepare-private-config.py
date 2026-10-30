#!/usr/bin/env python3
"""Install inactive AI configuration; never reload or restart the service."""
import json
import os
from pathlib import Path
import stat

BASE = Path('/etc/career-growth')
SOURCE = Path(__file__).resolve().parent


def install():
    if os.geteuid() != 0:
        raise RuntimeError('Root required')
    if BASE.is_symlink():
        raise RuntimeError('Refusing symlink directory')
    if BASE.exists():
        directory = BASE.stat()
        if not stat.S_ISDIR(directory.st_mode) or directory.st_uid != 0 or stat.S_IMODE(directory.st_mode) != 0o700:
            raise RuntimeError('Existing directory has unexpected owner or permissions')
    else:
        BASE.mkdir(mode=0o700)
    config = BASE / 'ai.env'
    if config.is_symlink():
        raise RuntimeError('Refusing symlink configuration')
    created = not config.exists()
    if created:
        fd = os.open(config, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w', encoding='utf-8', newline='\n') as target:
            target.write((SOURCE / 'ai.env.example').read_text(encoding='utf-8'))
    # Existing key files are never read, echoed or overwritten by the installer.
    info = config.stat()
    if not stat.S_ISREG(info.st_mode) or info.st_uid != 0 or stat.S_IMODE(info.st_mode) != 0o600 or info.st_nlink != 1:
        raise RuntimeError('Existing configuration has unexpected owner, permissions or links')
    helper = BASE / 'set-ai-key.py'
    candidate = BASE / 'career-auth-ai.conf.pending'
    for target, body, mode in [
        (helper, (SOURCE / 'set-key.py').read_bytes(), 0o700),
        (candidate, b'[Service]\nEnvironmentFile=/etc/career-growth/ai.env\n', 0o600)
    ]:
        if target.is_symlink():
            raise RuntimeError('Refusing symlink output')
        if target.exists():
            previous = target.stat()
            if not stat.S_ISREG(previous.st_mode) or previous.st_uid != 0 or previous.st_nlink != 1 or target.read_bytes() != body:
                raise RuntimeError('Existing helper differs; review before replacing')
            continue
        fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, mode)
        with os.fdopen(fd, 'wb') as stream:
            stream.write(body)
    print(json.dumps({'configCreated': created, 'configPath': str(config), 'keyHelper': str(helper),
                      'budgetCny': '8.00', 'serviceRestarted': False, 'liveSystemdChanged': False}))


if __name__ == '__main__':
    install()
