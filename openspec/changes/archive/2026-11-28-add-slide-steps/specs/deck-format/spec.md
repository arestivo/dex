## ADDED Requirements

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
