#!/usr/bin/env python3
"""
Extract SVG muscle contour paths from 3D body model images — FINAL version.

Uses radial ray-casting with per-muscle tuned thresholds.
For muscles where ray-casting doesn't work well (core, front delts, side delts),
uses bounding-box constrained ray-casting with only bright/alpha as stopping criteria.

ViewBox: 0 0 160 492
Front body center: vb_x = 96.6
Back body center: vb_x = 69.5
"""

from PIL import Image
import numpy as np
import math

VB_W = 160
VB_H = 492
IMG_W = 500
IMG_H = 1536
SCALE_X = VB_W / IMG_W
SCALE_Y = VB_H / IMG_H

def px_to_vb(px, py):
    return (round(px * SCALE_X, 1), round(py * SCALE_Y, 1))

def vb_to_px(vx, vy):
    return (int(round(vx / SCALE_X)), int(round(vy / SCALE_Y)))

def load_image(path):
    img = np.array(Image.open(path).convert('RGBA')).astype(np.float64)
    lum = 0.299 * img[:,:,0] + 0.587 * img[:,:,1] + 0.114 * img[:,:,2]
    return lum, img[:,:,3]

def compute_gradient(lum):
    h, w = lum.shape
    gx = np.zeros_like(lum)
    gy = np.zeros_like(lum)
    gx[1:-1, 1:-1] = (-lum[0:-2, 0:-2] + lum[0:-2, 2:] - 2*lum[1:-1, 0:-2] + 2*lum[1:-1, 2:] - lum[2:, 0:-2] + lum[2:, 2:])
    gy[1:-1, 1:-1] = (-lum[0:-2, 0:-2] - 2*lum[0:-2, 1:-1] - lum[0:-2, 2:] + lum[2:, 0:-2] + 2*lum[2:, 1:-1] + lum[2:, 2:])
    return np.sqrt(gx**2 + gy**2)

def cast_ray(lum, alpha, grad, cx, cy, angle, min_r, max_r,
             grad_thresh=40, lum_jump=30, bright_thresh=242,
             bbox_vb=None):
    """Cast a ray, return boundary pixel coords. Optional bbox in vb coords."""
    h, w = lum.shape
    dx, dy = math.cos(angle), math.sin(angle)
    prev = lum[cy, cx]
    for r in range(min_r, max_r):
        x, y = int(round(cx+dx*r)), int(round(cy+dy*r))
        if x<0 or x>=w or y<0 or y>=h:
            return (int(round(cx+dx*(r-1))), int(round(cy+dy*(r-1))))
        # Bounding box check in vb coords
        if bbox_vb:
            vx, vy = px_to_vb(x, y)
            if vx < bbox_vb[0] or vx > bbox_vb[2] or vy < bbox_vb[1] or vy > bbox_vb[3]:
                return (x, y)
        if alpha[y,x] < 128:
            return (x, y)
        pl = lum[y,x]
        pg = grad[y,x]
        if pl > bright_thresh:
            return (x, y)
        if pg > grad_thresh:
            return (x, y)
        if abs(pl - prev) > lum_jump:
            return (x, y)
        prev = pl
    x, y = int(round(cx+dx*max_r)), int(round(cy+dy*max_r))
    return (max(0,min(w-1,x)), max(0,min(h-1,y)))

def extract_boundary(lum, alpha, grad, defn):
    """Extract boundary points using radial ray-casting."""
    seed = defn['seed_vb']
    cx, cy = vb_to_px(seed[0], seed[1])
    n_rays = defn.get('n_rays', 24)
    points = []
    for i in range(n_rays):
        angle = 2 * math.pi * i / n_rays
        pt = cast_ray(lum, alpha, grad, cx, cy, angle,
                      min_r=defn.get('min_r', 4),
                      max_r=defn.get('max_r', 80),
                      grad_thresh=defn.get('grad_thresh', 40),
                      lum_jump=defn.get('lum_jump', 30),
                      bright_thresh=defn.get('bright_thresh', 242),
                      bbox_vb=defn.get('bbox_vb', None))
        if pt:
            points.append(px_to_vb(pt[0], pt[1]))
    return points

