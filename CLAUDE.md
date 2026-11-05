# Chez Nous (repo `chez-moi`): project guide

Static site to invite friends and family to stay at Thomas's flat (Saint-Joseph de Porterie, Nantes, next to a Natura 2000 wood). Two pages:
- `index.html`: hero, intro, photo gallery (with lightbox), "chez nous", "autour", availability calendar that sends to `reserver.html?in=&out=`.
- `reserver.html`: 3 steps (dates and people, expériences, confirmation). The confirmation opens a pre-filled email (`mailto:`), then shows "Dernière étape : envoyez le mail" with the recap and a Copy button.

**Front only, on purpose**: plain HTML / CSS / JS, no framework, no bundler, no npm, no backend, no third-party form service. Hosted on Vercel (`https://chez-moi-woad.vercel.app`), deploy on push to `main`. The GitHub repo is public.

**Not on Google, on purpose**: every page has `<meta name="robots" content="noindex, nofollow">`. No SEO work (no sitemap, no JSON-LD). The Open Graph tags stay: they only build the preview card when the link is shared on WhatsApp / SMS.

## Working rules
- Talk to Thomas in French. Commit messages in French, short, like the history ("Ajoute ...", "Retire ...", "Fix: ...").
- Push directly to `main`. No branches, no PRs.
- Stay vanilla and front-only. A dependency, a build step or a server needs Thomas's go.
- Real photos only. No stock images.
- No invented content: no fake reviews, figures or contacts.

## Files
- `calendar.js`: shared calendar (`window.ChezNous`): **blocked dates (`UNAVAILABLE_RANGES`) live here and only here**, date helpers, `mountCalendar(el, state, onChange)`.
- `script.js`: home page (calendar → reserver, mobile menu, mobile "Voir les dates" bar, lightbox).
- `reserver.js`: booking flow (packs in `PACKS`, people counter, recap, mailto + copy fallback).
- `styles.css`: the only stylesheet. Colours and fonts are tokens in `:root`.
- `images/`: `nom.jpg` original + `nom-640.webp` thumbnail, `og.jpg` share preview. See `images/README.md`.

## Common tasks
- **Block dates**: edit `UNAVAILABLE_RANGES` in `calendar.js` (ISO dates, inclusive).
- **Add a photo**: follow `images/README.md` (thumbnail, explicit `width` / `height`, French `alt`).

## Design principles (from impeccable, hallmark, taste-skill, jakubkrehel/skills)
It is a "place" site: the photos sell it, the text stays warm and short.
- Photos lead: hero photo with the headline, one sentence and the main button visible at 1280x800; a big gallery beats more text; no captions under photos.
- One primary action per screen ("Voir les dates"). On mobile, the sticky bar shows only when neither the hero nor the calendar is on screen.
- Typography: Cormorant Garamond for display, Figtree for text. Body 17px, line-height 1.6, measure under 65ch; display line-height about 1.1.
- Avoid the AI-template tells: small uppercase labels above headings, rows of "big numbers", glyph icons, looping or scroll-reveal animations.
- Motion: opacity / transform only, 300ms or less, nothing that loops, `prefers-reduced-motion` respected, content visible without JS.
- Mobile first: `100dvh`, tap targets 44px, inputs 16px, no horizontal scroll at 390px.
- Accessibility: `:focus-visible` everywhere, calendar days have an `aria-label` with the full date and state, labels on every input, errors written in words.
- Never fake success: after the mailto the page says the mail still has to be sent.

## Checks before pushing
1. `node --check calendar.js script.js reserver.js`.
2. Serve locally (`python -m http.server 5173 --directory chez-moi` from the parent folder) and open both pages at 390px and 1440px, no console error.
3. Click through: dates, people, packs, transport, confirmation (stop before the mailto opens your mail app).
