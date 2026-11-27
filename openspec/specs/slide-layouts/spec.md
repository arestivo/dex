# slide-layouts Specification

## Purpose
Lets authors add and customise slide layouts by adding a folder with an HTML template and a stylesheet, without changing engine code.

## Requirements

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

### Requirement: Template slots

A template SHALL mark insertion points with `<slot></slot>` (the default slot) and `<slot name="x"></slot>` (named slots). Each slot element SHALL be replaced by the slide content assigned to it. A slot with no assigned content SHALL render its own children as fallback, or nothing.

#### Scenario: Default slot
- **WHEN** the template is `<div class="body"><slot></slot></div>`
- **THEN** the slide's content renders inside `div.body`

#### Scenario: Fallback content
- **WHEN** the template has `<slot name="footer">© Example</slot>` and the slide provides no `footer` content
- **THEN** "© Example" renders in place of the slot

### Requirement: Assigning content to named slots

Inside a slide, a leaf directive `::slot{name=x}` SHALL start content for slot `x`. That content runs until the next `::slot` directive or the end of the slide. Content before the first `::slot` directive SHALL go to the default slot. Assigning content to a slot the layout does not declare SHALL be a check error.

#### Scenario: Two columns
- **WHEN** a slide with `layout=two-columns` contains `::slot{name=left}` followed by a list and `::slot{name=right}` followed by an image
- **THEN** the list renders in the template's `left` slot and the image in its `right` slot

#### Scenario: Undeclared slot
- **WHEN** a slide with the `default` layout contains `::slot{name=left}`
- **THEN** the check reports an error naming the slot and the layout

### Requirement: Automatic title slot

When a layout declares a slot named `title` and the slide does not explicitly assign one, the slide's leading heading (a heading that is the first content of the default slot) SHALL be moved into the `title` slot.

#### Scenario: Heading moves to title
- **WHEN** a slide's content begins with `# Headers` and its layout declares `<slot name="title">`
- **THEN** the heading renders in the title slot and not in the default slot

#### Scenario: Layout without title slot
- **WHEN** the layout declares no `title` slot
- **THEN** the leading heading stays in the default slot

### Requirement: Template variables

Templates MAY reference deck and slide values with `{{name}}` in text and attribute values. The available names are `deck.title`, `deck.subtitle`, `deck.author.name`, `deck.author.url`, `deck.lang`, `slide.id`, `slide.number` and `slide.total`. Values SHALL be HTML-escaped. Missing optional values SHALL render as empty text. Unknown names SHALL be a build error.

#### Scenario: Author in a title layout
- **WHEN** a template contains `{{deck.author.name}}` and the deck's author is "Ana Silva"
- **THEN** the rendered slide shows "Ana Silva"

#### Scenario: Unknown variable
- **WHEN** a template contains `{{deck.color}}`
- **THEN** the build reports an error naming the template and the variable

### Requirement: Scoped layout styles

A layout's `style.css` SHALL apply only to slides that use that layout. The engine SHALL make the slide element addressable in that stylesheet as `:scope`. Layout styles SHALL take precedence over global component styles and SHALL be overridable by utility classes.

#### Scenario: Style isolation
- **WHEN** `layouts/section/style.css` contains `h1 { font-size: 3em }`
- **THEN** `h1` elements on slides using other layouts are not affected

#### Scenario: Unsupported at-rules
- **WHEN** a layout's `style.css` contains `@import` or `@layer`
- **THEN** the check reports an error for that stylesheet

#### Scenario: Styling the slide itself
- **WHEN** `layouts/section/style.css` contains `:scope { background: var(--color-accent) }`
- **THEN** every section slide gets the accent background

### Requirement: Built-in layouts

The project SHALL ship the layouts `default` (title and body), `title` (deck opening slide), `section` (chapter divider), `center` (centred content) and `two-columns` (slots `left` and `right`).

#### Scenario: Built-in layouts available
- **WHEN** the check runs on a fresh checkout
- **THEN** all five built-in layouts are available

### Requirement: Local layouts cannot replace built-in layouts

A local layout whose name matches a built-in layout SHALL be an error reported at the local layout's template. The built-in layout SHALL be used.

#### Scenario: Name collision
- **WHEN** the content folder contains `layouts/default/template.html`
- **THEN** the check reports an error saying `default` is a built-in layout and a local layout needs another name

### Requirement: Layout usage notes

A layout folder MAY contain a `layout.md`: YAML front matter with a one-line `description`, then Markdown usage notes (when to use the layout, how to fill its slots, an example slide). The check SHALL warn when a layout has no `layout.md`, or when its `description` is missing or empty. Every built-in layout SHALL have a `layout.md` with a description.

#### Scenario: Missing notes
- **WHEN** a local layout has `template.html` but no `layout.md`
- **THEN** the check reports a warning for that layout and the layout still works

#### Scenario: Built-in layouts documented
- **WHEN** the check runs on a folder with no local layouts
- **THEN** no layout usage-notes warning is reported

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
