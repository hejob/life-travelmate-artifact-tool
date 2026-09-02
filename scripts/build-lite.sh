#!/bin/sh
# Generate the Lite (publicly shareable) variant from the main app file.
# Run after any edit to app/sankara-days.html, then republish BOTH artifacts.
cd "$(dirname "$0")/.." || exit 1
python3 - <<'EOF'
src = "app/sankara-days.html"
out = "app/sankara-days-lite.html"
s = open(src).read()
assert "<title>Sankara Days</title>" in s, "main title marker not found"
assert '<span id="syncTxt">local</span>' in s, "sync label marker not found"
s = s.replace("<title>Sankara Days</title>", "<title>Sankara Days Lite</title>", 1)
s = s.replace('<span id="syncTxt">local</span>', '<span id="syncTxt">this device</span>', 1)
open(out, "w").write(s)
print("wrote", out)
EOF
