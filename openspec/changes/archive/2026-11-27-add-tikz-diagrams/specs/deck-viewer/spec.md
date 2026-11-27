# Spec Delta

## ADDED Requirements

### Requirement: Bundled typeface

Slides SHALL use the typeface bundled with Dex (Fira Sans for text, Fira Mono for code) regardless of the fonts installed on the reader's device, and diagrams SHALL be typeset in the same typeface by default.

#### Scenario: No local fonts
- **WHEN** a deck is opened on a device without Fira Sans installed
- **THEN** slide text renders in Fira Sans, loaded from the built site

#### Scenario: Diagram labels match
- **WHEN** a slide shows a diagram next to body text
- **THEN** the diagram's labels and the body text are set in the same typeface
