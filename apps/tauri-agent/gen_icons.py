import struct, zlib

def make_png(width, height, pixel_func):
    def chunk(ctype, data):
        c = ctype + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    raw = b""
    for y in range(height):
        raw += b"\x00"
        for x in range(width):
            r, g, b, a = pixel_func(x, y, width, height)
            raw += struct.pack("BBBB", r, g, b, a)
    idat = zlib.compress(raw)
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", ihdr)
    png += chunk(b"IDAT", idat)
    png += chunk(b"IEND", b"")
    return png

def simple_cursor_pixel(x, y, w, h):
    """Simple cursor icon - just a white cursor on dark bg"""
    bg_r, bg_g, bg_b = 15, 15, 20
    
    # Draw a simple cursor shape (arrow-ish)
    cx = w // 2
    cy = h // 2
    
    # Cursor triangle pointing up-right
    # Simple arrow shape
    points = []
    arrow_size = min(w, h) // 3
    
    # Main triangle body
    for y in range(h):
        for x in range(w):
            # Cursor shape - simple arrow
            # Point at top-right, tail at bottom-left
            dx = x - cx + arrow_size // 2
            dy = y - cy + arrow_size // 2
            
            # Arrow head (triangle)
            if dx >= 0 and dy >= -arrow_size // 2 and dy <= arrow_size // 2:
                if dx <= arrow_size - abs(dy) * 2:
                    return 255, 255, 255, 255
            
            # Cursor tail (rectangle)
            if dx >= -arrow_size // 2 and dx <= 0:
                if abs(dy) <= arrow_size // 4:
                    return 255, 255, 255, 255
    
    return bg_r, bg_g, bg_b, 255

def nox_logo_pixel(x, y, w, h):
    """NOX logo - simpler version"""
    bg_r, bg_g, bg_b = 15, 15, 20
    fg_r, fg_g, fg_b = 255, 255, 255
    
    # Draw cursor bar (vertical line)
    bar_x = w // 4
    bar_w = max(2, w // 16)
    bar_y = h // 4
    bar_h = h // 2
    
    if bar_x <= x < bar_x + bar_w and bar_y <= y < bar_y + bar_h:
        return fg_r, fg_g, fg_b, 255
    
    # Draw "NOX" text as blocks
    # N
    n_x = w // 3
    n_w = w // 6
    n_h = h // 4
    n_y = h // 2 - n_h // 2
    
    for yy in range(n_y, n_y + n_h):
        for xx in range(n_x, n_x + n_w):
            if xx < n_x + n_w // 4 or xx > n_x + n_w * 3 // 4:
                if yy >= n_y and yy < n_y + n_h:
                    return fg_r, fg_g, fg_b, 255
            # Diagonal
            if yy - n_y == xx - n_x:
                return fg_r, fg_g, fg_b, 255
    
    # O
    o_x = n_x + n_w + w // 10
    o_w = w // 6
    o_h = h // 4
    o_y = h // 2 - o_h // 2
    
    for yy in range(o_y, o_y + o_h):
        for xx in range(o_x, o_x + o_w):
            margin = o_w // 5
            if xx < o_x + margin or xx > o_x + o_w - margin or \
               yy < o_y + margin or yy > o_y + o_h - margin:
                return fg_r, fg_g, fg_b, 255
    
    # X
    x_x = o_x + o_w + w // 10
    x_w = w // 6
    x_h = h // 4
    x_y = h // 2 - x_h // 2
    
    for yy in range(x_y, x_y + x_h):
        for xx in range(x_x, x_x + x_w):
            if abs((xx - x_x) - (yy - x_y)) < x_w // 4 or \
               abs((xx - x_x) - (x_y + x_h - yy)) < x_w // 4:
                return fg_r, fg_g, fg_b, 255
    
    return bg_r, bg_g, bg_b, 255

out_dir = "src-tauri/icons"
sizes = [16, 32, 48, 64, 128, 256]

for s in sizes:
    png = make_png(s, s, nox_logo_pixel)
    with open(f"{out_dir}/{s}x{s}.png", "wb") as f:
        f.write(png)
    print(f"Created {s}x{s}.png ({len(png)} bytes)")

png = make_png(256, 256, nox_logo_pixel)
with open(f"{out_dir}/icon.png", "wb") as f:
    f.write(png)
print(f"Created icon.png ({len(png)} bytes)")

print("Done!")
