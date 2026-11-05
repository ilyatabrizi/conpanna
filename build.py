#!/usr/bin/env python3
"""Assemble index.html and sw.js: inline the lockup into the opening screen,
stamp a content version on every asset URL, list modules to preload and files to cache."""
import hashlib, json, pathlib, re
root = pathlib.Path(__file__).parent
files = sorted(p for p in root.rglob("*") if p.is_file() and not any(x in p.parts for x in (".git",)) and p.name not in ("index.html", "sw.js", "build.py", "index.src.html", "sw.src.js", "README.md", "admin.html", "admin.src.html") and not p.name.startswith("."))
h = hashlib.sha1()
for p in files: h.update(p.read_bytes())
for p in ("index.src.html", "sw.src.js", "admin.src.html"): h.update((root / p).read_bytes())
v = h.hexdigest()[:10]
brand = (root / "js/brand.js").read_text()
lockup = re.search(r"export const LOCKUP = `(.*?)`;", brand, re.S).group(1)
mods = sorted(str(p.relative_to(root)) for p in (root / "js").rglob("*.js") if p.name not in ("app.js", "qr.js") and "admin" not in p.parts)
pre = "\n".join(f'<link rel="modulepreload" href="{m}">' for m in mods)
html = (root / "index.src.html").read_text().replace("__V__", v).replace("__LOCKUP__", lockup).replace("__PRELOAD__", pre)
(root / "index.html").write_text(html)
(root / "admin.html").write_text((root / "admin.src.html").read_text().replace("__V__", v))
assets = ["./", "admin.html", "manifest.webmanifest"] + [str(p.relative_to(root)) for p in files if p.suffix in (".js", ".css", ".woff2", ".png", ".jpg", ".webmanifest") and p.name != "manifest.webmanifest" and "og.jpg" not in p.name]
sw = (root / "sw.src.js").read_text().replace("__V__", v).replace("__ASSETS__", json.dumps(assets, indent=0))
(root / "sw.js").write_text(sw)
print("built", v, len(assets), "cached files")
