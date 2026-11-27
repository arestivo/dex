# deck-format Specification

## Purpose
Defines the source format authors (human or agent) use to write a slide deck: how a deck is laid out on disk, how slides are separated and identified, and which content constructs are available.

## Requirements

### Requirement: Deck folder

Each deck SHALL be a folder `decks/<slug>/` inside the content folder, containing a `slides.md` file. `<slug>` MUST match `^[a-z][a-z0-9-]*$`. Files the deck references (images, downloads) SHALL live under `decks/<slug>/assets/`. Layouts only that deck uses MAY live under `decks/<slug>/layouts/` (see slide-layouts).

#### Scenario: Valid deck folder
- **WHEN** the content folder contains `decks/http/slides.md`
- **THEN** the system recognises a deck with slug `http`

#### Scenario: Invalid slug
- **WHEN** a folder `decks/HTTP Basics/` contains `slides.md`
- **THEN** the check reports an error naming the folder and the allowed slug pattern

#### Scenario: Folder without slides
- **WHEN** a folder under `decks/` has no `slides.md`
- **THEN** it is ignored and is not a deck

#### Scenario: No decks folder
- **WHEN** the content folder has no `decks/` folder
- **THEN** the check reports an error saying where it looked and how to select another content folder

#### Scenario: Deck layouts are not assets
- **WHEN** a deck has `decks/http/layouts/request/`
- **THEN** its files are not reported as unused assets and are not copied to the output as deck files

### Requirement: Deck front matter

`slides.md` SHALL start with a YAML front matter block delimited by `---` lines. `title` is required. `subtitle`, `author` (with `name` and optional `url`), `lang` (BCP 47, default `en`), `description` and `theme` (the name of a colour theme, see deck-themes) are optional. Any other key SHALL be an error.

#### Scenario: Minimal front matter
- **WHEN** the front matter contains only `title: HTTP`
- **THEN** the deck is valid with language `en`

#### Scenario: Missing title
- **WHEN** the front matter has no `title`
- **THEN** the check reports an error at the front matter

#### Scenario: Unknown key
- **WHEN** the front matter contains `colours: blue`
- **THEN** the check reports an error naming the unknown key `colours`

#### Scenario: Theme
- **WHEN** the front matter contains `theme: forest`
- **THEN** the deck is valid and uses the `forest` theme

### Requirement: Slide separation

After the front matter, slides SHALL be separated by lines consisting only of `---`. Such lines inside fenced code blocks SHALL NOT separate slides.

#### Scenario: Three slides
- **WHEN** the body contains two separator lines between three blocks of content
- **THEN** the deck has three slides in source order

#### Scenario: Separator inside code
- **WHEN** a fenced code block contains a line `---`
- **THEN** the code block stays intact within a single slide

### Requirement: Slide declaration

Every slide SHALL begin with a `::slide{...}` directive as its first non-blank line. The directive SHALL declare the slide id (`#id`). It MAY declare `layout=<name>` (default `default`) and extra CSS classes (`.class`). Any other attribute SHALL be an error.

#### Scenario: Full declaration
- **WHEN** a slide begins with `::slide{#status-codes layout=section .dense}`
- **THEN** the slide has id `status-codes`, layout `section` and the extra class `dense`

#### Scenario: Missing declaration
- **WHEN** a slide's first non-blank line is `# Title`
- **THEN** the check reports an error with the slide number and source line

#### Scenario: Unknown attribute
- **WHEN** a slide declares `::slide{#a color=red}`
- **THEN** the check reports an error naming the attribute `color`

### Requirement: Stable slide identity

A slide id MUST match `^[a-z][a-z0-9-]*$` and MUST be unique within its deck. The id is the slide's permanent identity: it SHALL be used for deep links and SHALL NOT depend on the slide's position or content.

#### Scenario: Duplicate id
- **WHEN** two slides in the same deck declare `#headers`
- **THEN** the check reports an error at both source lines

#### Scenario: Invalid id
- **WHEN** a slide declares `#12` or `#Status_Codes`
- **THEN** the check reports an error stating the id pattern

#### Scenario: Reordering keeps identity
- **WHEN** a slide is moved to another position
- **THEN** its id and therefore its deep link are unchanged

