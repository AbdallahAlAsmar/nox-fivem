# NOXES brand guide

Version 1.0 · 13 October 2026

## Brand idea

NOXES is an independent software studio for people building and caring for digital worlds. It is the umbrella identity for today's products and future projects. The first flagship is NOXES for FiveM.

**Tagline:** Build what comes next.

**Positioning:** Thoughtful software for people shaping their own digital worlds.

**Promise:** NOXES makes complicated work clearer and keeps people in control of the decisions that matter.

## Personality and voice

- **Clear:** use plain language and name the result.
- **Capable:** explain what a product does without inflated claims.
- **Human:** respect the people who make and run communities.
- **Forward-looking:** be curious and ambitious, without pretending future work already exists.

Prefer: “Review the change before it reaches your server.”

Avoid: “Revolutionary AI that does everything for you.”

## Visual identity

The NOXES signal mark is an open cobalt frame surrounding a citrus N. The open frame signals room to make; the central path signals an idea moving from intention to action. Pair the mark with the wordmark for first contact. Use the mark alone only when space is limited or the audience already knows NOXES.

### Color palette

| Token | Hex | Use |
| --- | --- | --- |
| Midnight ink | `#101426` | Main dark canvas |
| Deep inset | `#0B1020` | Code, contrast panels and recessed surfaces |
| Indigo surface | `#1A2140` | Cards and product surfaces |
| Cobalt | `#5B72F2` | Primary brand color, links, active states and frames |
| Citrus | `#D8F36A` | Signature signal, highlights and key actions |
| Cloud | `#F4F5FB` | Light text and light-background wordmark |
| Slate | `#9298AD` | Secondary information |

Use cobalt and citrus together in small, deliberate areas. Keep long reading surfaces quiet. Preserve success, warning and error colors as functional status colors; do not use the brand palette to disguise status.

### Type

- **Display:** Space Grotesk, bold or semibold, tight tracking.
- **Body and interface:** Inter, regular or medium.
- **Technical labels:** IBM Plex Mono, restrained and short.

The SVG wordmark uses system-font fallbacks. Do not typeset the logo again in ordinary page text when the logo asset is available.

### Motion

The signal frame draws in; the citrus endpoint pulses once in a slow loop. Keep animation quiet and brief. Respect reduced-motion preferences. Never rely on motion to reveal essential copy.

## Logo files

SVG masters are in `apps/web/public/brand/`:

- `noxes-symbol.svg` — transparent primary mark.
- `noxes-logo.svg` — horizontal lockup for dark backgrounds.
- `noxes-logo-light.svg` — horizontal lockup for light backgrounds.
- `noxes-stacked.svg` — portrait lockup.
- `noxes-wordmark.svg` — wordmark for wide spaces.
- `noxes-avatar.svg` — square profile art.
- `noxes-mark-motion.svg` — animated vector mark; the web version falls back to still motion when reduced motion is requested.
- `noxes-logo.gif` — animated horizontal logo lockup with a transparent background.
- `noxes-avatar.gif` — animated square avatar for surfaces that support animated icons.
- `social/` — first-launch campaign compositions in common platform canvases.

Leave clear space around the lockup at least equal to the N's stroke width. Do not recolor the mark, distort it, add glow, place it on a busy image, or use the citrus wordmark version on white without choosing the light-background lockup.

## Platform canvases in this launch set

- Profile art: 512 × 512 SVG and PNG.
- Social square: 1080 × 1080 SVG and PNG.
- Social portrait: 1080 × 1350 SVG and PNG.
- Story / vertical cover: 1080 × 1920 SVG and PNG.
- X profile header: 1500 × 500 SVG and PNG.
- YouTube channel banner: 2560 × 1440 SVG and PNG, with its copy in the center safe region.
- Discord invite background: 1920 × 1080 SVG and PNG, deliberately background-only.
- Discord server banner: 960 × 540 PNG, background-only.

The SVGs are editable vector masters. PNG exports live beside them in `social/`, and Tauri's app icon sizes have also been regenerated. Animated artwork should use the GIF master when a surface supports GIF; X profile/header imagery is static. Discord recommends background-only art for its invite background and server banner.

Sizing references: [X profile images](https://help.x.com/articles/166743), [YouTube channel banners](https://support.google.com/youtube/answer/10456525), and [Discord invite backgrounds](https://support.discord.com/hc/en-us/articles/4415841146391-Server-Invite-Background).

## Product architecture

Keep NOXES as the stable parent identity. Describe each project as **NOXES for [audience/use]** or with a concise product name under the NOXES wordmark. Keep the website projects list data-driven so a future project is added by filling in real audience, purpose, and status details. Do not publish empty cards as if they were launched products.

## Implementation tokens

Web styles define the palette in `apps/web/app/globals.css`. Desktop application values are in `apps/tauri-agent/src/index.css` and `apps/tauri-agent/src/globals.css`. Update all three when the brand palette changes.
