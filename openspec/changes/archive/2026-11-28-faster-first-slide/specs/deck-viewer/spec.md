## ADDED Requirements

### Requirement: Opening a deck lays out only the shown slide

While a deck page is hidden behind its loading indicator, no slide SHALL be laid out. Once the viewer is ready, only the slide it shows SHALL be. Without JavaScript, and when the fallback reveals the page because the script never ran, every slide SHALL be shown as a document, as before.

#### Scenario: Opening a long deck
- **WHEN** a deck with many slides opens with JavaScript enabled
- **THEN** no slide has a layout box until the viewer is ready, and then only the shown slide has one

#### Scenario: Script fails
- **WHEN** the page's script can't be loaded
- **THEN** after a few seconds every slide is shown as a document
