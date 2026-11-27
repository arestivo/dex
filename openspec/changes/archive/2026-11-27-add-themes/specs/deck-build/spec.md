## MODIFIED Requirements

### Requirement: Content folder

Every command SHALL work on a content folder: the working directory by default, or `--folder <dir>`. Decks SHALL be read from its `decks/`, local layouts from `layouts/`, deck layouts from `decks/<slug>/layouts/`, local themes from `themes/` and settings from `dex.yaml`. Diagnostic paths SHALL be relative to the content folder. Built-in layouts and themes, global styles and the viewer SHALL come from the engine, whatever the content folder.

#### Scenario: Run inside a content folder
- **WHEN** the user runs `dex build` in `~/talks`, which contains `decks/http/slides.md`
- **THEN** the `http` deck is built with the engine's layouts, any local layouts in `~/talks/layouts` and any deck layouts in `~/talks/decks/http/layouts`

#### Scenario: Select a content folder
- **WHEN** the user runs `dex check --folder ~/talks` from another folder
- **THEN** the decks in `~/talks/decks` are checked and diagnostics name `decks/<slug>/slides.md`

#### Scenario: Dev server with an external content folder
- **WHEN** `dex dev` runs on a content folder outside the engine and a deck there is edited
- **THEN** open pages of that deck reload

#### Scenario: Local themes
- **WHEN** `~/talks/themes/ocean/theme.css` exists and a deck there says `theme: ocean`
- **THEN** `dex build` in `~/talks` builds that deck with the `ocean` colours

### Requirement: Slide screenshots

`dex shot <slug> [id...]` SHALL build the site and save PNG images of the given slides, or of every slide of the deck, at 1280×720, in both light and dark mode, to `.dex/shots/<slug>/<id>-light.png` and `<id>-dark.png` in the content folder. It SHALL print the paths of the images it wrote, and exit non-zero, writing nothing, for an unknown deck or slide id or a deck with errors.

#### Scenario: One slide
- **WHEN** the user runs `dex shot http agent-loop`
- **THEN** `.dex/shots/http/agent-loop-light.png` and `.dex/shots/http/agent-loop-dark.png` exist and their paths are printed

#### Scenario: Whole deck
- **WHEN** the user runs `dex shot http`
- **THEN** a light and a dark image is saved for every slide of `http`

#### Scenario: Unknown slide
- **WHEN** the user runs `dex shot http nope`
- **THEN** the command reports that `nope` is not a slide of `http` and exits non-zero

## ADDED Requirements

### Requirement: Content folder configuration

A content folder MAY contain a `dex.yaml` file: a YAML mapping whose only key, for now, is `theme` (the folder's default theme). Invalid YAML, a value that is not a mapping, and unknown keys SHALL be errors at `dex.yaml` that say which keys are allowed. Without `dex.yaml`, every setting SHALL take its default.

#### Scenario: Folder theme
- **WHEN** `dex.yaml` contains `theme: slate`
- **THEN** decks without their own `theme` and the index page use `slate`

#### Scenario: Unknown key
- **WHEN** `dex.yaml` contains `port: 8080`
- **THEN** the check reports an error at `dex.yaml` naming `port` and listing the allowed keys

### Requirement: Live theme updates

While `dex dev` runs, editing a theme's `theme.css` SHALL update open pages without reloading them. Adding or removing a theme, or editing `dex.yaml` or a deck's `theme`, SHALL reload open pages, and an error SHALL show in the browser as other errors do.

#### Scenario: Edit a theme
- **WHEN** the dev server is running and the author edits `themes/ocean/theme.css`
- **THEN** pages of decks using `ocean` show the new colours without reloading
