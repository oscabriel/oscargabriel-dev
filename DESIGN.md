---
name: The Commonplace Book
description: Oscar Gabriel's site set as one open book — paper and ink, EB Garamond with Courier Prime for code, a left leaf that never moves.
colors:
  paper: "#fafafa"
  ink: "#2a2722"
  ink-soft: "#666666"
  ink-faint: "oklch(0.765 0.01 80)"
  rule: "oklch(0.895 0.008 80)"
  wash: "#f0f0f0"
  rubric-red: "oklch(0.5 0.16 27)"
  rubric-sepia: "oklch(0.45 0.09 60)"
  rubric-iron-gall: "oklch(0.42 0.08 250)"
  rubric-green: "oklch(0.42 0.1 145)"
  destructive: "oklch(0.5 0.19 27)"
  paper-night: "#2a2722"
  ink-night: "#fafafa"
  ink-soft-night: "#9f9f9f"
  ink-faint-night: "oklch(0.525 0.01 70)"
  rule-night: "oklch(0.39 0.008 70)"
  wash-night: "oklch(0.335 0.008 70)"
  rubric-red-night: "oklch(0.76 0.12 27)"
  rubric-sepia-night: "oklch(0.8 0.08 75)"
  rubric-iron-gall-night: "oklch(0.78 0.07 240)"
  rubric-green-night: "oklch(0.78 0.1 145)"
  destructive-night: "oklch(0.68 0.17 24)"
typography:
  display:
    fontFamily: "EB Garamond, Garamond, Iowan Old Style, Georgia, serif"
    fontSize: "2.75rem"
    fontSizeWide: "3.5rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "EB Garamond, Garamond, Iowan Old Style, Georgia, serif"
    fontSize: "2.75rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "EB Garamond, Garamond, Iowan Old Style, Georgia, serif"
    fontSize: "1.875rem"
    fontWeight: 500
    lineHeight: 1.2
  section:
    fontFamily: "EB Garamond, Garamond, Iowan Old Style, Georgia, serif"
    fontSize: "1.75rem"
    fontWeight: 500
    lineHeight: 1.3
  subtitle:
    fontFamily: "EB Garamond, Garamond, Iowan Old Style, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 500
    fontStyle: "italic"
    lineHeight: 1.3
  entry:
    fontFamily: "EB Garamond, Garamond, Iowan Old Style, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.35
  body:
    fontFamily: "EB Garamond, Garamond, Iowan Old Style, Georgia, serif"
    fontSize: "1.25rem"
    fontSizeNarrow: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
  body-lead:
    fontFamily: "EB Garamond, Garamond, Iowan Old Style, Georgia, serif"
    fontSize: "1.375rem"
    fontWeight: 400
    lineHeight: 1.625
  marginalia:
    fontFamily: "EB Garamond, Garamond, Iowan Old Style, Georgia, serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.625
  tab:
    fontFamily: "EB Garamond, Garamond, Iowan Old Style, Georgia, serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    fontVariant: "all-small-caps"
    letterSpacing: "0.06em"
  label:
    fontFamily: "EB Garamond, Garamond, Iowan Old Style, Georgia, serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    fontVariant: "all-small-caps"
    letterSpacing: "0.06em"
  code:
    fontFamily: "Courier Prime, Courier New, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  none: "0"
  admin: "0.125rem"
spacing:
  gutter: "1.5rem"
  gutter-wide: "3rem"
  page-top: "2.5rem"
  page-top-wide: "4rem"
  leaf-top: "3rem"
  block: "2.5rem"
  foot: "4rem"
  entry: "1.5rem"
  leaf-width: "22rem"
components:
  thumb-tab:
    textColor: "{colors.ink}"
    typography: "{typography.tab}"
    padding: "0.375rem 1.25rem 0.375rem 1.5rem"
    rounded: "{rounded.none}"
  index-link:
    textColor: "{colors.ink}"
    typography: "{typography.marginalia}"
    padding: "0.25rem 0"
  turn-link:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
  turn-link-secondary:
    textColor: "{colors.ink-soft}"
  contents-entry:
    textColor: "{colors.ink}"
    typography: "{typography.entry}"
    padding: "1.5rem 0"
  plate-label:
    textColor: "{colors.ink-soft}"
    typography: "{typography.label}"
  code-insert:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.ink}"
    typography: "{typography.code}"
    padding: "1rem 1.25rem"
    rounded: "{rounded.none}"
