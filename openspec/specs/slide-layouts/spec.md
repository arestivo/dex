# slide-layouts Specification

## Purpose
Lets authors add and customise slide layouts by adding a folder with an HTML template and a stylesheet, without changing engine code.

## Requirements

### Requirement: Layout folders

Layouts SHALL come from two places: the engine's `layouts/<name>/` (built-in layouts) and the content folder's `layouts/<name>/` (local layouts). Each layout folder SHALL contain a `template.html` and, optionally, a `style.css`. `<name>` MUST match `^[a-z][a-z0-9-]*$`. Every such folder SHALL be available to all slides in that content folder as `layout=<name>` with no other registration.

#### Scenario: New layout
- **WHEN** an author creates `layouts/quote/template.html` in the content folder
- **THEN** slides in that folder's decks declaring `layout=quote` render with that template

#### Scenario: Local layouts stay local
- **WHEN** content folder A has a local layout `quote` and content folder B does not
- **THEN** a slide in B declaring `layout=quote` is reported as using an unknown layout

#### Scenario: Unknown layout
- **WHEN** a slide declares `layout=nope` and no built-in or local layout `nope` exists
- **THEN** the check reports an error listing the available layouts, built-in and local

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

`dex new layout <name>` SHALL create `layouts/<name>/` in the content folder with a starter `template.html` (title and default slots), a `style.css` showing how to style the slide with design tokens, and a `layout.md` with a description placeholder and sections for usage notes. It SHALL refuse invalid names, built-in names and existing local layouts without writing anything. A deck using the new layout SHALL pass `dex check` apart from the description-placeholder warning.

#### Scenario: Create a layout
- **WHEN** the user runs `dex new layout quote` in a content folder
- **THEN** `layouts/quote/template.html`, `style.css` and `layout.md` exist and `layout=quote` is usable

#### Scenario: Name taken
- **WHEN** the user runs `dex new layout title` or `dex new layout quote` when `layouts/quote/` exists
- **THEN** the command explains why and exits non-zero, writing nothing
