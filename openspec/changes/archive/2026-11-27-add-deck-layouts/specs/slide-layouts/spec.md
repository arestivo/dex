## MODIFIED Requirements

### Requirement: Layout folders

Layouts SHALL come from three places: the engine's `layouts/<name>/` (built-in layouts), the content folder's `layouts/<name>/` (local layouts) and a deck's `decks/<slug>/layouts/<name>/` (deck layouts). Each layout folder SHALL contain a `template.html` and, optionally, a `style.css`. `<name>` MUST match `^[a-z][a-z0-9-]*$`. Built-in and local layouts SHALL be available to every deck in the content folder, and a deck layout only to its own deck, as `layout=<name>` with no other registration.

#### Scenario: New layout
- **WHEN** an author creates `layouts/quote/template.html` in the content folder
- **THEN** slides in that folder's decks declaring `layout=quote` render with that template

#### Scenario: Local layouts stay local
- **WHEN** content folder A has a local layout `quote` and content folder B does not
- **THEN** a slide in B declaring `layout=quote` is reported as using an unknown layout

#### Scenario: Deck layout
- **WHEN** an author creates `decks/http/layouts/request/template.html`
- **THEN** slides of the `http` deck declaring `layout=request` render with that template

#### Scenario: Deck layouts stay in their deck
- **WHEN** the `http` deck has a deck layout `request` and the `css` deck does not
- **THEN** a slide in `css` declaring `layout=request` is reported as using an unknown layout

#### Scenario: Unknown layout
- **WHEN** a slide declares `layout=nope` and no built-in, local or deck layout `nope` is available to its deck
- **THEN** the check reports an error listing the layouts available to that deck

#### Scenario: Default layout required
- **WHEN** the engine's `layouts/default/template.html` does not exist
- **THEN** the build fails with an error

### Requirement: Scaffold a local layout

`dex new layout <name>` SHALL create `layouts/<name>/` in the content folder with a starter `template.html` (title and default slots), a `style.css` using design tokens, and a `layout.md` with a description placeholder and usage-notes sections. It SHALL refuse invalid names, built-in names, existing local layouts and names used by a deck layout, writing nothing. A deck using the new layout SHALL pass `dex check` apart from the description-placeholder warning.

#### Scenario: Create a layout
- **WHEN** the user runs `dex new layout quote` in a content folder
- **THEN** `layouts/quote/template.html`, `style.css` and `layout.md` exist and `layout=quote` is usable

#### Scenario: Name taken
- **WHEN** the user runs `dex new layout title` or `dex new layout quote` when `layouts/quote/` exists
- **THEN** the command explains why and exits non-zero, writing nothing

#### Scenario: Name used by a deck layout
- **WHEN** the user runs `dex new layout request` and the `http` deck has a deck layout `request`
- **THEN** the command names the `http` deck's layout as the reason and exits non-zero, writing nothing

## ADDED Requirements

### Requirement: Deck layouts cannot replace wider layouts

A deck layout whose name matches a built-in or local layout SHALL be an error reported at the deck layout's template, and the built-in or local layout SHALL be used. Deck layouts of different decks MAY share a name.

#### Scenario: Deck layout reuses a local name
- **WHEN** the content folder has `layouts/quote/` and the `http` deck has `decks/http/layouts/quote/template.html`
- **THEN** the check reports an error at the deck layout's template saying `quote` is a local layout and the deck layout needs another name

#### Scenario: Deck layout reuses a built-in name
- **WHEN** the `http` deck has `decks/http/layouts/title/template.html`
- **THEN** the check reports an error at that template saying `title` is a built-in layout

#### Scenario: Same name in two decks
- **WHEN** the `http` and `css` decks each have a deck layout `example`
- **THEN** each deck renders its own `example` and no error is reported

### Requirement: Deck layout styles stay in their deck

A deck layout's `style.css` SHALL apply only to slides of its own deck that use that layout, with the same `:scope` and precedence rules as other layout styles.

#### Scenario: Same-named deck layouts styled independently
- **WHEN** the `http` and `css` decks each have a deck layout `example` with different `style.css`
- **THEN** slides using `example` in each deck get only their own deck's style

### Requirement: Scaffold a deck layout

`dex new layout <name> --deck <slug>` SHALL create `decks/<slug>/layouts/<name>/` with the same starter files as a local layout. It SHALL refuse a missing deck, invalid names, built-in and local names, and existing layouts of that deck, without writing anything.

#### Scenario: Create a deck layout
- **WHEN** the user runs `dex new layout request --deck http`
- **THEN** `decks/http/layouts/request/template.html`, `style.css` and `layout.md` exist and `layout=request` is usable in the `http` deck

#### Scenario: Unknown deck
- **WHEN** the user runs `dex new layout request --deck nope` and there is no deck `nope`
- **THEN** the command says so and exits non-zero, writing nothing

#### Scenario: Name used by a wider layout
- **WHEN** the user runs `dex new layout quote --deck http` and `layouts/quote/` exists
- **THEN** the command explains that `quote` is a local layout and exits non-zero, writing nothing