---

# Design System: The Commonplace Book

## Overview

**Creative North Star: "The Commonplace Book"**

The whole site is one book lying open. The left leaf belongs to the author and holds still: a small serif wordmark, a short intro, and a thumb index of stepped tabs cut into the leaf's fore-edge. The right leaf is whatever the reader turned to: a blank page at `/` (the leaf is the whole welcome), a contents page at `/blog` and `/projects`, the curriculum vitae at `/cv`, or the article itself. Navigating to a new page turns it: the new page wipes in from the fore-edge while the author stays in view. The world refuses the centred single column under a top nav bar.

The material is paper and ink and nothing else. There is no accent hue; there are no cards, boxes, shadows, badges or icons. Type is the only material, so hierarchy is carried by one book face, EB Garamond, in its roman, italic and true small caps, and by three depths of ink. Courier Prime appears only where code does. Colour appears only where a book would carry it: in the plates (film stills as numbered figures with italic captions) and in rubricated code, where keywords are red, strings sepia and types iron-gall blue. State is a mark, not a hue: the printer's fist ☞ points at the current tab and section, and a dagger † follows any post the reader has opened.

Density is bookish, not sparse: a 65ch measure at 20px/1.6 (18px on phones, to keep the measure above 45 characters), wide gutters, plenty of leading, but every line does a job. At night the page reverses (ink and paper trade places) under the same five tokens, so nothing is designed twice.

**Key Characteristics:**

- Two leaves, one hairline between them; the left leaf (22rem) is sticky and never moves.
- Five neutral tokens (paper, ink, ink-soft, ink-faint, rule) derive every surface; no accent hue anywhere.
- EB Garamond for everything that is not code: text in roman and italic, labels, dates and tabs in true small caps, figures old-style. Courier Prime for code only.
- Ornament is limited to the manicule ☞, the dagger †, the pilcrow ¶ list mark and the arrow →, all drawn from EB Garamond so they look the same on every system.
- Every image is a numbered plate (Plate I, II, …) with an italic caption.
- One authored motion: the page turn (360ms), only when the page changes. None under reduced motion.
- Light and dark both ship; the toggle is a woodcut of the sun and moon at the leaf's foot.

## Colors

A paper-and-ink palette: off-white (`#fafafa`) and dark grey (`#2a2722`) with three graded inks between them, the two trading places at night, and a strictly rationed set of rubric hues that appear only inside code.

### Primary

- **Ink** (`ink`, night: `ink-night`): the reading colour. Titles, body text, the current tab, the active section, the manicule, text selection background and the focus outline. `--primary` in the shadcn mapping resolves to ink, so a filled admin button is ink on paper.

### Neutral

- **Paper** (`paper`, night: `paper-night`): the page. The only background the public site uses; also `--background`, `--card`, `--popover` and `--sidebar` in the shadcn mapping. The current thumb tab paints its right edge in paper to break the hairline.
- **Soft ink** (`ink-soft`, night: `ink-soft-night`): marginalia on the right leaf. Summaries, dates, labels, captions, code punctuation and comments, `--muted-foreground` and `--ring`.
- **Faint ink** (`ink-faint`, night: `ink-faint-night`): the lightest mark that still reads. Underlines at rest, dotted leaders on contents pages, the ¶ list mark, blockquote and `hr` rules, the hidden heading anchor.
- **Rule** (`rule`, night: `rule-night`): hairlines. The leaf's fore-edge, the tab hairline, contents-entry separators, code-block top and bottom rules, table cell rules, `--border` and `--input`.
- **Wash** (`wash`, night: `wash-night`): the only filled surface, a neutral grey a step off the paper. Code-block background (`--twp-background` is a shade of it) and the shadcn `--secondary`, `--muted`, `--accent` and `--sidebar-accent` for admin controls. Never used as a card or panel on the public site.

### Rubric (code only)

