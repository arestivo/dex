# deck-build Specification

## Purpose
Defines the commands that validate, preview and publish decks, the shape of the published output, and how problems are reported to authors and agents.

## Requirements

### Requirement: Check command

`dex check [slug...]` (in the engine repository: `pnpm check:decks`) SHALL validate all decks (or only the given decks) against the deck format and layouts without producing output. It SHALL exit with a non-zero status if any error is found. Warnings alone SHALL NOT fail the check.

#### Scenario: Clean decks
- **WHEN** all decks are valid
- **THEN** the command prints a summary and exits with status 0

#### Scenario: One error
- **WHEN** one slide references a missing image
- **THEN** the command prints the diagnostic and exits with a non-zero status

#### Scenario: Single deck
- **WHEN** the user runs `dex check http`
- **THEN** only the `http` deck is validated

### Requirement: Diagnostic format

Each diagnostic SHALL state its severity, the file path, the line number where known, the slide id where known, and a message that says what is wrong and how to fix it. The format SHALL be `<file>:<line> <severity> [<slide-id>] <message>`, one diagnostic per line.

#### Scenario: Located diagnostic
- **WHEN** slide `headers`, starting at line 120 of `decks/http/slides.md`, uses an unknown layout
- **THEN** the output contains a line like `decks/http/slides.md:120 error [headers] Unknown layout "nope". Available: center, default, section, title, two-columns.`

### Requirement: Build command

`dex build` (in the engine repository: `pnpm build`) SHALL validate all decks and, if no errors are found, write a static site to the output folder. It SHALL fail without writing a partial site when any deck has errors.

#### Scenario: Successful build
- **WHEN** the user runs `dex build` and all decks are valid
- **THEN** the output folder contains `index.html`, one `<slug>/index.html` per deck, each deck's assets under `<slug>/assets/`, the diagram renderings under `_app/diagrams/`, and the shared script and stylesheet

#### Scenario: Build with errors
- **WHEN** a deck has an error
- **THEN** the build exits non-zero and prints the diagnostics

### Requirement: Portable static output

The built site SHALL use only relative URLs between its own files, so that it works when served from any sub-path (e.g. `https://example.org/~user/slides/`) by a plain static server, with no server-side configuration.

#### Scenario: Served from a sub-path
- **WHEN** the output folder's contents are copied to `/~user/slides/` on a static server
- **THEN** the index, every deck, its assets and the deep links work

### Requirement: Only referenced assets are published

The build SHALL copy into the output only the deck assets that slides reference, preserving their paths relative to the deck folder. Shared script and style files SHALL have content-hashed file names for cache busting.

#### Scenario: Unused asset
- **WHEN** `decks/http/assets/old.png` exists but no slide references it
- **THEN** it is not in `dist/http/assets/` and the check reports a warning

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

### Requirement: Fit check

`dex fit [slug...]` (in the engine repository: `pnpm check:fit`) SHALL build the site, open every slide in a headless browser at 1280×720 and 1024×768, and report as errors any slide whose content (the slide body or a code block) would need scrolling. It SHALL measure each slide with every step shown. It SHALL use the diagnostic format, with the slide's source line, and exit non-zero when anything overflows.

#### Scenario: Slide too long
- **WHEN** a slide holds thirty list items
- **THEN** the command reports `decks/<slug>/slides.md:<line> error [<id>] Content does not fit at 1280x720: ...` and exits non-zero

#### Scenario: Everything fits
- **WHEN** no slide overflows at either viewport
- **THEN** the command prints the number of slides checked and exits with status 0

#### Scenario: Overflow in the last step
- **WHEN** a slide only overflows once its last step is shown
- **THEN** the command reports that slide as not fitting

### Requirement: The dex command

The engine SHALL provide one command, `dex <init|new|dev|build|preview|check|fit|shot|docs|doctor> [options] [args...]`. It SHALL print usage with `--help`, and print usage and exit non-zero for a missing or unknown command. Inside the engine repository, the `pnpm` scripts (`dev`, `build`, `preview`, `check:decks`, `check:fit`) SHALL run the corresponding commands.

#### Scenario: Help
- **WHEN** the user runs `dex --help`
- **THEN** the commands (including `init`, `new`, `shot`, `docs` and `doctor`) and options are listed and the exit status is 0

#### Scenario: Unknown command
- **WHEN** the user runs `dex frobnicate`
- **THEN** an error and the usage are printed and the exit status is non-zero

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

### Requirement: Output folder

`build`, `preview` and `fit` SHALL use the output folder given by `--dist <dir>`, or `<content folder>/dist` by default. Relative `--folder` and `--dist` values SHALL resolve against the working directory. The build SHALL replace the output folder's previous contents.

#### Scenario: Default output
- **WHEN** the user runs `dex build` in `~/talks`
- **THEN** the site is written to `~/talks/dist`

#### Scenario: Separate output folder
- **WHEN** the user runs `dex build --folder ~/talks --dist ~/www/slides`
- **THEN** the site is written to `~/www/slides`

### Requirement: Content is not part of the engine repository

The engine repository SHALL NOT track deck sources or built sites: `decks/` and `dist/` at its root SHALL be ignored by git. The engine's automated tests SHALL depend only on committed fixtures.

#### Scenario: Fresh clone
- **WHEN** the repository has no `decks/` or `dist/` folder
- **THEN** `pnpm test` and `pnpm test:e2e` pass

### Requirement: Slide screenshots

