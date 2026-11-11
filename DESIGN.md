# Design Guidelines — Kitty Tinder

**One-line direction:** A cosy cat café that has an app, shot like a magazine cover. The cat's photo is the interface; everything else is warm, tactile and out of the way.

The user checks this between shifts and wants a flutter of excitement when a great listing appears. It should feel nothing like Gumtree or Pets4Homes.

## Principles

1. **The photo is the card.** Photos run edge to edge. Text sits on top over a dark-brown scrim, never in a separate white box.
2. **One number.** The overall match is a ring with a percentage. Every other score is a bar.
3. **Warm, always.** No cold greys, no blue, no pure black or white.
4. **Everything responds.** Dragging a card pulls the next one forward; saving a cat sends up hearts; buttons press in.

## Palette

| Token | Hex | Usage |
|---|---|---|
| `cream` | `#FDF6EE` | Base background |
| `card` | `#FFFBF5` | Surfaces: chips, panels, round buttons |
| `ink` | `#2D1B12` | Text, photo scrims, dark pills, primary link buttons |
| `bark` | `#9B7A6E` | Secondary text |
| `dust` | `#C4A89C` | Muted text, handles |
| `rose` | `#E85D75` | Accent, like |
| `tangerine` | `#F4A261` | Accent, undo |
| `blush` | `#FDE8ED` | Icon backgrounds |
| `fog` | `#EDE8E3` | Bar tracks |

- **Brand gradient** (`.brand-gradient`): tangerine → rose at 135°. Used for the logo mark, the like button, "new" pills and bar fills.
- **Wash** (`.wash`): the page background. Cream with soft blush and apricot glows in the corners.
- **Ambient tint:** on the deck, the top cat's photo is repeated behind everything, heavily blurred, so the whole screen takes on its colours.

## Typography

- **Display: Fraunces** (600–700). Cat names, headings, the wordmark, the match percentage, swipe stamps.
- **Body: Nunito** (400–800). Everything else. Labels and buttons are 700–800.
- Never system-ui, Inter or Geist for visible text.

## Surfaces on a photo

- **Scrim:** `ink` gradient from the bottom (90% → transparent over ~60% of the card) plus a shorter one from the top.
- **Glass** (`.glass`): translucent white with a blur and a hairline border. Used for the score panel.
- **Dark pill:** `ink` at 40–50% with a blur. Used for small labels that must stay readable on a pale photo.
- Text on a photo is white with a soft shadow (`.on-photo`).

## Card

```
┌────────────────────────────────┐  radius 32px, deep warm shadow
│ ▬▬▬▬ ▬▬▬▬ ▬▬▬▬   photo count   │
│ (Pets4Homes · 5h ago)   (93%)  │  dark pill, match ring
│                                │
│          full-bleed photo      │
│                                │
│ [NEW]                          │
│ Bella, blue bicolour ragdoll   │  Fraunces 28, white
│ 3 years · Female · ⌖ Edinburgh │
│ ┌────────────────────────────┐ │
│ │ Alone OK  ━━━━━━━━━━━━━░░  │ │  glass panel
│ │ Friendly  ━━━━━━━━━━━━━░░  │ │
│ │ Vibe      ━━━━━━━━━━━━━░░  │ │
│ └────────────────────────────┘ │
└────────────────────────────────┘
```

- Two more cards sit behind, smaller and dimmer. They scale up as the top card is dragged.
- **Swipe stamps:** dragging right washes the card in the brand gradient with a tilted outlined stamp, "Love her!" / "Love him!". Dragging left dims it with "Not this time".
- The card pivots from below its bottom edge, like a card held in the hand.

## Actions

- **Dismiss:** 68px, `card` background, grey cross.
- **Undo:** 48px, `card` background, tangerine arrow. Faded when there is nothing to undo.
- **Save:** 76px, brand gradient, white heart, rose glow.
- All press to 90% scale. Saving sends up a burst of hearts and a short vibration.

## Detail view

- Photo gallery at the top with story-style segment markers and a counter.
- Content is a sheet with a 32px top radius that overlaps the photo.
- Title beside a large light match ring; facts as chips; scores in one card under "How she fits", each with its reason; then the description and a dark "View original advert" button.
- The decision buttons stay pinned to the bottom on a frosted bar.

## Saved cats

- A two-column grid of photo tiles: match percentage top-left, a round link button top-right, name and details over the scrim.
- A cat that is no longer listed stays, in greyscale with a "No longer listed" pill.

## Microcopy

- Personality, because she will read it hundreds of times. The empty state rotates through a few lines.
- Never "AI", "algorithm", "model" or "generated".

## Motion

- Bars and the match ring draw in when a card appears.
- New top card rises into place (260ms). Sheets slide up (280ms). Tiles stagger in.
- Everything is disabled under `prefers-reduced-motion`.