def smooth_points(pts, window=2):
    n = len(pts)
    if n < window*2+1: return pts
    result = []
    for i in range(n):
        sx = sy = 0.0
        for j in range(-window, window+1):
            sx += pts[(i+j)%n][0]; sy += pts[(i+j)%n][1]
        c = 2*window+1
        result.append((round(sx/c,1), round(sy/c,1)))
    return result

def subsample(pts, target=14):
    n = len(pts)
    if n <= target: return pts
    step = n / target
    return [pts[int(round(i*step))%n] for i in range(target)]

def to_svg_path(pts):
    n = len(pts)
    if n < 3: return ""
    w = [pts[-1]] + list(pts) + [pts[0], pts[1]]
    parts = [f"M {w[1][0]} {w[1][1]}"]
    for i in range(1, len(w)-2):
        p0, p1, p2, p3 = [np.array(w[j]) for j in [i-1,i,i+1,i+2]]
        c1 = p1 + (p2-p0)/6.0
        c2 = p2 - (p3-p1)/6.0
        parts.append(f"C {c1[0]:.1f} {c1[1]:.1f}, {c2[0]:.1f} {c2[1]:.1f}, {p2[0]:.1f} {p2[1]:.1f}")
    parts.append("Z")
    return " ".join(parts)

def process(lum, alpha, grad, name, defn):
    """Process one muscle, return SVG path string."""
    boundary = extract_boundary(lum, alpha, grad, defn)
    if len(boundary) < 5:
        print(f"  {name}: FAILED ({len(boundary)} pts)")
        return None
    smoothed = smooth_points(boundary, window=defn.get('smooth', 2))
    target = defn.get('target_pts', 14)
    sampled = subsample(smoothed, target)
    path = to_svg_path(sampled)
    xs = [p[0] for p in sampled]; ys = [p[1] for p in sampled]
    print(f"  {name}: {len(boundary)}->{len(sampled)} pts, "
          f"x=[{min(xs):.1f}-{max(xs):.1f}] y=[{min(ys):.1f}-{max(ys):.1f}] "
          f"({max(xs)-min(xs):.0f}x{max(ys)-min(ys):.0f})")
    return path

# ── FRONT Muscles ──
FRONT = {
    'chest_left': {
        'seed_vb': (83, 182), 'n_rays': 24, 'min_r': 5, 'max_r': 65,
        'grad_thresh': 40, 'lum_jump': 35, 'target_pts': 14,
    },
    'chest_right': {
        'seed_vb': (111, 182), 'n_rays': 24, 'min_r': 5, 'max_r': 65,
        'grad_thresh': 40, 'lum_jump': 35, 'target_pts': 14,
    },
    'shoulder_left': {
        'seed_vb': (64, 162), 'n_rays': 24, 'min_r': 4, 'max_r': 50,
        'grad_thresh': 40, 'lum_jump': 30, 'target_pts': 12,
    },
    'shoulder_right': {
        'seed_vb': (129, 162), 'n_rays': 24, 'min_r': 4, 'max_r': 50,
        'grad_thresh': 40, 'lum_jump': 30, 'target_pts': 12,
    },
    'bicep_left': {
        'seed_vb': (56, 198), 'n_rays': 24, 'min_r': 4, 'max_r': 65,
        'grad_thresh': 40, 'lum_jump': 30, 'target_pts': 14,
    },
    'bicep_right': {
        'seed_vb': (138, 198), 'n_rays': 24, 'min_r': 4, 'max_r': 65,
        'grad_thresh': 40, 'lum_jump': 30, 'target_pts': 14,
    },
    'forearm_left': {
        'seed_vb': (47, 248), 'n_rays': 24, 'min_r': 4, 'max_r': 55,
        'grad_thresh': 40, 'lum_jump': 30, 'target_pts': 12,
    },
    'forearm_right': {
        'seed_vb': (146, 248), 'n_rays': 24, 'min_r': 4, 'max_r': 55,
        'grad_thresh': 40, 'lum_jump': 30, 'target_pts': 12,
    },
    # Core: use bbox constraint + only bright/alpha stopping (no grad/lum_jump)
    # The abs area is bounded by chest line (~y=196), groin (~y=262),
    # and arm gaps (~x=72 left, ~x=122 right)
    'core': {
        'seed_vb': (96.6, 228), 'n_rays': 32, 'min_r': 8, 'max_r': 120,
        'grad_thresh': 9999, 'lum_jump': 9999,
        'bbox_vb': (76, 196, 118, 262),
        'target_pts': 16, 'smooth': 3,
    },
    # Quads: higher thresholds since internal quad muscle lines are strong
    'quad_left': {
        'seed_vb': (80, 306), 'n_rays': 28, 'min_r': 5, 'max_r': 100,
        'grad_thresh': 80, 'lum_jump': 50, 'target_pts': 14,
    },
    'quad_right': {
        'seed_vb': (113, 306), 'n_rays': 28, 'min_r': 5, 'max_r': 100,
        'grad_thresh': 80, 'lum_jump': 50, 'target_pts': 14,
    },
}