`dex shot <slug> [id...]` SHALL build the site and save PNG images of the given slides, or of every slide of the deck, at 1280×720, in both light and dark mode, with every step shown, to `.dex/shots/<slug>/<id>-light.png` and `<id>-dark.png` in the content folder. It SHALL print the paths of the images it wrote, and exit non-zero, writing nothing, for an unknown deck or slide id or a deck with errors.

#### Scenario: One slide
- **WHEN** the user runs `dex shot http agent-loop`
- **THEN** `.dex/shots/http/agent-loop-light.png` and `.dex/shots/http/agent-loop-dark.png` exist and their paths are printed

#### Scenario: Whole deck
- **WHEN** the user runs `dex shot http`
- **THEN** a light and a dark image is saved for every slide of `http`

#### Scenario: Unknown slide
- **WHEN** the user runs `dex shot http nope`
- **THEN** the command reports that `nope` is not a slide of `http` and exits non-zero

#### Scenario: Slide with steps
- **WHEN** the user runs `dex shot http cors` and `cors` has steps
- **THEN** both images show every step of `cors`

### Requirement: Content folder configuration

A content folder MAY contain a `dex.yaml` file: a YAML mapping whose keys are `theme` (the folder's default theme) and `publishNotes` (whether builds publish the speaker notes of decks that don't decide for themselves). Invalid YAML, a value that is not a mapping, unknown keys and values of the wrong type SHALL be errors at `dex.yaml` that say which keys are allowed. Without `dex.yaml`, every setting SHALL take its default.

#### Scenario: Folder theme
- **WHEN** `dex.yaml` contains `theme: slate`
- **THEN** decks without their own `theme` and the index page use `slate`

#### Scenario: Unknown key
- **WHEN** `dex.yaml` contains `port: 8080`
- **THEN** the check reports an error at `dex.yaml` naming `port` and listing the allowed keys

#### Scenario: Notes setting
- **WHEN** `dex.yaml` contains `publishNotes: true`
- **THEN** builds publish the notes of every deck that doesn't set `publishNotes: false`

### Requirement: Live theme updates

While `dex dev` runs, editing a theme's `theme.css` SHALL update open pages without reloading them. Adding or removing a theme, or editing `dex.yaml` or a deck's `theme`, SHALL reload open pages, and an error SHALL show in the browser as other errors do.

#### Scenario: Edit a theme
- **WHEN** the dev server is running and the author edits `themes/ocean/theme.css`
- **THEN** pages of decks using `ocean` show the new colours without reloading

### Requirement: Doctor command

`dex doctor` SHALL report whether the tools each feature needs are present, without needing a content folder or any deck: Node.js 24 or later (every command), Chromium (`dex fit`, `dex shot`), and the TeX programs and files that diagrams load (rendering new diagrams). Each missing item SHALL say what it is needed for and how to install it, including the engine's Nix shell. The command SHALL exit with status 0 when everything is present and non-zero otherwise.

#### Scenario: Everything installed
- **WHEN** the user runs `dex doctor` with Node.js 24, Chromium and a complete TeX installation
- **THEN** each item is reported as found, with the path or version, and the exit status is 0

#### Scenario: Incomplete TeX
- **WHEN** `xelatex` and `dvisvgm` are installed but TeX can't find `FiraSans.sty`
- **THEN** the report says that `FiraSans.sty` (package `fira`) is missing and that rendering new diagrams needs it, shows how to install it, and the exit status is non-zero

#### Scenario: No Chromium
- **WHEN** no Chromium is found and `CHROMIUM_PATH` is not set
- **THEN** the report says that `dex fit` and `dex shot` need Chromium and how to provide it, and the other items are still checked

### Requirement: Speaker notes are private by default

`dex build` SHALL leave every deck's speaker notes out of the built site, unless they are published: by `dex build --publish-notes` (every deck, for that build), otherwise by the deck's front matter `publishNotes`, otherwise by `dex.yaml`'s `publishNotes`. `dex dev` SHALL always include the notes. `--publish-notes` SHALL be rejected by every command other than `build`.

#### Scenario: Default build
- **WHEN** a deck has notes and neither its front matter nor `dex.yaml` sets `publishNotes`, and the user runs `dex build`
- **THEN** no text of the notes appears anywhere in the built site

#### Scenario: Published by the deck
- **WHEN** a deck's front matter has `publishNotes: true` and the user runs `dex build`
- **THEN** its notes are in the built site and the presenter window shows them

#### Scenario: Private deck in a publishing folder
- **WHEN** `dex.yaml` has `publishNotes: true` and a deck's front matter has `publishNotes: false`
- **THEN** that deck's notes are left out of the build and other decks' notes are published

#### Scenario: Build flag
- **WHEN** the user runs `dex build --publish-notes`
- **THEN** every deck's notes are in the built site

#### Scenario: Dev server
- **WHEN** a deck has notes and no `publishNotes` setting, and the user opens it with `dex dev`
- **THEN** the presenter window shows the notes

### Requirement: Browser checks wait for images

`dex fit` and `dex shot` SHALL wait until every image of the deck page, diagrams included, has loaded before they measure or capture a slide.

#### Scenario: Diagram measured
- **WHEN** a slide's diagram makes its content too tall and the user runs `dex fit`
- **THEN** the slide is reported as not fitting

#### Scenario: Diagram captured
- **WHEN** the user runs `dex shot <slug> <id>` for a slide with a diagram
- **THEN** both images show the diagram, in the rendering of their mode
