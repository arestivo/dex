# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
