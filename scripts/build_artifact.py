"""Build the claude.ai Artifact version of the page.

The hosted site (GitHub Pages) serves index.html as a full HTML document.
claude.ai Artifacts wrap the page in their own <!doctype>/<head>/<body>, so they
need just the inner content. This writes that fragment to .artifact/index.html.

Usage:  python scripts/build_artifact.py
"""
import pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
src = (root / "index.html").read_text(encoding="utf-8")
head = re.search(r"<head>(.*?)</head>", src, re.S).group(1)
body = re.search(r"<body>(.*?)</body>", src, re.S).group(1)
# drop tags the artifact skeleton already provides
head = re.sub(r'\s*<meta (charset|name="viewport")[^>]*>', "", head)
head = re.sub(r'\s*<link rel="icon"[^>]*>', "", head)
out = root / ".artifact" / "index.html"
out.parent.mkdir(exist_ok=True)
out.write_text(head.strip() + "\n\n" + body.strip() + "\n", encoding="utf-8")
print("wrote", out)
