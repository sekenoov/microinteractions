# Typography

The default type for landing pages in this repo.

| Role | Face | Setting |
| --- | --- | --- |
| Headers (h1 to h3, wordmark, display numbers) | Inter Tight | `letter-spacing: 0.005em` |
| Everything else (body, nav, captions, labels, buttons) | Geist | `line-height: 1.4` |

```html
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600;700&family=Geist:wght@400;500;600&display=swap" rel="stylesheet">
```

```css
:root { --font-display: "Inter Tight", ui-sans-serif, system-ui, sans-serif; --font-body: "Geist", ui-sans-serif, system-ui, sans-serif; }
h1, h2, h3 { font-family: var(--font-display); letter-spacing: 0.005em; }
body { font-family: var(--font-body); line-height: 1.4; }
```
