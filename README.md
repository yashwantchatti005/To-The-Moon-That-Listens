# To the Moon That Listens — Book Landing Page

A single-page, cinematic landing page for *To the Moon That Listens*, a debut poetry
collection by **Vijaya Suriya**. Built as one self-contained HTML file — no build step,
no dependencies, no framework.

## Live structure

The page is one long scroll, built as a sequence of full-width sections:

| # | Section | id | What it does |
|---|---------|----|----|
| — | Header / Nav | `#home` | Sticky nav, blurs in on scroll, mobile hamburger menu |
| — | Hero | `#home` | Title, tagline, moon + book cover art, CTA buttons |
| 01 | The Book | `#book` | Blurb about the collection |
| — | Reading Invitation | — | Short atmospheric interstitial |
| 02 | Excerpts | `#excerpts` | 5 poem excerpts in a grid |
| 03 | Themes | `#themes` | 6 recurring themes in the book |
| 04 | Author | `#author` | Bio + Instagram link |
| — | Cinematic Interlude | — | Full-screen moment with floating parallax words |
| 05 | Buy the Book | `#buy` | Price, Amazon link, Notion Press link (placeholder) |
| — | Closing | — | Final cinematic sign-off |
| — | Footer | — | Copyright, section links, site-credit link |

## Files

```
to-the-moon-that-listens.html   ← the entire site (HTML + CSS + JS in one file)
front-cover.jpg                 ← book cover image (you must add this yourself)
```

There's no `<link>` to an external stylesheet or script — everything is inlined so the
file can be opened directly or dropped into any static host as-is.

## Before you publish

1. **Add the cover image.** Place a file named `front-cover.jpg` in the same folder as
   the HTML file. If it's missing, the page still works — the `<img>` `error` handler
   swaps in a plain gradient block instead of a broken image icon.
2. **Add the real Notion Press link.** Search the file for `data-notion` — right now
   that button intercepts the click and shows an `alert()` reminding you to add the
   real purchase URL. Replace the `href="#"` with the actual link and delete the
   `data-notion` attribute + its related `<script>` block once it's wired up.
3. **Check the Amazon link** (`https://amzn.in/d/0eejUFqa`) still resolves to the right
   listing.
4. **Update the year / publisher line** in the footer if needed (`© 2026 Vijaya Suriya
   · Published by Notion Press`).

## Motion & interaction notes

- `scroll-behavior: smooth` plus a custom eased `smoothScrollTo()` handle every
  in-page anchor link (nav, hero buttons, footer links) with a consistent
  ease-in-out curve, offset for the sticky header.
- A single `requestAnimationFrame` loop (`motionLoop`) drives the header
  background-on-scroll, the top reading-progress bar, and the floating-word
  parallax in the interlude section — all smoothed with simple lerp easing so
  they glide rather than jump on scroll-event ticks.
- Scroll-triggered fade/slide-ups use `IntersectionObserver` (class `.reveal`).
- Buttons have a magnetic cursor-follow effect on pointer-fine devices (desktop).
- Everything respects `prefers-reduced-motion: reduce` — animations and easing
  are disabled and content simply appears in place.

## Browser support

Plain HTML/CSS/JS — no build tools, no polyfills needed. Works in all current
evergreen browsers (Chrome, Safari, Firefox, Edge). Uses `backdrop-filter`,
`aspect-ratio`, and `100svh`, so very old browsers will see a slightly less
polished (but still functional) layout.

## Deploying

Since it's one static HTML file, you can host it anywhere:
- Drop it into a GitHub Pages repo (rename to `index.html`)
- Upload to Netlify / Vercel as a static site
- Attach it directly wherever Notion Press or a personal site allows a custom page

## Credit

Site built by **Yaswanth Chatti** — [portfolio](https://yashwantchatti005.github.io/Portfolio/)
