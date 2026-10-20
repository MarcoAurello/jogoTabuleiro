"""Recorta as animações da Nágila de referencias/sprites.jpg e tira o fundo branco.
Saída: assets/nagila/nagila_feliz.png e nagila_tchau.png (folha horizontal, quadros do mesmo tamanho).
Uso: python ferramentas/sprites.py"""
from collections import deque
from pathlib import Path
from PIL import Image
import numpy as np

RAIZ = Path(__file__).resolve().parent.parent
img = np.array(Image.open(RAIZ / 'referencias' / 'sprites.jpg').convert('RGB')).astype(int)

def fundo(p):
    return p.min() > 228 and p.max() - p.min() < 18

def recortar(x0, y0, x1, y1):
    cel = img[y0:y1, x0:x1]
    H, W = cel.shape[:2]
    bg = np.zeros((H, W), bool)
    fila = deque([(x, 0) for x in range(W)] + [(x, H - 1) for x in range(W)] +
                 [(0, y) for y in range(H)] + [(W - 1, y) for y in range(H)])
    while fila:
        x, y = fila.popleft()
        if x < 0 or y < 0 or x >= W or y >= H or bg[y, x] or not fundo(cel[y, x]):
            continue
        bg[y, x] = True
        fila.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    rgba = np.zeros((H, W, 4), np.uint8)
    rgba[..., :3] = cel
    rgba[..., 3] = np.where(bg, 0, 255)
    ys, xs = np.where(~bg)
    return Image.fromarray(rgba).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))

def folha(nome, celulas):
    quadros = [recortar(*c) for c in celulas]
    w = max(q.width for q in quadros) + 6
    h = max(q.height for q in quadros) + 4
    out = Image.new('RGBA', (w * len(quadros), h), (0, 0, 0, 0))
    for i, q in enumerate(quadros):   # alinhados pelos pés, no centro do quadro
        out.paste(q, (i * w + (w - q.width) // 2, h - q.height - 2), q)
    out.save(RAIZ / 'assets' / 'nagila' / f'{nome}.png', optimize=True)
    print(nome, len(quadros), 'quadros', w, 'x', h)

folha('nagila_feliz', [(60, 180, 300, 500), (320, 180, 580, 500), (60, 515, 300, 865),
                       (320, 515, 580, 865), (60, 870, 300, 1215), (320, 870, 580, 1215)])
folha('nagila_tchau', [(45, 1325, 225, 1646), (225, 1325, 410, 1646), (410, 1325, 590, 1646)])
