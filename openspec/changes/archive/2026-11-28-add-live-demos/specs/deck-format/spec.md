## ADDED Requirements

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
