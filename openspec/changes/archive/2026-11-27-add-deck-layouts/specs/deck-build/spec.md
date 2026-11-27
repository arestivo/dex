## MODIFIED Requirements

### Requirement: Development server

`dex dev` SHALL serve the index and all decks locally. When a deck source, a layout template or a layout stylesheet changes (built-in, local or deck), or a local or deck layout is added or removed, open pages SHALL update without a manual reload. Stylesheet changes SHALL apply without reloading the page. Diagnostics SHALL appear in the terminal and, for errors, in the browser in place of the deck.

#### Scenario: Edit a slide
- **WHEN** the dev server is running on `/http/#urn` and the author edits that slide's text
- **THEN** the page reloads on slide `urn` showing the new text

#### Scenario: Edit a local layout's style
- **WHEN** the dev server is running and the author edits `layouts/quote/style.css` in the content folder
- **THEN** slides using `quote` show the new style without the page reloading

#### Scenario: Edit a deck layout's style
- **WHEN** the dev server is running and the author edits `decks/http/layouts/request/style.css`
- **THEN** slides of `http` using `request` show the new style without the page reloading

#### Scenario: Error while editing
- **WHEN** the author saves a deck with an unknown directive
- **THEN** the browser shows an error page listing the diagnostic, and the deck returns once the error is fixed and saved

### Requirement: Content folder

Every command SHALL work on a content folder: the working directory by default, or the folder given by `--folder <dir>`. Decks SHALL be read from its `decks/` folder, local layouts from its `layouts/` folder and each deck's layouts from `decks/<slug>/layouts/`. Diagnostic paths SHALL be relative to the content folder. Built-in layouts, global styles and the viewer SHALL come from the engine, whatever the content folder.

#### Scenario: Run inside a content folder
- **WHEN** the user runs `dex build` in `~/talks`, which contains `decks/http/slides.md`
- **THEN** the `http` deck is built with the engine's layouts, any local layouts in `~/talks/layouts` and any deck layouts in `~/talks/decks/http/layouts`

#### Scenario: Select a content folder
- **WHEN** the user runs `dex check --folder ~/talks` from another folder
- **THEN** the decks in `~/talks/decks` are checked and diagnostics name `decks/<slug>/slides.md`

#### Scenario: Dev server with an external content folder
- **WHEN** `dex dev` runs on a content folder outside the engine and a deck there is edited
- **THEN** open pages of that deck reload
