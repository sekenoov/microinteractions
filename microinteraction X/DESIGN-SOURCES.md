# Design sources and decisions

Direction: Swiss editorial. Neutral #F7F7F8 and #FFFFFF, one accent #002FA7, Helvetica Neue, hairline dividers, oversized left-aligned type. Studio chrome stays quiet; each scene has one primary movement and an explicit action. Rounded controls and restrained paper depth appear within the illustrative study components.

## Profile context

Read the public profile at https://x.com/sekenoov on 2026-09-28 using the browser. Visible recent posts included:

- https://x.com/sekenoov/status/2104219147056058788 — pinch an AI answer to shorten it.
- https://x.com/sekenoov/status/2103901182746128640 — compact the chat, keep facts.
- https://x.com/sekenoov/status/2103817021154906244 — punctuation after speaking.
- https://x.com/sekenoov/status/2102735050093781219 — X becomes a photo.

The video elements could not play in the inspected public view. The concepts respond to the visible post text; this is not a frame-by-frame visual audit or an analysis of private analytics. Captions remain short and in English. No reach prediction is claimed.

## Requested references

### MengTo / Skills — applied

- https://github.com/MengTo/Skills/blob/main/agent-skills/ui/design-first-ui-prompting/SKILL.md
- https://github.com/MengTo/Skills/blob/main/agent-skills/web-design/animation-systems/SKILL.md

Applied: define the frame and hierarchy first; one accent; one hero movement per scene; consistent spring settling; staged feedback; reduced-motion support. No site templates or original demo code were copied.

### nexu-io / open-design — applied

- https://github.com/nexu-io/open-design/blob/main/skills/emilkowalski-motion/SKILL.md

Applied after the layout existed: fast secondary feedback, state continuity, preference for transform/opacity, timer cleanup, no decorative infinite loops. The diagonal source reveal deliberately animates a clipped small card; it is the primary interaction.

### marvkr / better-design — partial reference, MCP workflow unavailable

- https://github.com/marvkr/better-design/blob/main/skills/better-design/SKILL.md
- https://github.com/marvkr/better-design/blob/main/components/minimal-light/lib/motion.ts

Read the skill and minimal-light motion implementation. The source uses stiff, damped springs; this informed the local settling baseline. The skill requires connected Better Design MCP tools for authoritative guidance and reviews. Those tools were not available, so no MCP design-system selection or MCP review was performed or claimed. The MCP workflow was not run. The app was built and checked locally using the other available references.

### Yuan1z0825 / nature-skills — reviewed, not applicable to UI

- https://github.com/Yuan1z0825/nature-skills/blob/main/skills/nature-figure/SKILL.md

The figure skill explicitly targets manuscript scientific figures and excludes interactive dashboards. This project has no scientific data or manuscript charts. Its plotting pipeline was not applied, and the project does not claim Nature validation.

## Local design skill

`/Users/sekenov/.codex/skills/frontend-design/SKILL.md`: Swiss direction, content discipline, restrained palette, deliberate typography. The visual scenes are bespoke concept illustrations within the studio.
