#!/usr/bin/env python3
"""Local-only fixtures; never reads the real environment file or real key."""
import contextlib
import importlib.util
import io
import os
import pty
from pathlib import Path
import select
import stat
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('key_helper', Path(__file__).with_name('set-key.py'))
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)


class PrivateConfigTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='career-ai-config-test-')
        self.base = Path(self.tmp.name)
        self.base.chmod(0o700)
        self.path = self.base / 'ai.env'
        self.original = 'AI_ENABLED=1\nDEEPSEEK_API_KEY=\nAI_BUDGET_CNY=8.00\n'
        self.path.write_text(self.original, encoding='utf-8')
        self.path.chmod(0o600)

    def tearDown(self):
        self.tmp.cleanup()

    def test_atomic_private_write_keeps_ai_off_and_budget(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
            helper.save_key(self.path, 'sk-fixture-not-a-real-key-12345', require_root=False)
        _, values = helper.safe_config(self.path, require_root=False)
        self.assertEqual(values['DEEPSEEK_API_KEY'], 'sk-fixture-not-a-real-key-12345')
        self.assertEqual(values['AI_ENABLED'], '0')
        self.assertEqual(values['AI_BUDGET_CNY'], '8.00')
        self.assertEqual(stat.S_IMODE(self.path.stat().st_mode), 0o600)
        self.assertEqual(output.getvalue(), '')
        self.assertEqual(list(self.base.glob('.ai-env-*')), [])

    def test_bad_inputs_do_not_change_file(self):
        for key in ['short', 'sk-test\nAI_ENABLED=1', 'sk-test key-has-spaces', "sk-test-quote'not-allowed"]:
            with self.assertRaises(ValueError):
                helper.save_key(self.path, key, require_root=False)
            self.assertEqual(self.path.read_text(), self.original)

    def test_broad_permissions_rejected(self):
        self.path.chmod(0o644)
        with self.assertRaises(ValueError):
            helper.save_key(self.path, 'sk-fixture-not-a-real-key-12345', require_root=False)
        self.path.chmod(0o600)
        self.base.chmod(0o755)
        with self.assertRaises(ValueError):
            helper.safe_config(self.path, require_root=False)
        self.base.chmod(0o700)

    def test_symlink_and_hardlink_rejected(self):
        linked = self.base / 'linked.env'
        linked.symlink_to(self.path)
        with self.assertRaises(ValueError):
            helper.safe_config(linked, require_root=False)
        linked.unlink()
        os.link(self.path, linked)
        with self.assertRaises(ValueError):
            helper.safe_config(self.path, require_root=False)

    def test_duplicates_rejected_without_overwriting(self):
        duplicate = self.original + 'DEEPSEEK_API_KEY=duplicate\n'
        self.path.write_text(duplicate)
        with self.assertRaises(ValueError):
            helper.save_key(self.path, 'sk-fixture-not-a-real-key-12345', require_root=False)
        self.assertEqual(self.path.read_text(), duplicate)

    def test_visible_input_fallback_aborts_without_writing(self):
        with patch.object(helper, 'CONFIG', self.path), patch('sys.stdin.isatty', return_value=True), \
             patch.object(helper.getpass, 'getpass', side_effect=helper.getpass.GetPassWarning('cannot hide input')):
            with self.assertRaises(helper.getpass.GetPassWarning):
                helper.main()
        self.assertEqual(self.path.read_text(), self.original)

    def test_interactive_pty_never_echoes_fixture_key(self):
        child, terminal = pty.fork()
        if child == 0:
            try:
                helper.CONFIG = self.path
                helper.main()
                sys.stdout.flush()
                sys.stderr.flush()
                os._exit(0)
            except BaseException:
                os._exit(1)
        transcript = bytearray()
        deadline = time.monotonic() + 5
        def await_text(token):
            while token not in transcript:
                if time.monotonic() >= deadline:
                    raise AssertionError('Interactive prompt timed out')
                if select.select([terminal], [], [], 0.1)[0]:
                    transcript.extend(os.read(terminal, 4096))
        try:
            fixture = b'sk-pty-fixture-not-a-real-key-12345'
            await_text(b'Paste DeepSeek API key (hidden): ')
            os.write(terminal, fixture + b'\n')
            await_text(b'Paste it again to confirm (hidden): ')
            os.write(terminal, fixture + b'\n')
            await_text(b'No service was restarted.')
            _, result = os.waitpid(child, 0)
            self.assertEqual(result, 0)
            self.assertNotIn(fixture, transcript)
            self.assertEqual(helper.safe_config(self.path, require_root=False)[1]['AI_ENABLED'], '0')
        finally:
            os.close(terminal)
            try:
                os.kill(child, 9)
                os.waitpid(child, 0)
            except ProcessLookupError:
                pass


if __name__ == '__main__':
    unittest.main()
