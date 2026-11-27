# Spec Delta

## MODIFIED Requirements

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
