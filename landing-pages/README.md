# landing pages

Desktop landing page concepts. Each hero plays one short animation (under 6 seconds) and ends on a small interaction. The videos are 1920×1080 at 60 fps with sound.

| Folder | Business | What happens |
| --- | --- | --- |
| [couchette-split-flap](couchette-split-flap/) | night train company | the headline is a split-flap departure board. Hover a route and the cities flip, book a cabin and the board flips to your berth |
| [two-coats-paint-fan](two-coats-paint-fan/) | paint shop | a colour fan deck opens, the picked swatch grows into the whole page and its label becomes the heading |
| [overprint-riso-press](overprint-riso-press/) | risograph print studio | the page prints itself in yellow, pink and blue. Drag the registration slider and the inks drift apart, but never closer than 2 px |
| [slow-burn-match-light](slow-burn-match-light/) | candle maker | the page opens dark, the camera pushes in on the matchbox and the cursor strikes a match in close-up, then pulls back as the candle catches and its light slowly fills the page. After the intro the flame leans away from the cursor, and a click blows it out |
| [pace-topo-route](pace-topo-route/) | running app | contour lines rise and a half-marathon route draws over them with live stats, then the cursor scrubs the elevation profile back to the hardest climb. After the intro you scrub the run yourself |
| [lowtide-lineup-eq](lowtide-lineup-eq/) | music festival | the cursor presses play and the variable-font line-up pumps to the track, swells under the cursor, hits a drop on bar three, and a weekend pass goes into the bag. After the intro play starts the same loop live |
| [casa-sal-time-of-day](casa-sal-time-of-day/) | boutique hotel | green shutters swing open on a pre-dawn sea, the day runs past in the arched window with the clock ticking each hour, then the cursor pulls the sun into the sea and checks rooms. After the intro the hour follows the cursor across the window |
| [dew-droplet-lens](dew-droplet-lens/) | skincare | a drop swells on the pipette, falls on the label and becomes the cursor, a water lens that magnifies the headline and the fine print, leaves a drop that slowly dries and adds the serum to the bag. After the intro the drop follows the real cursor |
| [penny-round-up-jar](penny-round-up-jar/) | savings app | spare change from each purchase flies into a glass jar, then the cursor switches round-ups to €10: the cents pop out and euro coins pour in. After the intro the €1 / €5 / €10 switch refills the jar |
| [second-crack-roast-curve](second-crack-roast-curve/) | coffee roastery | the roast curve draws itself over the drum's rumble, the bean darkens and jumps at first crack, the cursor drags the drop point into a dark roast and adds it to the cart. After the intro you drag the curve yourself |
| [halde-exploded-axo](halde-exploded-axo/) | architecture studio | redesigned with Hallmark (Ink theme): a full-viewport page in Inter Tight and Geist, the building drafted in thin black line floor by floor, the cursor walks three floors and the levels above lift to show each plan, then opens the school and the pavilion from the work list. Hover a project to see its drawing, click to keep it. Earlier versions are kept in `.hallmark/` |

Each page is a fixed 1440×810 stage that scales to the window. Open `index.html` through any local server. Add `?rec` to the URL to get a still page that exposes `window.__render(t)` for frame-by-frame recording and `window.__renderAudio()` for the sound track.

## pairs

A/B posts: two landings in one 4:5 video (1080×1350). A plays with its sound while B waits dimmed, then B plays. Both tracks are normalized to -18 LUFS so neither wins on loudness.

| Folder | A | B |
| --- | --- | --- |
| [01-pace-vs-lowtide](pairs/01-pace-vs-lowtide/) | pace-topo-route | lowtide-lineup-eq |
| [02-casa-sal-vs-dew](pairs/02-casa-sal-vs-dew/) | casa-sal-time-of-day | dew-droplet-lens |
| [03-penny-vs-second-crack](pairs/03-penny-vs-second-crack/) | penny-round-up-jar | second-crack-roast-curve |

To build one: `node tools/rec16.cjs "http://localhost:5251/landing-pages/<page>/?rec" <frames-dir>` writes 1920×1080 frames and `audio.wav`, `node tools/ab-overlay.cjs <dir> "A name" "A desc" "B name" "B desc"` draws the labels, and `bash tools/ab-pair.sh A-16x9.mp4 B-cover.jpg B-16x9.mp4 <dir> ab-4x5.mp4` puts it together. The scripts need `puppeteer-core` and Brave.

## drafts

Eight rougher hero concepts on common themes, to pick from before turning one into a full page. Open [drafts/](drafts/) for a gallery with covers. No sound or `?rec` mode yet, except Lowtide, which plays a synth loop when you press play.

| Folder | Theme | What happens |
| --- | --- | --- |
| [penny-round-up-jar](drafts/penny-round-up-jar/) | savings app | spare change from each purchase flies into a jar, the €1 / €5 / €10 switch refills it |
| [margin-tighten-text](drafts/margin-tighten-text/) | AI writing tool | click a sentence and the filler is struck out and folds away |
| [second-crack-roast-curve](drafts/second-crack-roast-curve/) | coffee roastery | drag along the roast curve, and the bean, origin and tasting notes change |
| [halde-exploded-axo](drafts/halde-exploded-axo/) | architecture studio | the building drops in floor by floor, hover a floor to lift the ones above |
| [pace-topo-route](drafts/pace-topo-route/) | running app | a route draws over contour lines, scrub the elevation profile to replay the run |
| [casa-sal-time-of-day](drafts/casa-sal-time-of-day/) | hotel | move across the arched window to run the sea view from dawn to night |
| [lowtide-lineup-eq](drafts/lowtide-lineup-eq/) | music festival | variable-font line-up swells near the cursor and pumps to the preview track |
| [dew-droplet-lens](drafts/dew-droplet-lens/) | skincare | a drop from the pipette becomes a water lens cursor, clicks leave drops that dry |
