import struct
import zlib
import io

def read_png_from_ico(ico_data, index=0):
    """Extract a PNG image from an ICO file"""
    # Parse ICO header
    if ico_data[:4] != b'\x00\x00\x01\x00':
        raise ValueError("Not an ICO file")
    
    count = struct.unpack('<H', ico_data[4:6])[0]
    
    # Read directory entries
    entries = []
    for i in range(count):
        offset = 6 + i * 16
        entry = ico_data[offset:offset+16]
        w, h, clr, res, planes, bpp, size, off = struct.unpack('BBBBBBBBHHII', entry)
        entries.append({
            'width': w if w != 0 else 256,
            'height': h if h != 0 else 256,
            'offset': off,
            'size': size,
            'bpp': bpp
        })
    
    # Extract the requested image
    img_entry = entries[index]
    img_data = ico_data[img_entry['offset']:img_entry['offset'] + img_entry['size']]
    
    # ICO data is PNG format, just return it
    return img_data

def create_nox_svg(size):
    """Create NOX logo SVG for given size"""
    # Scale factors
    cursor_w = max(4, size // 25)
    cursor_x = size // 4
    cursor_y = size // 3
    cursor_h = size // 3
    
    # Text positioning
    text_y = int(size * 0.65)
    font_size = int(size * 0.2)
    
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0F0F14"/>
  <rect x="{cursor_x}" y="{cursor_y}" width="{cursor_w}" height="{cursor_h}" fill="#FFFFFF"/>
  <text x="256" y="{text_y}" font-family="monospace" font-size="{font_size}" font-weight="bold" fill="#FFFFFF" text-anchor="middle" letter-spacing="8">NOX<tspan font-weight="normal" font-size="{int(font_size*0.8)}">.</tspan></text>
</svg>'''

def simple_png_from_svg(svg_data, size):
    """Create a simple PNG from SVG data using basic rendering"""
    # This is a fallback - we'll just create solid color icons
    # The real icons should be generated externally
    return None

# Extract from original ICO
ico_path = 'src-tauri/icons/128x128@2x.png'
with open(ico_path, 'rb') as f:
    ico_data = f.read()

# Extract all images from ICO
entries = []
count = struct.unpack('<H', ico_data[4:6])[0]
for i in range(count):
    offset = 6 + i * 16
    entry = ico_data[offset:offset+16]
    w, h, clr, res, planes, bpp, size, off = struct.unpack('BBBBBBBBHHII', entry)
    entries.append({
        'width': w if w != 0 else 256,
        'height': h if h != 0 else 256,
        'offset': off,
        'size': size,
        'bpp': bpp
    })

print(f"Found {count} images in ICO:")
for i, e in enumerate(entries):
    print(f"  {i}: {e['width']}x{e['height']} @ offset {e['offset']}, size {e['size']}")

# Extract each image and save as PNG
out_dir = 'src-tauri/icons'
for i, entry in enumerate(entries):
    img_data = ico_data[entry['offset']:entry['offset'] + entry['size']]
    # Check if it's PNG
    if img_data[:8] == b'\x89PNG\r\n\x1a\n':
        width = entry['width']
        filename = f"{width}x{width}.png" if width != 256 else "icon.png"
        with open(f'{out_dir}/{filename}', 'wb') as f:
            f.write(img_data)
        print(f"Extracted {filename} ({len(img_data)} bytes)")
    else:
        print(f"Image {i} is not PNG format (size: {entry['size']})")

print("Done!")
