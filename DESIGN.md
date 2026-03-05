# Design Guidelines — Kitty Tinder

**One-line direction:** A cosy cat café that has an app. Warm, tactile, characterful — not another white-card-on-gray SaaS.

The user is checking this between shifts, cat-obsessed, wanting to feel a flutter of excitement when a great listing appears. The design should match that energy: opinionated, warm, a little bit playful. It should feel nothing like Gumtree or Pets4Homes.

---

## Palette

All grays replaced with warm, earthy equivalents. Nothing is pure black or pure white.

| Token | Hex | Usage |
|---|---|---|
| `cream` | `#FDF6EE` | App background (replaces zinc-50) |
| `card` | `#FFFBF5` | Card surface |
| `ink` | `#2D1B12` | Primary text (warm near-black) |
| `bark` | `#9B7A6E` | Secondary text, labels |
| `dust` | `#C4A89C` | Muted text, timestamps |
| `rose` | `#E85D75` | Like button, primary accent, score fill high |
| `tangerine` | `#F4A261` | New badge, score fill low, CTA highlight |
| `blush` | `#FDE8ED` | Like button hover bg, liked page tint |
| `fog` | `#EDE8E3` | Score bar track, dividers |
| `dismiss` | `#8C8C8C` | Dismiss button icon |

Score bars use a gradient fill from `tangerine` → `rose` based on the score value (low scores are warm orange, high scores are warm rose). Never use blue, never use cold gray for anything interactive.

---

## Typography

Replace Geist entirely. Two fonts, loaded from Google Fonts:

### Display: Fraunces
Variable old-style serif. Used for cat names and the app wordmark. It has warmth, quirkiness, and character that no sans-serif can match. Feels like a wine bar blackboard, or a cat café menu — not a tech product.

- Cat name on card: `Fraunces 600, 22px`
- App wordmark "Kitty Tinder": `Fraunces 700, 22px`
- Detail modal cat name: `Fraunces 700, 28px`

### Body: Nunito
Rounded terminals, warm and friendly. Highly readable at small sizes on phones.

- Body copy: `Nunito 400, 14px`
- Labels / metadata: `Nunito 400, 13px`
- Scores label: `Nunito 600, 12px`
- Buttons: `Nunito 700, 15px`

**Never use:** system-ui, Inter, or Geist for visible text. They're fine for dev tools; they're wrong here.

---

## Backgrounds & Surfaces

**App background:** `#FDF6EE` (cream) everywhere — main screen, liked page, modal backdrop tint.

**Card surface:** `#FFFBF5`. Very slightly warmer than cream so cards lift visually without needing a harsh shadow.

**Card shadow:** Warm-tinted, not gray.
```css
box-shadow: 0 8px 32px rgba(100, 40, 20, 0.10), 0 2px 8px rgba(100, 40, 20, 0.06);
```

**Card radius:** `28px` (bump up from current 16px). More rounded = friendlier, more native-app-feeling.

**No borders.** Separation is done with shadow and background contrast only.

---

## Card Design

```
┌──────────────────────────────┐  radius: 28px
│  [Photo — 58% of card height]│  object-cover, no border
│                              │
│  Cocoa  ·  3 years  ·  ♀    │  Fraunces 600 for name
│  📍 Edinburgh                │  Nunito, bark colour
│                              │
│  🏠  Alone OK   ━━━━━━━━░░  │  gradient fill, fog track
│  😸  Friendly   ━━━━━━━━━░  │
│  ✨  Vibe       ━━━━━━━━░░  │
│  ⭐  Overall    ━━━━━━━━░░  │
│                              │
│  Pets4Homes · 4h ago         │  dust colour, 11px
└──────────────────────────────┘
```

**Swipe tilt overlays:** As the card is dragged, a colour wash appears over the photo area.
- Dragging right → warm rose tint + "💛 Love her!" text (Fraunces, white, large)
- Dragging left → cool fog tint + "Not this time →" text (Nunito, muted, medium)

These are the most fun moment in the whole interaction — make them feel good.

---

## Score Bars

