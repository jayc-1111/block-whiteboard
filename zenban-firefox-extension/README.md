# Zenban Firefox Extension

Screenshot capture extension for Zenban whiteboard bookmarks.

## Setup Instructions

### 1. Download html2canvas
Download the minified version from: https://html2canvas.hertzen.com/
Save as `html2canvas.min.js` in this directory.

### 2. Create Icons
Create three PNG icons:
- `icon-16.png` (16x16 pixels)
- `icon-48.png` (48x48 pixels)  
- `icon-128.png` (128x128 pixels)

Or use the provided icon generator script below.

### 3. Load Extension in Firefox
1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" 
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from this directory

## Usage

### From Zenban App:
1. Click the bookmark button in Zenban
2. Enter a URL
3. Select a file
4. Extension automatically captures screenshot

### Manual Capture:
- Click extension icon in toolbar
- OR right-click page → "Capture for Zenban Bookmark"

## Icon Generator HTML

Save this as `icon-generator.html` and open in browser:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Zenban Icon Generator</title>
</head>
<body>
    <canvas id="canvas"></canvas>
    <script>
        const sizes = [16, 48, 128];
        
        sizes.forEach(size => {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            
            // Purple gradient background
            const gradient = ctx.createLinearGradient(0, 0, size, size);
            gradient.addColorStop(0, '#b794f6');
            gradient.addColorStop(1, '#9f7aea');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);
            
            // White camera icon
            ctx.fillStyle = 'white';
            ctx.font = `${size * 0.6}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('📷', size/2, size/2);
            
            // Download link
            const link = document.createElement('a');
            link.download = `icon-${size}.png`;
            link.href = canvas.toDataURL();
            link.textContent = `Download ${size}x${size}`;
            document.body.appendChild(link);
            document.body.appendChild(document.createElement('br'));
        });
    </script>
</body>
</html>
```

## Files Required
- ✅ manifest.json
- ✅ content-script.js
- ✅ background.js
- ❌ html2canvas.min.js (download from website)
- ❌ icon-16.png
- ❌ icon-48.png
- ❌ icon-128.png