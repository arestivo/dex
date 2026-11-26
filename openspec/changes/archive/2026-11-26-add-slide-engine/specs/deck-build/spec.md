# Spec Delta

## Purpose

Defines the commands that validate, preview and publish decks, the shape of the published output, and how problems are reported to authors and agents.

## ADDED Requirements

### Requirement: Check command

`pnpm check:decks [slug...]` SHALL validate all decks (or only the given decks) against the deck format and layouts without producing output. It SHALL exit with a non-zero status if any error is found. Warnings alone SHALL NOT fail the check.

#### Scenario: Clean decks
- **WHEN** all decks are valid
- **THEN** the command prints a summary and exits with status 0

#### Scenario: One error
- **WHEN** one slide references a missing image
- **THEN** the command prints the diagnostic and exits with a non-zero status

#### Scenario: Single deck
- **WHEN** the user runs `pnpm check:decks http`
- **THEN** only the `http` deck is validated

### Requirement: Diagnostic format

Each diagnostic SHALL state its severity, the file path, the line number where known, the slide id where known, and a message that says what is wrong and how to fix it. The format SHALL be `<file>:<line> <severity> [<slide-id>] <message>`, one diagnostic per line.

#### Scenario: Located diagnostic
- **WHEN** slide `headers`, starting at line 120 of `decks/http/slides.md`, uses an unknown layout
- **THEN** the output contains a line like `decks/http/slides.md:120 error [headers] Unknown layout "nope". Available: center, default, section, title, two-columns.`

### Requirement: Build command

`pnpm build` SHALL validate all decks and, if no errors are found, write a static site to `dist/`. It SHALL fail without writing a partial site when any deck has errors.

#### Scenario: Successful build
- **WHEN** the user runs `pnpm build` and all decks are valid
- **THEN** `dist/` contains `index.html`, one `<slug>/index.html` per deck, each deck's assets under `<slug>/assets/`, and the shared script and stylesheet

#### Scenario: Build with errors
- **WHEN** a deck has an error
- **THEN** the build exits non-zero and prints the diagnostics

### Requirement: Portable static output

The built site SHALL use only relative URLs between its own files, so that it works when served from any sub-path (e.g. `https://example.org/~user/slides/`) by a plain static server, with no server-side configuration.

#### Scenario: Served from a sub-path
- **WHEN** `dist/` is copied to `/~user/slides/` on a static server
- **THEN** the index, every deck, its assets and the deep links work

### Requirement: Only referenced assets are published

The build SHALL copy into the output only the deck assets that slides reference, preserving their paths relative to the deck folder. Shared script and style files SHALL have content-hashed file names for cache busting.

#### Scenario: Unused asset
- **WHEN** `decks/http/assets/old.png` exists but no slide references it
- **THEN** it is not in `dist/http/assets/` and the check reports a warning

### Requirement: Development server

`pnpm dev` SHALL serve the index and all decks locally. When a deck source, a layout template or a stylesheet changes, open pages SHALL update without a manual reload. Style changes SHALL apply without reloading the page. Diagnostics SHALL appear in the terminal and, for errors, in the browser in place of the deck.

#### Scenario: Edit a slide
- **WHEN** the dev server is running on `/http/#urn` and the author edits that slide's text
- **THEN** the page reloads on slide `urn` showing the new text

#### Scenario: Error while editing
- **WHEN** the author saves a deck with an unknown directive
- **THEN** the browser shows an error page listing the diagnostic, and the deck returns once the error is fixed and saved

### Requirement: Fit check

`pnpm check:fit [slug...]` SHALL build the site, open every slide in a headless browser at 1280×720 and 1024×768, and report as errors any slide whose content (the slide body or a code block) would need scrolling. It SHALL use the diagnostic format, with the slide's source line, and exit non-zero when anything overflows.

#### Scenario: Slide too long
- **WHEN** a slide holds thirty list items
- **THEN** the command reports `decks/<slug>/slides.md:<line> error [<id>] Content does not fit at 1280x720: ...` and exits non-zero

#### Scenario: Everything fits
- **WHEN** no slide overflows at either viewport
- **THEN** the command prints the number of slides checked and exits with status 0
