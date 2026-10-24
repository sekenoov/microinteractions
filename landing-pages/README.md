# landing pages

Desktop landing page concepts. Each hero plays one short animation (under 6 seconds) and ends on a small interaction. The videos are 1920×1080 at 60 fps with sound.

| Folder | Business | What happens |
| --- | --- | --- |
| [couchette-split-flap](couchette-split-flap/) | night train company | the headline is a split-flap departure board. Hover a route and the cities flip, book a cabin and the board flips to your berth |
| [two-coats-paint-fan](two-coats-paint-fan/) | paint shop | a colour fan deck opens, the picked swatch grows into the whole page and its label becomes the heading |
| [overprint-riso-press](overprint-riso-press/) | risograph print studio | the page prints itself in yellow, pink and blue. Drag the registration slider and the inks drift apart, but never closer than 2 px |
| [slow-burn-match-light](slow-burn-match-light/) | candle maker | the page opens dark, the camera pushes in on the matchbox and the cursor strikes a match in close-up, then pulls back as the candle catches and its light slowly fills the page. After the intro the flame leans away from the cursor, and a click blows it out |

Each page is a fixed 1440×810 stage that scales to the window. Open `index.html` through any local server. Add `?rec` to the URL to get a still page that exposes `window.__render(t)` for frame-by-frame recording and `window.__renderAudio()` for the sound track.