# ── BACK Muscles ──
BACK = {
    'traps': {
        'seed_vb': (69.5, 158), 'n_rays': 28, 'min_r': 5, 'max_r': 70,
        'grad_thresh': 40, 'lum_jump': 30, 'target_pts': 14,
    },
    'rear_delt_left': {
        'seed_vb': (37, 163), 'n_rays': 24, 'min_r': 4, 'max_r': 45,
        'grad_thresh': 40, 'lum_jump': 30, 'target_pts': 12,
    },
    'rear_delt_right': {
        'seed_vb': (102, 163), 'n_rays': 24, 'min_r': 4, 'max_r': 45,
        'grad_thresh': 40, 'lum_jump': 30, 'target_pts': 12,
    },
    'back_central': {
        'seed_vb': (65.5, 207), 'n_rays': 28, 'min_r': 5, 'max_r': 80,
        'grad_thresh': 40, 'lum_jump': 30, 'target_pts': 14,
    },
    'lat_left': {
        'seed_vb': (50, 195), 'n_rays': 28, 'min_r': 5, 'max_r': 70,
        'grad_thresh': 38, 'lum_jump': 28, 'target_pts': 14,
    },
    'lat_right': {
        'seed_vb': (89, 195), 'n_rays': 28, 'min_r': 5, 'max_r': 70,
        'grad_thresh': 38, 'lum_jump': 28, 'target_pts': 14,
    },
    # Triceps: use bbox + moderate threshold to get proper elongated shape
    'tricep_left': {
        'seed_vb': (28, 200), 'n_rays': 24, 'min_r': 4, 'max_r': 60,
        'grad_thresh': 60, 'lum_jump': 40,
        'bbox_vb': (18, 176, 36, 228),
        'target_pts': 14,
    },
    'tricep_right': {
        'seed_vb': (111, 200), 'n_rays': 24, 'min_r': 4, 'max_r': 60,
        'grad_thresh': 60, 'lum_jump': 40,
        'bbox_vb': (103, 176, 121, 228),
        'target_pts': 14,
    },
    'glute_left': {
        'seed_vb': (52, 268), 'n_rays': 24, 'min_r': 5, 'max_r': 60,
        'grad_thresh': 40, 'lum_jump': 30,
        'bbox_vb': (34, 252, 68, 284),
        'target_pts': 14,
    },
    'glute_right': {
        'seed_vb': (87, 268), 'n_rays': 24, 'min_r': 5, 'max_r': 60,
        'grad_thresh': 40, 'lum_jump': 30,
        'bbox_vb': (71, 252, 105, 284),
        'target_pts': 14,
    },
    'hamstring_left': {
        'seed_vb': (52, 305), 'n_rays': 28, 'min_r': 5, 'max_r': 75,
        'grad_thresh': 45, 'lum_jump': 35,
        'bbox_vb': (36, 277, 68, 340),
        'target_pts': 14,
    },
    'hamstring_right': {
        'seed_vb': (87, 305), 'n_rays': 28, 'min_r': 5, 'max_r': 75,
        'grad_thresh': 45, 'lum_jump': 35,
        'bbox_vb': (71, 277, 103, 340),
        'target_pts': 14,
    },
    'calf_left': {
        'seed_vb': (46, 365), 'n_rays': 24, 'min_r': 4, 'max_r': 60,
        'grad_thresh': 40, 'lum_jump': 30,
        'bbox_vb': (36, 340, 64, 395),
        'target_pts': 12,
    },
    'calf_right': {
        'seed_vb': (93, 365), 'n_rays': 24, 'min_r': 4, 'max_r': 60,
        'grad_thresh': 40, 'lum_jump': 30,
        'bbox_vb': (75, 340, 103, 395),
        'target_pts': 12,
    },
}

