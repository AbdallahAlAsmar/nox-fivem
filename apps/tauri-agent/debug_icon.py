import struct

# Read the original ICO file
ico_path = 'src-tauri/icons/128x128@2x.png'
with open(ico_path, 'rb') as f:
    data = f.read()

print(f"File size: {len(data)} bytes")
print(f"Magic: {data[:4].hex()}")

# Parse ICO header
type, count = struct.unpack('<HH', data[:4])
print(f"Type: {type}, Count: {count}")

# Parse directory entries (16 bytes each)
entries = []
for i in range(count):
    offset = 6 + i * 16
    entry = data[offset:offset+16]
    # Icon directory entry: width(1) height(1) colors(1) reserved(1) 
    # palette(1) reserved(1) xcenter(1) ycenter(1) clut(2) size(4) offset(4)
    w = entry[0]
    h = entry[1]
    actual_w = w if w != 0 else 256
    actual_h = h if h != 0 else 256
    size = struct.unpack('<I', entry[12:16])[0]
    off = struct.unpack('<I', entry[16:20])[0] if len(entry) > 16 else 0
    # Actually the entry is only 16 bytes, let me re-parse
    pass

# Let me just read the entries properly
print("\nDirectory entries:")
for i in range(count):
    offset = 6 + i * 16
    entry = data[offset:offset+16]
    w = entry[0]
    h = entry[1]
    actual_w = w if w != 0 else 256
    actual_h = h if h != 0 else 256
    size = struct.unpack('<I', entry[12:16])[0]
    # offset is at bytes 12-15 in the entry... wait let me check the format again
    
# Actually the format is:
# bytes 0-1: width (1 byte)
# bytes 2-3: height (1 byte)  
# bytes 4-5: color palette (1 byte)
# byte 6: reserved (1 byte)
# bytes 7-8: color planes (2 bytes)
# bytes 9-10: bits per pixel (2 bytes)
# bytes 11-14: image size (4 bytes)
# bytes 15-18: offset to image data (4 bytes)

# So the entry is 16 bytes but I need 20 bytes total for the full info
# Let me read more data
for i in range(count):
    start = 6 + i * 16
    entry = data[start:start+20]
    if len(entry) < 16:
        break
    w = entry[0]
    h = entry[1]
    actual_w = w if w != 0 else 256
    actual_h = h if h != 0 else 256
    size = struct.unpack('<I', entry[12:16])[0]
    offset = struct.unpack('<I', entry[16:20])[0] if len(entry) >= 20 else 0
    print(f"  Image {i}: {actual_w}x{actual_h}, size={size}, offset={offset}")
    
    # Extract the PNG
    if offset > 0 and offset + size <= len(data):
        img_data = data[offset:offset+size]
        if img_data[:8] == b'\x89PNG\r\n\x1a\n':
            filename = f"src-tauri/icons/{actual_w}x{actual_h}.png"
            with open(filename, 'wb') as f:
                f.write(img_data)
            print(f"    -> Saved {filename} ({len(img_data)} bytes)")
        else:
            print(f"    -> Not a PNG (magic: {img_data[:8].hex()})")
