# slide-layouts Specification

## Purpose
Lets authors add and customise slide layouts by adding a folder with an HTML template and a stylesheet, without changing engine code.

## Requirements

### Requirement: Layout folders

Each layout SHALL be a folder `layouts/<name>/` containing a `template.html` and, optionally, a `style.css`. `<name>` MUST match `^[a-z][a-z0-9-]*$`. Every such folder SHALL be available to slides as `layout=<name>` with no other registration.

#### Scenario: New layout
- **WHEN** an author creates `layouts/quote/template.html`
- **THEN** slides declaring `layout=quote` render with that template

#### Scenario: Unknown layout
- **WHEN** a slide declares `layout=nope` and `layouts/nope/` does not exist
- **THEN** the check reports an error listing the available layouts

#### Scenario: Default layout required
- **WHEN** `layouts/default/template.html` does not exist
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
