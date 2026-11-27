## MODIFIED Requirements

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
