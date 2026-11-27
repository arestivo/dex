## MODIFIED Requirements

### Requirement: Readable colours

The check SHALL warn, naming the theme, the mode and the two tokens, when a theme's text and background pairs have a contrast ratio below 4.5:1 in either mode. The pairs SHALL be: text, muted text and links on the slide background; inverse text on the inverse background; each callout tone on its soft background; and search-match text on the match and current-match highlights.

#### Scenario: Low contrast in dark mode
- **WHEN** a theme's dark `--color-muted` is too close to its dark `--color-bg`
- **THEN** the check warns that muted text on the background is hard to read in dark mode, with the measured ratio

#### Scenario: Unreadable search highlight
- **WHEN** a theme sets `--color-search-current` to a colour too close to `--color-search-text`
- **THEN** the check warns that search matches are hard to read, naming the mode and the ratio
