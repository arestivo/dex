## MODIFIED Requirements

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
