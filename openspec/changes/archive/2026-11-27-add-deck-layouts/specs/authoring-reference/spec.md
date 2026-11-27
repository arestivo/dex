## MODIFIED Requirements

### Requirement: Generated layouts reference

`dex docs layouts` SHALL list every layout available in the content folder (built-in and local), each with its origin, its `description`, its slots as declared by its template, and its usage notes from `layout.md`, and SHALL name the decks that have deck layouts. `dex docs layouts --deck <slug>` SHALL also list that deck's layouts, with origin `deck`. The engine's guide to making layouts SHALL follow the list. A layout without `layout.md` SHALL still be listed, marked as undocumented.

#### Scenario: Local layout listed
- **WHEN** the content folder has a local layout `quote` with a `layout.md`
- **THEN** `dex docs layouts` lists `quote` as local, with its description, its slots and its notes, next to the built-in layouts

#### Scenario: Slots come from the template
- **WHEN** a layout's template declares the slots `title`, default and `source`
- **THEN** those three slots are listed for it, whatever its `layout.md` says

#### Scenario: Undocumented layout
- **WHEN** a local layout has no `layout.md`
- **THEN** it is listed with its slots and marked as undocumented

#### Scenario: Deck layouts listed for their deck
- **WHEN** the `http` deck has a deck layout `request` and the user runs `dex docs layouts --deck http`
- **THEN** `request` is listed as a deck layout next to the built-in and local layouts

#### Scenario: Decks with their own layouts named
- **WHEN** the `http` deck has deck layouts and the user runs `dex docs layouts` without `--deck`
- **THEN** the deck layouts are not listed, and the output names `http` as having its own layouts and shows how to list them

#### Scenario: Unknown deck
- **WHEN** the user runs `dex docs layouts --deck nope` and there is no deck `nope`
- **THEN** the command says so and exits non-zero
