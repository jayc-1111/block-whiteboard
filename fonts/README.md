# Adding Your Custom Font

## Quick Setup

1. **Place your font files here** in the `/fonts` folder:
   - Recommended formats: `.woff2`, `.woff`, `.ttf` (in order of preference)
   - Example: `MyFont.woff2`, `MyFont.woff`, `MyFont.ttf`

2. **Update the CSS** in `/css/base/custom-fonts.css`:
   - Replace `YourFontName` with your actual font name
   - Update the file paths to match your font files

3. **Toggle in Settings**:
   - Click Settings menu → Custom Font → Toggle ON/OFF

## Example Setup

If your font is called "Zenban" with files `Zenban-Regular.ttf` and `Zenban-Bold.ttf`:

```css
@font-face {
    font-family: 'Zenban';
    src: url('../../fonts/Zenban-Regular.ttf') format('truetype');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
}

@font-face {
    font-family: 'Zenban';
    src: url('../../fonts/Zenban-Bold.ttf') format('truetype');
    font-weight: 700;
    font-style: normal;
    font-display: swap;
}
```

Then update the CSS classes to use 'Zenban' instead of 'YourFontName'.

## Font Formats

- **WOFF2**: Best compression, modern browsers (recommended)
- **WOFF**: Good compression, wide support
- **TTF/OTF**: Original formats, largest files but universal support

## Tips

- Test your font in different browsers
- Include fallback fonts: `font-family: 'YourFont', 'Inter', sans-serif;`
- Use `font-display: swap` for better loading performance
- Keep font files under 1MB each for optimal performance
