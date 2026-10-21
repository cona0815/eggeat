#!/usr/bin/env python3
# 把 src/ 組成單一 dist/index.html
import os, re, sys
root = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(root, 'src')
shell = open(os.path.join(src, 'shell.html'), encoding='utf-8').read()
css = open(os.path.join(src, 'style.css'), encoding='utf-8').read()
jsdir = os.path.join(src, 'js')
parts = []
for f in sorted(os.listdir(jsdir)):
    if not f.endswith('.js') or f.startswith('_'): continue
    t = open(os.path.join(jsdir, f), encoding='utf-8').read()
    if '/*FALLBACK_TRACKS*/' in t:
        t = t.replace('/*FALLBACK_TRACKS*/', open(os.path.join(jsdir, '_tracks_fallback.js'), encoding='utf-8').read())
    parts.append(f'/* ───── {f} ───── */\n' + t)
js = '\n'.join(parts)
out = shell.replace('/*CSS*/', css).replace('/*JS*/', js)
os.makedirs(os.path.join(root, 'dist'), exist_ok=True)
open(os.path.join(root, 'dist', 'index.html'), 'w', encoding='utf-8').write(out)
open(os.path.join(root, 'dist', '_bundle.mjs'), 'w', encoding='utf-8').write(js)
print('built', len(out), 'bytes')