- **Rubric red** (`rubric-red`, night: `rubric-red-night`): keywords, tag names, units, decorators, selectors, deleted lines.
- **Rubric sepia** (`rubric-sepia`, night: `rubric-sepia-night`): strings, templates, regex, numbers, booleans, constants, lifetimes, inline code inside markdown, changed lines.
- **Iron-gall blue** (`rubric-iron-gall`, night: `rubric-iron-gall-night`): types, class names, builtins, properties, attributes, namespaces, entities, URLs.
- **Rubric green** (`rubric-green`, night: `rubric-green-night`): inserted lines in diffs only.
- Everything else in code (identifiers, variables, functions, parameters) is set in the page's own ink; punctuation, operators and comments in soft ink.

### Destructive (admin only)

- **Destructive** (`destructive`, night: `destructive-night`): the shadcn `--destructive`; delete and unpublish controls in the admin. It has no public-site use.

### Named Rules

**The Paper-and-Ink Rule.** The public site uses exactly five neutral tokens and no accent hue. If a new element seems to need a colour, it needs a mark, a weight, a face or a rule instead.

**The Rubric Rule.** Hue is permitted in two places only: inside the plates (images) and inside code, as rubrication in red, sepia and iron-gall blue. It never appears on chrome, links, states or backgrounds.

**The Same-Five Rule.** Dark mode is not a second palette. It redefines the same five tokens (`.dark`) and every other value derives; nothing is designed twice.

## Typography

**Text Font:** EB Garamond (with Garamond, Iowan Old Style, Georgia, serif), variable weight 400–800, roman and italic. Self-hosted from `src/fonts/` (licence `src/fonts/OFL.txt`): a Latin and Latin Extended-A subset cut from the Google Fonts source with every OpenType feature kept, because the Fontsource build drops `smcp`/`c2sc`, `onum`/`lnum` and the ☞ and → glyphs. `--font-sans` aliases `--font-serif`, so there is no sans in the system. **Code Font:** Courier Prime (with Courier New, monospace), code blocks and inline code only.

**Character:** A Renaissance book face with a small x-height (0.40em), so the whole Tailwind size scale is redefined one step larger in `@theme` (`--text-xs` 0.9375rem through `--text-5xl` 3.5rem) and `--tracking-tight` is loosened to −0.01em. Figures are old-style everywhere (`font-variant-numeric: oldstyle-nums` on `html`). Nothing is set in bold except `strong` (600) inside an article.

### Hierarchy

