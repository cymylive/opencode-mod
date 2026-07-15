from PIL import Image
import struct, io, os

# Source icon
src_path = r'I:\opencode-tui-mod-skill_opencode_魔改源代码插件\PYTHON.ico'
src = Image.open(src_path)
print(f'Source: {src.size}, mode={src.mode}')

# Convert to RGBA
if src.mode != 'RGBA':
    src = src.convert('RGBA')

# Required Windows icon sizes
sizes = [16, 32, 48, 64, 128, 256]

# Build ICO manually with BMP-format entries
buf = io.BytesIO()
offset = 6 + len(sizes) * 16  # header + directory

# Write header
buf.write(struct.pack('<HHH', 0, 1, len(sizes)))  # reserved, type=icon, count

entries = []
for s in sizes:
    img = src.resize((s, s), Image.LANCZOS)
    
    # Write BMP data: BITMAPINFOHEADER + BGRA pixels + AND mask
    # ICO BMP format: header (40 bytes) + XOR mask (BGRA pixels) + AND mask (1-bit transparency)
    hdr = struct.pack('<IiiHHIIiiII',
        40,          # biSize
        s,           # biWidth
        s * 2,       # biHeight (doubled for ICO: XOR + AND)
        1,           # biPlanes
        32,          # biBitCount
        0,           # biCompression
        0,           # biSizeImage
        0, 0, 0, 0   # biXPelsPerMeter, biYPelsPerMeter, biClrUsed, biClrImportant
    )
    
    # Get pixels in BGRA order (bottom-up for BMP)
    pixels = list(img.getdata())
    # BMP expects bottom-up rows
    bgra = bytearray()
    for y in range(s-1, -1, -1):
        for x in range(s):
            r, g, b, a = pixels[y * s + x]
            bgra.extend([b, g, r, a])  # BGRA
    
    # AND mask (1 = transparent, 0 = opaque) - for 32bpp this is unused but must be present
    and_mask = b'\x00' * ((s + 31) // 32 * 4 * s)
    
    entry_data = hdr + bytes(bgra) + and_mask
    
    # Directory entry
    w = 0 if s >= 256 else s
    h = 0 if s >= 256 else s
    
    buf.write(struct.pack('<BBBBHHII',
        w, h,           # width, height (0=256)
        0,              # colors
        0,              # reserved
        1,              # planes
        32,             # bits per pixel
        len(entry_data),# size of image data
        offset          # offset in file
    ))
    
    entries.append(entry_data)
    offset += len(entry_data)

# Write image data
for entry_data in entries:
    buf.write(entry_data)

# Save
out_path = r'C:\Users\Cymylive\Desktop\opencode-1.17.13\packages\opencode\app.ico'
with open(out_path, 'wb') as f:
    f.write(buf.getvalue())

print(f'Created: {os.path.getsize(out_path)} bytes')
print('Sizes:', sizes)
