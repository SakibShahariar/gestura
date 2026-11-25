#!/usr/bin/env python3
"""Build a distributable GNOME Shell extension bundle.

Usage: python3 scripts/package.py [output.zip]

Only runtime files are included; development-only files (tests, docs,
package.json, CI config, this script) are excluded by design.
"""

import json
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RUNTIME_FILES = (
    "metadata.json",
    "extension.js",
    "prefs.js",
    "gestureRecognizer.js",
    "windowActions.js",
    "windowHistory.js",
    "windowTracker.js",
    "schemas/org.gnome.shell.extensions.gestura.gschema.xml",
)


def main():
    metadata = json.loads((ROOT / "metadata.json").read_text(encoding="utf-8"))
    uuid = metadata["uuid"]
    output = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / f"{uuid}.shell-extension.zip"
    output = output.resolve()

    missing = [name for name in RUNTIME_FILES if not (ROOT / name).is_file()]
    if missing:
        raise SystemExit(f"missing runtime files: {', '.join(missing)}")

    with tempfile.TemporaryDirectory() as tmp:
        schema_dir = Path(tmp) / "schemas"
        schema_dir.mkdir()
        shutil.copy2(
            ROOT / "schemas/org.gnome.shell.extensions.gestura.gschema.xml",
            schema_dir / "org.gnome.shell.extensions.gestura.gschema.xml",
        )
        subprocess.run(
            ["glib-compile-schemas", "--strict", "--targetdir", str(schema_dir), str(schema_dir)],
            check=True,
        )

        output.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as bundle:
            for name in RUNTIME_FILES:
                bundle.write(ROOT / name, name)
            bundle.write(schema_dir / "gschemas.compiled", "schemas/gschemas.compiled")

    print(f"built {output} (uuid: {uuid})")


if __name__ == "__main__":
    main()
