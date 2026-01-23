from PIL import Image, ImageDraw
import os

# Create icons directory if it doesn't exist
icons_dir = "/app/browser_extension/icons"
os.makedirs(icons_dir, exist_ok=True)

# Define sizes
sizes = [16, 48, 128]

# Colors
bg_color = (102, 126, 234)  # #667eea
white = (255, 255, 255)

for size in sizes:
    # Create image
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw shield shape (simplified)
    padding = size // 10
    
    # Shield background
    points = [
        (size // 2, padding),  # top center
        (size - padding, padding + size // 4),  # top right
        (size - padding, size // 2),  # right
        (size // 2, size - padding),  # bottom center
        (padding, size // 2),  # left
        (padding, padding + size // 4),  # top left
    ]
    draw.polygon(points, fill=bg_color)
    
    # Checkmark
    if size >= 48:
        check_width = max(2, size // 16)
        # Checkmark path
        check_points = [
            (size // 3, size // 2),
            (size // 2 - padding // 2, size * 2 // 3),
            (size * 2 // 3, size // 3)
        ]
        for i in range(len(check_points) - 1):
            draw.line([check_points[i], check_points[i + 1]], fill=white, width=check_width)
    
    # Save
    img.save(f"{icons_dir}/icon{size}.png")
    print(f"Created icon{size}.png")

print("Icons generated successfully!")