### Requirement: Markdown content

Slide content SHALL be CommonMark with GitHub Flavored Markdown extensions (tables, strikethrough, task lists, autolinks). Inline and block HTML SHALL be allowed. Fenced code blocks tagged with a diagram language (`tikz`) SHALL render as diagrams. Other fenced code blocks with a language SHALL be syntax-highlighted at build time, and unknown languages SHALL render as plain code without failing the build.

#### Scenario: Highlighted code
- **WHEN** a slide contains a fenced block tagged `php`
- **THEN** the output contains highlighted markup that works in both light and dark themes

#### Scenario: Diagram block
- **WHEN** a slide contains a fenced block tagged `tikz`
- **THEN** it renders as a diagram figure, not as code, and no unknown-language warning is reported

#### Scenario: Unknown language
- **WHEN** a fenced block is tagged `foobar`
- **THEN** the block renders as plain preformatted code and the check reports a warning

### Requirement: Callout directives

Container directives `:::info`, `:::warning`, `:::error`, `:::success` and `:::example` SHALL render their Markdown content as a visually distinct callout of that tone. An optional label (`:::warning[Careful]`) SHALL render as the callout title.

#### Scenario: Info callout
- **WHEN** a slide contains `:::info` … `:::`
- **THEN** the content renders inside a callout with the `info` tone

#### Scenario: Labelled callout
- **WHEN** a slide contains `:::warning[Careful]`
- **THEN** the callout shows the title "Careful"

### Requirement: Generic wrapper directives

The container directive `:::div{.a .b}` and the text directive `:span[text]{.a}` SHALL wrap content in an element with the given classes. They SHALL require at least one class and accept no other attributes. They are the escape hatch for styling such as `.small`, `.smaller`, `.center` or `.columns`.

#### Scenario: Block wrapper
- **WHEN** a slide contains `:::div{.smaller}` around a code block
- **THEN** the code block renders inside an element with class `smaller`

#### Scenario: Inline wrapper
- **WHEN** a paragraph contains `:span[GET]{.badge}`
- **THEN** "GET" renders inside an inline element with class `badge`

### Requirement: Table of contents directive

The leaf directive `::toc` SHALL render an ordered list linking to every slide with layout `section`, in deck order, except the slide that contains the `::toc` itself. Each entry uses the section's first heading as its text.

#### Scenario: Index slide
- **WHEN** a deck has section slides "Introduction" and "Headers", and another slide contains `::toc`
- **THEN** that slide shows a list with links to `#<introduction-id>` and `#<headers-id>`

#### Scenario: Index slide is itself a section
- **WHEN** the slide containing `::toc` has layout `section`
- **THEN** it is not listed in its own table of contents

### Requirement: Unknown directives are errors

Any directive name not defined by this format SHALL produce a check error. It SHALL NOT be silently dropped. Exception: a bare text directive (`:name` with no label and no attributes) SHALL be kept as literal text, because it occurs naturally in prose such as `domain:port`.

#### Scenario: Typo in directive
- **WHEN** a slide contains `:::infoo`
- **THEN** the check reports an error naming `infoo` with the source line

#### Scenario: Colon in prose
- **WHEN** a paragraph contains `scheme://domain:port/path`
- **THEN** it renders unchanged and no diagnostic is reported

### Requirement: Asset references

Relative URLs in Markdown images, links and HTML `src`/`href` attributes SHALL resolve against the deck folder. A relative reference to a file that does not exist SHALL be a check error.

#### Scenario: Existing image
- **WHEN** a slide contains `![](assets/request.svg)` and `decks/http/assets/request.svg` exists
- **THEN** the image renders in the built deck

#### Scenario: Missing image
- **WHEN** a slide references `assets/missing.png` that does not exist
- **THEN** the check reports an error with the slide id and the missing path

### Requirement: Internal slide links

A link whose URL is `#<id>` SHALL navigate to the slide with that id. A link to an id that does not exist in the deck SHALL be a check error.

#### Scenario: Valid internal link
- **WHEN** a slide links to `#headers` and a slide with id `headers` exists
- **THEN** activating the link shows that slide

#### Scenario: Broken internal link
- **WHEN** a slide links to `#nope` and no such slide exists
- **THEN** the check reports an error