- **Display** (500, 2.75rem rising to 3.5rem at ≥48rem, 1.25, −0.01em, `text-wrap: balance`): the post title.
- **Headline** (500, 2.75rem, 1.25, −0.01em): "Writing", "Projects" and "Curriculum Vitae" at the head of their pages.
- **Title** (500, 1.875rem, 1.2, balanced): `h2` inside an article, with 2.5em above.
- **Section** (500, 1.75rem): a section heading on the CV ("Experience", "Skills").
- **Subtitle** (500 italic, 1.5rem, 1.3): `h3` inside an article, with 2em above. `h4` is 500 in small caps with 0.06em tracking.
- **Entry** (500, 1.5rem): a post, project, employer or school title on a contents page, followed by a dotted leader. A CV role under an employer is italic at 1.375rem.
- **Body** (400, 1.25rem/1.6 from `md`, 1.125rem below, measure `max-w-prose` = 65ch): the article and all page text by default (`body` is `text-base`). Paragraph spacing is 1.25em; heading-to-first-paragraph is 0.75em.
- **Body lead** (400, 1.375rem, 1.625, soft ink): the CV summary.
- **Marginalia** (400, 1.0625rem): the leaf intro and index entries in ink; captions in italic soft ink.
- **Tab** (400, 1.0625rem, all small caps, 0.06em): the thumb index tabs.
- **Label** (400, 0.9375rem, all small caps, 0.06em, soft ink): dates, "Plate I", "Turn to", table headers, project link rows, CV skill labels. Set with the `smallcaps` utility.
- **Code** (Courier 400, 0.875rem, 1.6 in blocks; 0.8em inline to match Garamond's x-height, ink): typewritten inserts between ruled lines.

### Named Rules

**The One Face Rule.** EB Garamond for everything that is not code, with roman, italic and small caps doing the work a second face would. Courier Prime is for code blocks and inline code only; it is never a costume for labels. No sans.

**The Real Small Caps Rule.** Labels use `font-variant-caps: all-small-caps` (the `smallcaps` utility), which EB Garamond draws with true small caps; never `text-transform: uppercase` plus wide tracking, and never a font build that has lost `smcp`.

**The Medium Weight Rule.** Headings are weight 500. Bold (600) exists only for `strong` in running text.

**The Underline Rule.** Links in running text are ink with a faint-ink underline that darkens to ink on hover (150ms). Navigational links (titles, tabs, "Turn to") carry no underline at rest and gain one on hover. Underline offset is 0.18em, thickness 1px.

## Layout

The book is a two-column grid from the `md` breakpoint (48rem): `22rem minmax(0, 1fr)`. The left leaf is `position: sticky; top: 0; height: 100dvh` with its own vertical scroll, so it stays on screen across every navigation and every scroll position of the right leaf. A one-pixel pseudo-element hairline in `rule` runs the leaf's full height at its right edge.

Inside the leaf: 1.5rem side gutters, 3rem top (2rem on mobile), the wordmark, a 30ch intro, the tabs at 0.375rem vertical padding, then the open post's section index beneath a dashed hairline with 2rem above, and the sun and moon theme toggle pushed to the foot with `margin-top: auto`.

The right leaf has no max width of its own; content is measured instead. At `/` it is deliberately empty (a screen-reader-only `h1` names the site). Contents pages, the CV and articles pad 1.5rem × 2.5rem on mobile and 3rem × 4rem from `md`. The article, the contents lists, the CV and the foot navigation are all `max-w-prose` (65ch). The article plate is 16:9 within the measure.

Vertical rhythm on the right leaf uses 2.5rem (`mt-10`) between the plate, the sections disclosure and the body, 4rem (`mt-16`) before the foot navigation, 3.5rem (`mt-14`) between CV sections, and 1.5rem (`py-6`) per contents entry with a hairline above each.

Below `md`, the leaf stands above the page with no rule beneath it, and only at `/` is it whole: wordmark, intro, the tabs stacked as on the leaf, then the theme toggle. On every other page it shrinks to the wordmark, which leads back home to the index; there is no menu. The section index is hidden. The post's sections become a native `<details>` disclosure between the plate and the body, ruled top and bottom, with a small-caps "In this post" summary. On contents lines the dates drop beneath the title and the dotted leader is hidden where space is short (the CV does this; the blog and projects lists still keep one line).

Browser surfaces belong to the book: scrollbars are thin, `ink-faint` on transparent; the text selection is paper on ink; the focus outline is a 1px ink line 3px out.

## Elevation & Depth

There are no shadows, no tonal layering and no elevation. Everything sits on one sheet of paper. Separation is done with hairlines (`rule`, 1px, solid or dashed or dotted) and with whitespace; hierarchy with ink depth (ink, soft, faint) and type. The one thing that reads as depth is the page turn itself: the old page dims to 40% while the new one wipes in over it, which is a momentary stacking of pages, not a shadow, and it is gone in 360ms.

### Named Rules

**The One Sheet Rule.** No `box-shadow`, no raised panels, no tinted containers on the public site. If two regions need separating, draw a hairline or add space.

## Shapes

No corners. The public site draws nothing that has a radius: no boxes, no buttons with fills, no chips, no badges. Hairlines are the only geometry: solid `rule` for structural edges, dashed `rule` above the section index, dotted `ink-faint` for the contents leader, a 1px `ink-faint` left rule on blockquotes and a 6ch centred `hr`. Images are rectangles with square corners. The shadcn `--radius` is 0.125rem, which only the admin's inherited controls use.

The recurring mark is the manicule ☞ pointing at the reader's place. The recurring glyphs are the manicule ☞, the dagger †, the pilcrow ¶ and the arrow → after a "turn" link, all EB Garamond's own.

## Components

### Thumb Index (navigation)

A vertical stack of stepped tabs on the leaf's fore-edge, in Garamond small caps (1.0625rem, 0.06em), in ink at rest and on hover alike: the leaf is the author's own page, so its text is never muted. They stand in two groups: the contents (Writing, Projects, CV), then, after a gap, the links elsewhere (GitHub, LinkedIn, Twitter). On the current tab (`aria-current="page"`) a manicule ☞ slides in at its left as the label steps right to make room; a hovered tab nudges right too. The links elsewhere open in a new tab and never take the manicule; a hand points them on their way under the pointer instead. On phones the stack shows only on the home page, under the intro. There is no Email tab by decision.

### Section Index (thumb index, open post)

When a post is open the leaf grows "In this post" beneath a dashed hairline: a nested list of the article's `h2`s with `h3`s indented 1rem beneath them, in marginalia with 0.25rem vertical padding per link, under an "In this post" label in ink small caps. A single manicule glides (`transition: all 300ms ease-out`) to the entry whose heading is the last one above a line a quarter of the way down the viewport; when the page can scroll no further it points at the last heading. Every link is ink; the manicule alone marks the active one. Clicking an entry is a hash-only navigation and never plays the page turn (see Page Turn).

### Contents Entry

Each post or project on a contents page: a hairline above, 1.5rem vertical padding, then a baseline row of title (entry style, ink, underline on hover), an optional dagger † (soft ink, titled "You've opened this post before") for any post the reader has opened, a dotted `ink-faint` leader that flexes to fill, and the date in label style (long date for posts, "Mon YYYY" for projects). A soft-ink summary at 60ch follows; projects add a small-caps line with a "Source" link and a star count.

### Curriculum Vitae

`/cv` is a contents page in four sections (Experience, Selected projects, Education, Skills) under a headline, a small-caps line of place and links (LinkedIn, GitHub; no phone, street or email), and a body-lead summary. Employers, schools and projects are contents entries. An employer with one role names the role and the employer on the entry line; an employer with several names only itself, and each role gets its own italic line with a leader and dates. Role notes are italic soft ink; achievements are a pilcrow list (the `pilcrows` utility). Skills are a `dl` of small-caps labels beside text, hairline between rows. The content lives in `src/cv/cv.ts`, merged from the author's tailored résumés into one general version.

### Plate

Every image is a figure. The header plate is `Plate I`, 16:9 within the article's measure. The caption row is a baseline flex: "Plate I" in label style, then the caption in italic soft ink. Inside the article body, CSS numbers further plates automatically: `.post-body` resets a `plate` counter at 1 and every `figcaption` (or a paragraph holding a lone image) is prefixed with "Plate " + roman numeral in small caps, so in-body images run Plate II, III, … Body figcaptions are italic soft ink with the label floated left.

### Turn Link

The book's only call to action is a line of text with an arrow. At the foot of an article: "Turn to [next title] →" / "Turn back to [previous title]", with the "Turn to" in label style. The primary turn is ink; the secondary is soft ink and darkens on hover. Foot turns have no underline until hover. The foot navigation sits under a hairline with 4rem above, 1.5rem below the rule, entries 0.75rem apart, the next (older) post first. The CV ends its projects with "Everything else I've built →" to `/projects`.

### Page Turn

The one authored motion. Navigating to a different path runs a view transition (TanStack Router `defaultViewTransition: true`): the left leaf is named `book-leaf` and its group does not animate, so it holds still; the page itself turns on the **root** snapshot, which is always viewport-sized: the old page dims to 40% (`page-out`) while the new one wipes in from the fore-edge (`page-in`: `clip-path` from `inset(0 0 0 100%)` plus a 2rem slide), 360ms `cubic-bezier(0.2, 0, 0, 1)`. The root animations are scoped with `:root:has(.book-leaf)`, so pages outside the book (the admin) never turn. Under `prefers-reduced-motion` there is no animation.

Hash-only navigations (section index links, heading anchors, back and forward between sections) never turn the page: `src/router.tsx` sets `router.shouldViewTransition = false` in an `onBeforeNavigate` subscriber whenever the path is unchanged. Below `md` no page turns at all: the leaf sits above the page with no fore-edge to turn from, so the same subscriber skips the transition and the new page replaces the old at once.

### Code Insert

A `pre` set like a typewritten insert: `wash` background, 1px `rule` top and bottom, no side borders and no radius, 1rem × 1.25rem padding, Courier 0.875rem/1.6, tab size 2, horizontal scroll if needed. Tokens are rubricated per the Rubric palette. Inline code is Courier at 0.8em in ink with no background.

### Theme Toggle

The leaf's foot: a woodcut of the sun and moon, the sun's wash showing by day and the crescent's by night, with hover hinting at the other. It is a button named "Dark theme" with `aria-pressed`, titled "Read by moonlight" or "Read by daylight". On phones it shows only on the home page, under the tabs. Two states are shown; three are stored: nothing (follow the system), or "light"/"dark" only while the choice differs from the system, so a later system change is never pinned. An inline head script applies `.dark` before first paint.

### Mobile Sections Disclosure

On small screens the section index becomes a `<details>` between the plate and the body: 1px `rule` top and bottom, 0.75rem padding, a small-caps "In this post" summary, then an ordered list in marginalia with `h3`s indented 1rem, links in ink.

### Article Body (`.post-body`)

EB Garamond 1.25rem/1.6 (1.125rem below `md`), 1.25em between blocks. Unordered lists drop bullets for a faint-ink pilcrow ¶ hung 1.5em in the margin; ordered lists use old-style decimal markers in soft ink. Blockquotes are italic soft ink with a 1px faint left rule (an `em` inside reverts to upright). Tables have hairline rows and small-caps label heads. Headings get a faint-ink anchor link that appears only on hover or focus. Every heading has `scroll-margin-top: 3rem`.

### Inputs / Buttons (admin only)

The admin uses the shadcn primitives in `src/components/ui/` untouched, styled entirely by the token mapping: paper background, ink foreground and primary, wash for secondary/muted/accent, rule for borders and inputs, soft ink for the ring, 0.125rem radius. It inherits EB Garamond and the enlarged size scale. It gets no leaf, no tabs, no plates, no page turn and no identity of its own.

## Do's and Don'ts

### Do:

- **Do** derive every colour from the five tokens `--paper`, `--ink`, `--ink-soft`, `--ink-faint`, `--rule`, and let `.dark` redefine only those five.
- **Do** set everything that is not code in EB Garamond at 400 or 500, labels in true small caps with the `smallcaps` utility, and code in Courier Prime.
- **Do** size type from the redefined Tailwind scale (`text-xs` … `text-5xl`) rather than literal rems, so the Garamond compensation stays in one place.
- **Do** mark state with a glyph or a rule: the manicule ☞ for the current tab or section, the dagger † for an opened post.
- **Do** make every image a numbered plate: a `figure` with a small-caps "Plate n" label and an italic soft-ink caption; let `.post-body`'s counter number in-body plates from II.
- **Do** keep the article, lists, CV and foot navigation at `max-w-prose` (65ch), with 1.5rem/3rem gutters and 2.5rem/4rem top padding on the right leaf.
- **Do** separate regions with a 1px `rule` hairline (solid, dashed above the section index, dotted for leaders) or with space.
- **Do** keep the page turn on the root snapshot, the left leaf named `book-leaf`, the turn at 360ms `cubic-bezier(0.2, 0, 0, 1)`, off under `prefers-reduced-motion`, and off for hash-only navigations.
- **Do** write calls to action as a line of text ending in →, not a button.

### Don't:

- **Don't** add an accent hue, a brand colour, or a coloured link, hover, focus or active state; hue lives only in plates and in rubricated code.
- **Don't** draw cards, boxes, panels, badges, chips or shadows on the public site; `wash` is for code blocks (and admin controls), never for containers.
- **Don't** use interface icons beyond the section index's unfold caret. The system's other pictographs are the typographic glyphs ☞ † ¶ → and the woodcuts: the criblé O and the sun and moon.
- **Don't** use a radius on the public site, and don't raise `--radius` (0.125rem) for the admin.
- **Don't** set headings in bold; 500 is the heading weight, 600 is reserved for `strong` in running text.
- **Don't** introduce a sans-serif or a second text face, and don't use Courier for anything but code.
- **Don't** give a tall element its own `view-transition-name`: a named snapshot is captured whole (a long post is over 20,000px) and a `clip-path` animation repaints all of it every frame.
- **Don't** add a second motion. The page turn is the one authored moment; everything else is a 150–300ms colour or position ease.
- **Don't** give the admin leaf treatment, tabs, plates or any identity beyond the inherited token mapping.
- **Don't** publish a phone number, street address or email on the site.
