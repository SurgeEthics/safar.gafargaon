import zlib
import struct
import math

def create_png(filename, width, height, get_alpha):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # filter none
        for x in range(width):
            alpha = max(0, min(255, int(get_alpha(x, y, width, height))))
            # Android status bar badge expects pure white with transparency:
            # R=255, G=255, B=255, A=alpha
            raw_data.extend([255, 255, 255, alpha])
            
    compressed = zlib.compress(bytes(raw_data), level=9)
    
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
        
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)) # 8-bit RGBA
    png += chunk(b'IDAT', compressed)
    png += chunk(b'IEND', b'')
    
    with open(filename, 'wb') as f:
        f.write(png)
    print(f"Created {filename} ({width}x{height})")

def dist_segment(px, py, x1, y1, x2, y2):
    dx = x2 - x1
    dy = y2 - y1
    l2 = dx*dx + dy*dy
    if l2 == 0:
        return math.hypot(px - x1, py - y1)
    t = max(0, min(1, ((px - x1)*dx + (py - y1)*dy) / l2))
    proj_x = x1 + t * dx
    proj_y = y1 + t * dy
    return math.hypot(px - proj_x, py - proj_y)

def badge_alpha(x, y, w, h):
    # Normalize coordinates to 0..100
    nx = (x + 0.5) / w * 100.0
    ny = (y + 0.5) / h * 100.0
    
    # 1. Top Location Pin at (50, 22)
    # Head circle radius 14
    dx_pin = nx - 50.0
    dy_pin = ny - 20.0
    dist_pin_head = math.hypot(dx_pin, dy_pin)
    
    # Inner hole radius 5
    if dist_pin_head < 5.0:
        return 0
        
    if dist_pin_head <= 13.0:
        return 255
        
    # Triangle bottom of pin pointing to (50, 36)
    if 20.0 <= ny <= 36.0:
        half_w = (36.0 - ny) / 16.0 * 12.0
        if abs(nx - 50.0) <= half_w:
            return 255

    # 2. Smooth road / 'স' loop stroke:
    # Key waypoints for route stroke:
    # Start: (22, 54) -> (20, 72) -> (38, 82) -> (64, 82) -> (78, 70) -> (72, 52) -> (50, 42) -> (32, 58) -> (32, 82)
    # Let's define curve segments
    segments = [
        # Base horizontal road bar: (24, 80) to (76, 80)
        (24, 80, 76, 80, 7.0),
        # Vertical riser on left: (32, 60) to (32, 80)
        (32, 60, 32, 80, 7.0),
        # Diagonal swoop: (52, 48) to (32, 60)
        (52, 48, 32, 60, 7.0),
        # Upper arc top: (70, 52) to (52, 48)
        (70, 52, 52, 48, 7.0),
        # Right outer arc: (74, 66) to (70, 52)
        (74, 66, 70, 52, 7.0),
        # Left starting arc to (24, 64)
        (22, 60, 32, 48, 6.5),
        (32, 48, 48, 46, 6.5)
    ]
    
    min_dist_to_stroke = 999.0
    for x1, y1, x2, y2, stroke_w in segments:
        d = dist_segment(nx, ny, x1, y1, x2, y2)
        if d <= stroke_w:
            return 255
        if d < min_dist_to_stroke:
            min_dist_to_stroke = d
            
    # Pin marker start dot at (22, 60)
    if math.hypot(nx - 22, ny - 60) <= 6.0:
        return 255
        
    # Anti-aliasing edge
    if min_dist_to_stroke < 8.5:
        edge = 1.0 - (min_dist_to_stroke - 7.0) / 1.5
        return edge * 255
        
    return 0

if __name__ == '__main__':
    create_png('public/notification-badge-96.png', 96, 96, badge_alpha)
    create_png('public/notification-badge-72.png', 72, 72, badge_alpha)
