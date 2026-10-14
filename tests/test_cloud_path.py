"""Runs the cloud-path node:test behavioural suite from the Python test entrypoint."""

from __future__ import annotations

import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NODE_SUITE = ROOT / "tests" / "cloud-path.test.cjs"


@unittest.skipUnless(shutil.which("node"), "node is required for cloud-path behavioural tests")
class CloudPathBehaviorTests(unittest.TestCase):
    def test_node_suite_passes(self) -> None:
        result = subprocess.run(
            ["node", "--test", str(NODE_SUITE)], cwd=ROOT, capture_output=True, text=True, timeout=120,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
