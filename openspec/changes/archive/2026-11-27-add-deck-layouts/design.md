# Design

## Context

How layouts are loaded today:

- **Loading:** `loadLayoutSet(root, sources)` reads layout folders in order (built-in, then local) into one `Map<name, Layout>`. A name seen twice is an error that blames the later folder.
- **Using the set:**
  - `compileWorkspace` loads it once and passes the same map to every deck;
  - the Vite plugin loads it for `virtual:layouts.css` and for every dev page;
  - `dex docs layouts` and `dex new layout` load it too.
- **Styles:** each layout's CSS is scoped with `@scope (.slide[data-layout="<name>"])` inside `@layer layouts`.
- **Markup:** the deck page already wraps every slide in `<main class="deck" data-deck="<slug>">` (`src/core/render/pages.ts`).

Deck layouts add a third, per-deck source. This means there is no longer one layout set for the whole folder. There is one shared set, and each deck adds its own layouts on top of it.

## Goals / Non-Goals

**Goals:**
- One loader and one set of checks for all three origins: the same files, diagnostics and `layout.md` handling.
- Shared-layout problems are reported once, not once per deck.
- Deck layouts with the same name in two decks never affect each other's styles.

**Non-Goals:**
- Deck layout templates referring to deck assets (images in `template.html`). Templates keep the variables they have today.
- Overriding a wider layout from a deck. Option (b) was rejected. Collisions are errors.
- A per-deck stylesheet. All layout CSS stays in the one site-wide bundle.

## Decisions

### 1. A shared base set, extended per deck

`loadLayoutSet` keeps loading the base set (built-in plus local). A new function, `extendLayoutSet(root, base, { dir, origin: 'deck', deck })`, returns a new map: the base layouts plus that deck's layouts, together with the deck's own diagnostics only.

Where each set is built:

- **`compileWorkspace`:** loads the base once, then extends it for each deck it compiles. Deck-layout diagnostics therefore follow the slug filter, so `dex check http` doesn't report another deck's layouts.
- **`compileDeckAt`:** keeps taking a ready-made map.
- **Dev pages:** the plugin builds the map with `loadDeckLayouts(workspace, location)`, a helper next to `loadWorkspaceLayouts`.

*Alternative:* add the deck folder as a third source of `loadLayoutSet` on every call. That is simpler, but it repeats the base diagnostics for every deck and reloads the built-in layouts for every deck.

### 2. The collision message names the origin of the existing layout

The existing check (`layouts.get(name) !== undefined`) stays, but the message depends on the origin of the layout that is already there:

| Existing layout | Message |
| --- | --- |
| built-in | "is a built-in layout: … cannot replace built-in ones" |
| local | "is a local layout (`layouts/<name>/`): deck layouts cannot replace local ones" |

Both messages suggest a new folder name. The error is reported at the deck layout's `template.html`, and the existing layout stays in the map. This covers the spec's collision scenarios without a second code path.

### 3. Deck CSS is scoped by deck and by layout

The scope root becomes `@scope (.deck[data-deck="<slug>"] .slide[data-layout="<name>"])` for deck layouts. Inside it, `:scope` is still the slide, so the CSS a layout author writes is the same for every origin. `@layer layouts` handles precedence as before. The extra specificity from `.deck[…]` doesn't matter, because a slide has only one layout and utilities sit in a later layer.

- `scopeLayoutCss(name, css, deck?)` gains the optional slug.
- `Layout` gains `deck?: string`.
- `LayoutOrigin` gains `'deck'`.

*Alternative:* give deck layouts namespaced names in the markup (`data-layout="http/request"`). That was rejected because it would make the `data-layout` that authors and the viewer see depend on where the layout lives.

### 4. One site-wide stylesheet includes every deck's layouts

`virtual:layouts.css` becomes `layoutsCss(base) + layoutsCss(deck layouts of every deck)`, with decks in slug order and their layouts in name order. Deck layouts that collided are not in the map, so their CSS is never emitted. The stylesheet stays one cached file and the page markup doesn't change.

*Alternative:* one stylesheet per deck. That was rejected because it needs per-page CSS injection in both the build and the dev server, for a few kilobytes of saving.

### 5. Discovery only looks at real decks

Deck layouts are read only from `<deck dir>/layouts/`, where the deck dir comes from `findDecks`, meaning a folder that has `slides.md`. A `layouts/` folder in a folder that isn't a deck is ignored, just as such folders are today.

Unused-asset detection already looks only at `assets/`. The build copies only the assets slides refer to, so deck layout files never reach `dist/` as deck files.

### 6. The CLI gets a `--deck <slug>` option

`parseArgs` gains a `deck` string option. It applies to `new layout` and `docs layouts`. Any other command given `--deck` prints an error and the usage, like other bad arguments do.

- **`dex new layout <name> --deck <slug>`:**
  - refuses a deck that doesn't exist;
  - refuses invalid names, names in the base set (with the message from decision 2), and existing deck layouts;
  - writes the same `scaffold/layout/` files to `decks/<slug>/layouts/<name>/`;
  - the closing hint names the deck.
- **`dex new layout <name>` without `--deck`:** also refuses a name that any deck already uses for a deck layout, and names those decks.
- **`dex docs layouts --deck <slug>`:**
  - lists the extended set, ordered built-in, local, deck;
  - without `--deck`, it lists the base set and adds a line naming the decks that have their own layouts (for example "`http` (request, timeline)"), pointing to `--deck`;
  - an unknown deck is an error.

### 7. The dev server

`decksDir` is already watched. In `hotUpdate`:

- a file under `decks/<slug>/layouts/` counts as a layout file;
- a change to its `style.css` hot-swaps the CSS module, as it does for local layouts;
- other changes to it (template, `layout.md`, a folder added or removed) invalidate the CSS module and fully reload the page;
- `load` adds every deck layout's `style.css` to the watched files, as it does for the others.

## Risks / Trade-offs

- **[Moving a deck into a content folder whose local layouts reuse one of its layout names]** → The move breaks that deck: `dex check` reports the clash at the deck layout and suggests a new name. This is the price of policy (a), which the user chose.
- **[Adding a local layout later breaks a deck that has a deck layout with that name]** → `dex new layout` refuses the name. A local layout created by hand is caught by `dex check`, at the deck layout.
- **[The stylesheet grows with every deck's layouts]** → Layout CSS is small and already loads on every page. Revisit per-deck stylesheets only if it becomes noticeable.
- **[The plugin now scans every deck to build the CSS]** → It already scans every deck for the index page. Loading layouts reads only small files.

## Migration Plan

Nothing to migrate. Content folders without `decks/<slug>/layouts/` behave as they do now.