def main():
    front_path = '/Users/johenilhernandez/LockedInFIT/assets/body-map/body-front.png'
    back_path = '/Users/johenilhernandez/LockedInFIT/assets/body-map/body-back.png'

    f_lum, f_a = load_image(front_path); f_g = compute_gradient(f_lum)
    b_lum, b_a = load_image(back_path); b_g = compute_gradient(b_lum)

    print("=== FRONT ===")
    fr = {}
    for n, d in FRONT.items():
        p = process(f_lum, f_a, f_g, n, d)
        if p: fr[n] = p

    print("\n=== BACK ===")
    br = {}
    for n, d in BACK.items():
        p = process(b_lum, b_a, b_g, n, d)
        if p: br[n] = p

    comments = {
        'chest_left': 'Left pec', 'chest_right': 'Right pec',
        'shoulder_left': 'Left shoulder', 'shoulder_right': 'Right shoulder',
        'bicep_left': 'Left bicep', 'bicep_right': 'Right bicep',
        'forearm_left': 'Left forearm', 'forearm_right': 'Right forearm',
        'core': 'Abs/core',
        'quad_left': 'Left quad', 'quad_right': 'Right quad',
        'traps': 'Trapezius diamond',
        'rear_delt_left': 'Left rear delt', 'rear_delt_right': 'Right rear delt',
        'back_central': 'Central back (rhomboids + erectors)',
        'lat_left': 'Left lat', 'lat_right': 'Right lat',
        'tricep_left': 'Left tricep', 'tricep_right': 'Right tricep',
        'glute_left': 'Left glute', 'glute_right': 'Right glute',
        'hamstring_left': 'Left hamstring', 'hamstring_right': 'Right hamstring',
        'calf_left': 'Left calf', 'calf_right': 'Right calf',
    }

    def emit(gname, keys, results):
        print(f"  {gname}: [")
        for k in keys:
            c = comments.get(k, k)
            if k in results:
                print(f"    // {c}")
                print(f"    '{results[k]}',")
            else:
                print(f"    // {c} -- FAILED")
        print("  ],")

    print("\n" + "="*80)
    print("FRONT_PATHS:")
    emit('chest', ['chest_left', 'chest_right'], fr)
    emit('shoulders', ['shoulder_left', 'shoulder_right'], fr)
    emit('biceps', ['bicep_left', 'bicep_right'], fr)
    emit('forearms', ['forearm_left', 'forearm_right'], fr)
    emit('core', ['core'], fr)
    emit('quads', ['quad_left', 'quad_right'], fr)

    print("\nBACK_PATHS:")
    emit('traps', ['traps'], br)
    emit('rear_delts', ['rear_delt_left', 'rear_delt_right'], br)
    emit('back', ['back_central'], br)
    emit('lats', ['lat_left', 'lat_right'], br)
    emit('triceps', ['tricep_left', 'tricep_right'], br)
    emit('glutes', ['glute_left', 'glute_right'], br)
    emit('hamstrings', ['hamstring_left', 'hamstring_right'], br)
    emit('calves', ['calf_left', 'calf_right'], br)


if __name__ == '__main__':
    main()
