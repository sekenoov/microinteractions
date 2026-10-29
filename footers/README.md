# footers

Footer sections for real kinds of business: a plain, working footer (links, legal line, one main action) over one strong drawn image. Everything is drawn in code, no generated images. The videos are 1920×1080 at 60 fps, no sound.

| Folder | Business | What happens |
| --- | --- | --- |
| [tender-banknote-engraving](tender-banknote-engraving/) | business bank | the footer is the back of a banknote. The landscape is rendered once on the GPU, then engraved as burin strokes that follow the terrain, cross-hatched only in deep shade. The sun is the logo rosette, turning once every 120 s. Guilloche frame, a serial number that goes up on each load, and one sky line set in 4 px TENDER microtext that only a loupe under the cursor can read. On scroll the engraving cuts itself outward from the sun in 1.5 s |
| [halyard-container-tracking](halyard-container-tracking/) | ocean freight forwarder | a dusk sea in WebGL with a container ship on the horizon. The cursor types a container number into Track and a tag rises over the ship: at sea, ETA 14 Nov, Rotterdam |
| [joist-crane-delivery](joist-crane-delivery/) | building materials marketplace | a line drawing of a building site: a flatbed brings an orange steel beam, the tower crane lifts it, the load swings as the trolley runs, and the beam lands on top of the frame |

Each page is a fixed 1440×810 composition (Joist and Halyard fill the window, Tender scales as one stage). Open `index.html` through any local server. Add `?rec` to the URL to get a still page that exposes `window.__render(t)` for frame-by-frame recording.
