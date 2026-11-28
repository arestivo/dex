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

`slides.md` SHALL start with a YAML front matter block delimited by `---` lines. `title` is required. `subtitle`, `author` (with `name` and optional `url`), `lang` (BCP 47, default `en`), `description`, `theme` (the name of a colour theme, see deck-themes) and `publishNotes` (a boolean, see deck-build) are optional. Any other key SHALL be an error.

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

#### Scenario: Notes setting
- **WHEN** the front matter contains `publishNotes: yes please`
- **THEN** the check reports that `publishNotes` must be `true` or `false`

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

### Requirement: Speaker notes

A slide MAY contain one `:::notes` container directive at its top level, holding Markdown: the speaker notes for that slide. Notes SHALL NOT be shown on the slide, in the document view, in print or by the search; the presenter window shows them. A second `:::notes` in a slide, or a `:::notes` nested inside another block, SHALL be an error.

#### Scenario: Notes on a slide
- **WHEN** a slide contains `:::notes` with "Ask who has used curl" and a closing `:::`
- **THEN** the slide shows none of that text, and the presenter window shows it for that slide

#### Scenario: Two notes blocks
- **WHEN** a slide contains two `:::notes` blocks
- **THEN** the check reports an error at the second one, saying a slide has at most one

#### Scenario: Nested notes
- **WHEN** a `:::notes` block is inside a `:::info` callout
- **THEN** the check reports an error saying notes go at the slide's top level

### Requirement: Step directives

A slide MAY mark parts of its content as steps, revealed one at a time while presenting: `:::step` around blocks, `:step[text]` around inline content, and `:::steps` around a list, which makes each of the list's items a step (an item's nested list belongs to its step). Steps SHALL be numbered in the order they appear in the slide's source, whatever slot or block holds them. Steps MAY be inside other blocks, such as callouts and wrappers.

#### Scenario: Block and inline steps
- **WHEN** a slide contains a paragraph, then `:::step` around a code block, then a paragraph with `:step[the answer]`
- **THEN** the code block is step 1, "the answer" is step 2, and the first paragraph is not a step

#### Scenario: A list of steps
- **WHEN** a slide contains `:::steps` around a list of three items, the second with a nested list
- **THEN** the slide has three steps, one per item, and the nested list belongs to the second

#### Scenario: Steps in slots
- **WHEN** a two-column slide has a step in its left slot and then a step in its right slot
- **THEN** the left one is step 1 and the right one step 2, in source order

#### Scenario: Step in a callout
- **WHEN** a `:::info` callout holds a `:::step` block
- **THEN** that block is a step of the slide

### Requirement: Misplaced steps are errors

A step inside another step, a step in speaker notes, and a `:::steps` block that doesn't hold exactly one list (and nothing else) SHALL be check errors that say how to fix them. A step directive SHALL NOT take attributes.

#### Scenario: Nested step
- **WHEN** a `:::step` block contains `:step[more]`
- **THEN** the check reports an error at the inner step saying steps can't be nested

#### Scenario: Step in notes
- **WHEN** a `:::notes` block contains a `:::step` block
- **THEN** the check reports an error saying steps don't work in speaker notes

#### Scenario: Steps without a list
- **WHEN** a `:::steps` block holds a paragraph
- **THEN** the check reports an error saying `:::steps` wraps one list, and to use `:::step` for other content

#### Scenario: Attributes on a step
- **WHEN** a slide contains `:::step{.small}`
- **THEN** the check reports an error saying steps take no attributes and to put a `:::div{.small}` inside the step

### Requirement: Live demos

A `:::demo` container directive SHALL hold one `html` code block and at most one `css` code block, in either order. The slide SHALL show those code blocks as usual, followed by the rendered result of that HTML styled by that CSS, built from the same code. The result SHALL be isolated: the demo's CSS SHALL NOT style anything outside the result, and the slide's CSS SHALL NOT style the result, apart from inherited properties.

#### Scenario: Code and result from one source
- **WHEN** a slide contains a `:::demo` with a `css` block `p { color: green; }` and an `html` block `<p>Fox</p>`
- **THEN** the slide shows both code blocks, followed by a result in which "Fox" is green

#### Scenario: Demo CSS stays in the demo
- **WHEN** a demo's CSS is `p { color: green; }` and the slide also has a paragraph outside the demo
- **THEN** the slide's paragraph keeps the slide's text colour

#### Scenario: Slide CSS stays out
- **WHEN** a layout styles `p` with a margin and a demo's HTML contains a `<p>`
- **THEN** the demo's paragraph does not get the layout's margin

#### Scenario: HTML only
- **WHEN** a `:::demo` holds only an `html` block
- **THEN** the slide shows the code and its unstyled result

### Requirement: Demo result placement

A slide with exactly one `:::demo` MAY contain one `::demo-result` line anywhere in its content, including in another slot or inside a `:::step`. The demo's result SHALL then be rendered there instead of after the code.

#### Scenario: Result in another slot
- **WHEN** a slide has a `:::demo` in its default slot and `::demo-result` in its `result` slot
- **THEN** the code shows in the default slot and the result in the `result` slot

#### Scenario: Result revealed as a step
- **WHEN** `::demo-result` is inside a `:::step`
- **THEN** the result appears when that step is revealed

### Requirement: Misplaced demos are errors

`dex check` SHALL report an error, saying how to fix it, for:
- a `:::demo` without an `html` block, or with more than one `html` or `css` block;
- a `:::demo` holding anything other than those code blocks;
- a `:::demo` inside another demo or in speaker notes;
- a `::demo-result` on a slide that doesn't have exactly one `:::demo`, or a second `::demo-result` on a slide.

#### Scenario: Missing HTML
- **WHEN** a `:::demo` holds only a `css` block
- **THEN** the check reports an error saying a demo needs an `html` block

#### Scenario: Extra content
- **WHEN** a `:::demo` holds a paragraph besides its code blocks
- **THEN** the check reports an error saying to move the text out of the demo

#### Scenario: Result without a demo
- **WHEN** a slide has `::demo-result` and no `:::demo`
- **THEN** the check reports an error saying `::demo-result` places the result of the slide's one demo

#### Scenario: Two demos, one result
- **WHEN** a slide has two `:::demo` blocks and one `::demo-result`
- **THEN** the check reports an error saying `::demo-result` only works on a slide with one demo