Current implementation is fine functionally. Visual upgrade:

- Track: `#EDE8E3` (fog) instead of zinc-200
- Fill: CSS gradient — `from-[#F4A261] to-[#E85D75]`, clipped to the fill width
- Height: `6px` (slightly thinner than current 8px — more refined)
- Label text: Nunito 600, `bark` colour (`#9B7A6E`)
- Score number: remove it. The bar IS the score. The number adds noise on a small phone screen.

---

## Action Buttons (Dismiss / Like)

**Size:** `72px` circles (up from current 64px). Generous tap target.

**Dismiss (✕):**
- Background: white
- Icon: `#8C8C8C`, 24px
- Shadow: `0 4px 16px rgba(0,0,0,0.08)`
- Press: scale(0.92) + shadow reduces

**Like (♥):**
- Background: `#E85D75` (rose)
- Icon: white heart, 24px
- Shadow: `0 4px 20px rgba(232, 93, 117, 0.40)` — coloured glow, not gray shadow
- Press: scale(0.92) + glow intensifies briefly

**Gap between buttons:** `40px`. They should feel balanced, not like afterthoughts.

---

## Header

Current: just text. Replace with a wordmark lockup.

```
🐾  Kitty Tinder                    ♥ [3]
```

- `🐾` is part of the wordmark, not decoration
- "Kitty Tinder" in Fraunces 700
- Heart badge in rose with white count
- Background: `cream` (same as page — no card, no border, no shadow on header)

---

## Empty State ("You're all caught up")

This moment should feel delightful, not like a dead end.

```
      🐾

  You're all caught up!
  New cats drop every 4 hours.
  Go touch grass.
```

- Big emoji (80px)
- Fraunces for "You're all caught up!"
- Nunito for the subtext — use a bit of wit (she'll read this repeatedly)
- Rotate through 2–3 subtext variants to keep it fresh

---

## Liked Page

Thumbnail list of saved cats. Give it a slightly different feel from the main screen — this is her shortlist.

- Background: `#FFF8F5` (a touch of blush — subtly different from main cream)
- Header: "Saved Cats ♥" in Fraunces
- Each row: card-on-cream, warm shadow, cat thumbnail with 12px radius
- "View listing" CTA: rose, pill-shaped, Nunito 700

---

## Motion & Interaction

**Swipe physics:** Let the existing library handle this. Don't fight it.

**Button press:** `transition: transform 80ms, box-shadow 80ms` — fast, snappy, feels physical.

**Card entrance:** New card slides up very slightly (8px, 200ms ease-out) when the previous one is dismissed. Subtle. Not a full animation.

**Score bars:** Fill animates in on card mount — `transition: width 400ms ease-out` with a 100ms delay. Makes the card feel alive when it appears.

---

## What to Avoid

- **Cold grays** (`zinc-*`, `gray-*`, `slate-*`) — everything warm, always
- **Blue of any kind** — wrong vibe entirely
- **Sharp corners** — 0px radius on nothing interactive
- **Helvetica/system fonts for display** — Fraunces or nothing
- **The word "AI"** — scores are just facts about the cat
- **Lots of white space** — the card stack fills the screen, we want immersive not spacious
- **Professional/corporate tone** in microcopy — this app has a personality

---

## Tailwind Implementation Notes

Add custom tokens to `globals.css` under `@theme`:

```css
@theme inline {
  --font-display: var(--font-fraunces);
  --font-sans: var(--font-nunito);
  --color-cream: #FDF6EE;
  --color-card: #FFFBF5;
  --color-ink: #2D1B12;
  --color-bark: #9B7A6E;
  --color-dust: #C4A89C;
  --color-rose: #E85D75;
  --color-tangerine: #F4A261;
  --color-blush: #FDE8ED;
  --color-fog: #EDE8E3;
}
```

Load both fonts in `layout.tsx` via `next/font/google`. Fraunces needs `variable: '--font-fraunces'`, Nunito needs `variable: '--font-nunito'`, both applied to `<body>`.

Use `font-display` utility class for Fraunces, `font-sans` for Nunito.
