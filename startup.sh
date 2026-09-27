#!/bin/sh
set -eu
cd /workspace
node scripts/preview.mjs stop || true
if curl -sf --max-time 2 http://127.0.0.1:8080/api/health | grep -q shelf-notes; then
  exit 0
fi
python3 - <<'PY'
import os, signal, time
needles = ("vite dev --host", "with-app-env.mjs vite", "uvicorn app:app")
for pid in os.listdir("/proc"):
    if not pid.isdigit():
        continue
    try:
        cmd = open(f"/proc/{pid}/cmdline", "rb").read().replace(b"\x00", b" ").decode()
    except OSError:
        continue
    if any(n in cmd for n in needles):
        try:
            os.kill(int(pid), signal.SIGTERM)
        except OSError:
            pass
time.sleep(0.3)
PY
python3 -m uvicorn app:app --app-dir pyapp --host 0.0.0.0 --port 8080 >>/tmp/app-startup.log 2>&1 &
