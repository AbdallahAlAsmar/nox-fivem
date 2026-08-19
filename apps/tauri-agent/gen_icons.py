import struct, zlib

def make_png(width, height, pixel_func):
    """Create PNG from a pixel function"""
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

def nox_pixel(x, y, w, h):
    """NOX logo pixel function"""
    # Background
    bg_r, bg_g, bg_b = 15, 15, 20
    
    # Cursor (vertical bar on left)
    cw = max(3, w // 20)
    cx = w // 4
    cy = h // 3
    ch = h // 3
    if cx <= x < cx + cw and cy <= y < cy + ch:
        return 255, 255, 255, 255
    
    # "NOX." text area
    tx = cx + cw + w // 10
    ty = h // 2 - h // 8
    tw = w // 2
    th = h // 6
    
    if tx <= x < tx + tw and ty <= y < ty + th:
        return 255, 255, 255, 255
    
    return bg_r, bg_g, bg_b, 255

# Generate
out_dir = "src-tauri/icons"
sizes = [16, 32, 48, 64, 128, 256]

for s in sizes:
    png = make_png(s, s, nox_pixel)
    with open(f"{out_dir}/{s}x{s}.png", "wb") as f:
        f.write(png)
    print(f"Created {s}x{s}.png ({len(png)} bytes)")

# icon.png
png = make_png(256, 256, nox_pixel)
with open(f"{out_dir}/icon.png", "wb") as f:
    f.write(png)
print(f"Created icon.png ({len(png)} bytes)")

print("Done!")
