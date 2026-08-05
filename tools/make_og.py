# datism.kr OG 카드 생성 — 밤 인디고 + 별밤 + 가운데 흰 로고.
# 워드마크 SVG가 브랜드 정본이므로 폰트로 다시 조판하지 않고 패스를 직접 래스터라이즈한다.
import re, math   # 실행: python3 tools/make_og.py (저장소 루트에서)
from PIL import Image, ImageDraw, ImageChops

W, H, SS = 1200, 630, 4          # SS = 슈퍼샘플 배율(안티에일리어싱)
NT_DEEP, NT_BG, NT_RISE = (16, 21, 46), (21, 28, 63), (30, 42, 90)

def tokens(d):
    return re.findall(r'[MLQCZmlqcz]|-?\d*\.?\d+(?:e[-+]?\d+)?', d)

def flatten(d, steps=24):
    """SVG 패스 → 서브패스별 점 목록. M/L/Q/C/Z 절대좌표만 쓴다(두 파일 모두 그렇다)."""
    tk, i = tokens(d), 0
    subs, cur, start, cmd = [], [], (0.0, 0.0), None
    px = py = 0.0
    def num():
        nonlocal i
        v = float(tk[i]); i += 1; return v
    while i < len(tk):
        t = tk[i]
        if t.isalpha():
            cmd = t; i += 1
        if cmd in ('M', 'm'):
            if cur: subs.append(cur)
            px, py = num(), num(); cur = [(px, py)]; start = (px, py); cmd = 'L'
        elif cmd in ('L', 'l'):
            px, py = num(), num(); cur.append((px, py))
        elif cmd in ('Q', 'q'):
            x1, y1, x, y = num(), num(), num(), num()
            for s in range(1, steps + 1):
                u = s / steps; v = 1 - u
                cur.append((v*v*px + 2*v*u*x1 + u*u*x, v*v*py + 2*v*u*y1 + u*u*y))
            px, py = x, y
        elif cmd in ('C', 'c'):
            x1, y1, x2, y2, x, y = num(), num(), num(), num(), num(), num()
            for s in range(1, steps + 1):
                u = s / steps; v = 1 - u
                cur.append((v**3*px + 3*v*v*u*x1 + 3*v*u*u*x2 + u**3*x,
                            v**3*py + 3*v*v*u*y1 + 3*v*u*u*y2 + u**3*y))
            px, py = x, y
        elif cmd in ('Z', 'z'):
            if cur:
                cur.append(start); subs.append(cur); cur = []
            px, py = start
            i += 0
        else:
            i += 1
    if cur: subs.append(cur)
    return [s for s in subs if len(s) > 2]

def render(paths, vb, box_w, box_h):
    """even-odd 채우기 — 서브패스 마스크를 XOR로 합친다(D·A의 구멍이 뚫린다)."""
    vx, vy, vw, vh = vb
    sx, sy = box_w * SS / vw, box_h * SS / vh
    acc = Image.new('1', (int(box_w * SS), int(box_h * SS)), 0)
    for d in paths:
        for sub in flatten(d):
            m = Image.new('1', acc.size, 0)
            ImageDraw.Draw(m).polygon([((x - vx) * sx, (y - vy) * sy) for x, y in sub], fill=1)
            acc = ImageChops.logical_xor(acc, m)
    return acc.convert('L').resize((int(box_w), int(box_h)), Image.LANCZOS)

# ── 배경: 위는 깊고 아래는 밝은 밤하늘 ──
card = Image.new('RGB', (W, H))
dr = ImageDraw.Draw(card)
for y in range(H):
    t = y / (H - 1)
    dr.line([(0, y), (W, y)], fill=tuple(round(NT_DEEP[c] + (NT_BG[c] - NT_DEEP[c]) * min(1, t / 0.6)) for c in range(3)))
glow = Image.new('L', (W, H), 0)
gd = ImageDraw.Draw(glow)
for r in range(70, 0, -1):
    gd.ellipse([W/2 - 9*r, H - 1.6*r, W/2 + 9*r, H + 2.2*r], fill=int(74 * (1 - r/70)**1.6))
card = Image.composite(Image.new('RGB', (W, H), NT_RISE), card, glow)

# ── 별: 사이트 하늘(viewBox 1200×800)의 중간 띠를 그대로 가져온다 ──
STARS = [(118,96,1.6),(286,188,1.1),(412,72,1.9),(534,232,1.2),(196,330,1.5),(668,118,1.3),
         (742,286,1.7),(352,404,1.1),(954,88,1.4),(1038,252,1.2),(86,216,1.2),(1122,146,1.6),
         (612,46,1.1),(470,316,1.4),(820,196,1.1),(248,452,1.3),(1006,392,1.2),(704,418,1.5),
         (146,524,1.1),(880,512,1.2),(452,146,1.3),(596,352,1.2),(518,522,1.4),(682,66,1.1),
         (760,596,1.2),(430,638,1.3),(640,252,1.1),(556,98,1.2),(716,486,1.4),(488,418,1.1)]
sl = Image.new('RGBA', (W*2, H*2), (0,0,0,0)); sd = ImageDraw.Draw(sl)
for x, y, r in STARS:
    cy = (y - 85) * (H / 630)          # 800 높이의 가운데 630 띠
    if -10 < cy < H + 10:
        rr = r * 2.1
        sd.ellipse([x*2 - rr, cy*2 - rr, x*2 + rr, cy*2 + rr], fill=(195, 201, 232, 150))
card = Image.alpha_composite(card.convert('RGBA'), sl.resize((W, H), Image.LANCZOS))

# ── 로고 록업 (마크 + 워드마크, 흰색) ──
wm_svg = open('assets/wordmark_S.svg', encoding='utf-8').read()
wm_paths = re.findall(r'\sd="([^"]+)"', wm_svg)
wm_vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', wm_svg).group(1).split()]
mark_d = re.search(r'<svg class="wordmark-mark".*?<path d="([^"]+)"',
                   open('index.html', encoding='utf-8').read(), re.S).group(1)

WMH = 82                                    # 워드마크 박스 높이
wm_w = WMH * (wm_vb[2] / wm_vb[3])
mk_h, mk_w = WMH * 1.122, WMH * 1.537       # 푸터 록업과 같은 비례
GAP = WMH * 0.30
wm_m = render(wm_paths, wm_vb, round(wm_w), round(WMH))
mk_m = render([mark_d], [0, 0, 173, 127], round(mk_w), round(mk_h))

total = mk_w + GAP + wm_w
# 마크 SVG는 왼쪽 여백(18%)이 오른쪽(8%)보다 넓다 — 기하학적 중앙에 두면 오른쪽으로 쏠린다
optical = (31 - 14) / 173 * mk_w / 2
left = (W - total) / 2 - optical
cy = H / 2
white = Image.new('RGB', (W, H), (255, 255, 255))
for mask, x, y in ((mk_m, left, cy - mk_h/2), (wm_m, left + mk_w + GAP, cy - WMH/2)):
    layer = Image.new('L', (W, H), 0)
    layer.paste(mask, (round(x), round(y)))
    card = Image.composite(white.convert('RGBA'), card, layer)

card.convert('RGB').save('assets/og.png', 'PNG', optimize=True)
print('저장 완료 assets/og.png', card.size)
