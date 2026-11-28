## MODIFIED Requirements

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

## ADDED Requirements

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
