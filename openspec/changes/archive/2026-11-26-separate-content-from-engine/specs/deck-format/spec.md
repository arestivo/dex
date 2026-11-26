# Spec Delta

## MODIFIED Requirements

### Requirement: Deck folder

Each deck SHALL be a folder `decks/<slug>/` inside the content folder, containing a `slides.md` file. `<slug>` MUST match `^[a-z][a-z0-9-]*$`. Files the deck references (images, downloads) SHALL live under `decks/<slug>/assets/`.

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
