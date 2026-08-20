import struct, zlib

def make_png(size, r, g, b, a=255):
    def chunk(ctype, data):
        c = ctype + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    raw = b""
    for y in range(size):
        raw += b"\x00"
        for x in range(size):
            raw += struct.pack("BBBB", r, g, b, a)
    idat = zlib.compress(raw)
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", ihdr)
    png += chunk(b"IDAT", idat)
    png += chunk(b"IEND", b"")
    return png

def create_nox_icon(size):
    BG = (15, 15, 20)
    FG = (255, 255, 255)
    pixels = []
    for y in range(size):
        for x in range(size):
            r, g, b = BG
            cw = max(3, size // 20)
            cx = size // 4
            cy = size // 3
            ch = size // 3
            if cx <= x < cx + cw and cy <= y < cy + ch:
                r, g, b = FG
            tx = cx + cw + size // 10
            ty = size // 2 - size // 8
            tw = size // 2
            th = size // 6
            if tx <= x < tx + tw and ty <= y < ty + th:
                r, g, b = FG
            pixels.extend([r, g, b, 255])
    return pixels

out_dir = "src-tauri/icons"
sizes = [16, 32, 48, 64, 128, 256]

for s in sizes:
    png = make_png(s, *create_nox_icon(s)[:3])
    with open(f"{out_dir}/{s}x{s}.png", "wb") as f:
        f.write(png)
    print(f"Created {s}x{s}.png")

# icon.png = 256x256
png = make_png(256, *create_nox_icon(256)[:3])
with open(f"{out_dir}/icon.png", "wb") as f:
    f.write(png)
print("Created icon.png")

# Remove broken ICO
import os
ico_path = f"{out_dir}/icon.ico"
if os.path.exists(ico_path):
    os.remove(ico_path)
    print("Removed icon.ico")

print("Done!")
