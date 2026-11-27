## Purpose

Lets each deck use a named colour theme, built into Dex or defined in the content folder, that sets the slide colours for both light and dark modes, and keeps themes checkable so the result stays readable.

## ADDED Requirements

### Requirement: Theme folders

Themes SHALL come from the engine's `themes/<name>/` (built-in themes) and the content folder's `themes/<name>/` (local themes). Each theme folder SHALL contain a `theme.css` and MAY contain a `theme.md` with a one-line `description` in its front matter and usage notes. `<name>` MUST match `^[a-z][a-z0-9-]*$`. A missing or empty `description` SHALL be a warning.

#### Scenario: Local theme
- **WHEN** a content folder has `themes/ocean/theme.css`
- **THEN** its decks can use `theme: ocean`

#### Scenario: Local themes stay local
- **WHEN** content folder A has a local theme `ocean` and content folder B does not
- **THEN** a deck in B declaring `theme: ocean` is reported as using an unknown theme

#### Scenario: Undocumented theme
- **WHEN** a local theme has no `theme.md`
- **THEN** the check reports a warning and the theme still works

### Requirement: Built-in themes

The engine SHALL ship a `default` theme with the colours Dex uses without a theme, and at least four other themes. Every built-in theme SHALL have a `theme.md` with a description and SHALL pass the theme checks, including the contrast check, with no warnings.

#### Scenario: Built-in themes are clean
- **WHEN** the check runs on a folder with no local themes
- **THEN** no theme diagnostic is reported

### Requirement: Local themes cannot replace built-in themes

A local theme whose name matches a built-in theme SHALL be an error reported at the local theme's `theme.css`, and the built-in theme SHALL be used.

#### Scenario: Name collision
- **WHEN** the content folder contains `themes/default/theme.css`
- **THEN** the check reports an error saying `default` is a built-in theme and the local theme needs another name

### Requirement: Themes only set colours

A `theme.css` SHALL contain one `:root` rule whose declarations each set one of the engine's colour tokens (the `--color-*`, `--tone-*` and `--code-*` tokens of the default colours) to `light-dark(<light>, <dark>)` or to one colour used in both modes, each colour a hex `#rrggbb` or `#rgb`. Anything else SHALL be an error at its line. Tokens a theme does not set SHALL keep the `default` values.

#### Scenario: Non-colour token
- **WHEN** a theme sets `--space-2: 1em`
- **THEN** the check reports an error saying themes can only set colour tokens, listing where to see them

#### Scenario: Unreadable value
- **WHEN** a theme sets `--color-accent: rebeccapurple`
- **THEN** the check reports an error asking for `light-dark(#rrggbb, #rrggbb)` or one hex colour

#### Scenario: Partial theme
- **WHEN** a theme sets only `--color-accent`
- **THEN** slides using it get that accent and the default values of every other colour

### Requirement: Readable colours

The check SHALL warn, naming the theme, the mode and the two tokens, when a theme's text and background pairs have a contrast ratio below 4.5:1 in either mode. The pairs SHALL be: text, muted text and links on the slide background; inverse text on the inverse background; and each callout tone on its soft background.

#### Scenario: Low contrast in dark mode
- **WHEN** a theme's dark `--color-muted` is too close to its dark `--color-bg`
- **THEN** the check warns that muted text on the background is hard to read in dark mode, with the measured ratio

### Requirement: Choosing a theme

A deck SHALL use the theme named by its front matter `theme`, otherwise the theme named by the content folder's `dex.yaml`, otherwise `default`. An unknown theme name SHALL be an error, at the front matter or at `dex.yaml`, that lists the available themes. The site index page SHALL use the theme from `dex.yaml`, or `default`.

#### Scenario: Deck theme
- **WHEN** `dex.yaml` says `theme: slate` and a deck's front matter says `theme: forest`
- **THEN** that deck uses `forest` and the other decks and the index use `slate`

#### Scenario: Unknown theme
- **WHEN** a deck's front matter says `theme: nope`
- **THEN** the check reports an error at the front matter listing the built-in and local themes

### Requirement: Themes apply in every mode and view

A deck's theme SHALL set the slide colours in light and dark mode, in the viewer, in the no-JavaScript document and in print (which uses the light values). Layouts, components and diagrams SHALL take their colours from the theme without changes of their own.

#### Scenario: Toggling mode
- **WHEN** a deck using `forest` is shown and the reader toggles to dark mode
- **THEN** the slides show `forest`'s dark values

#### Scenario: Layouts follow the theme
- **WHEN** a local layout's `style.css` uses `var(--color-accent)`
- **THEN** slides with that layout show the accent of their deck's theme

### Requirement: Scaffold a theme

`dex new theme <name>` SHALL create `themes/<name>/` in the content folder with a `theme.css` that sets every colour token to its `default` value, for editing, and a `theme.md` with a description placeholder and sections for usage notes. It SHALL refuse invalid names, built-in names and existing local themes without writing anything.

#### Scenario: Create a theme
- **WHEN** the user runs `dex new theme ocean`
- **THEN** `themes/ocean/theme.css` and `theme.md` exist, and a deck with `theme: ocean` passes `dex check` apart from the description-placeholder warning

#### Scenario: Name taken
- **WHEN** the user runs `dex new theme default`
- **THEN** the command explains that `default` is a built-in theme and exits non-zero, writing nothing
