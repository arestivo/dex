# Spec Delta

## ADDED Requirements

### Requirement: Diagrams documented

The `authoring` reference SHALL document diagrams:
- the `tikz` block syntax and `alt` text;
- the slide colour names and `\ifDexDark`;
- the folder and deck preambles and their order;
- the diagram cache and when TeX is needed;
- `dex shot`, for looking at the result.

It SHALL NOT prescribe diagram styles. Its `tikz` examples SHALL compile.

#### Scenario: Agent looks up diagrams
- **WHEN** an agent runs `dex docs`
- **THEN** the output has a section on diagrams naming the colours, the preamble files and `dex shot`

#### Scenario: Examples compile
- **WHEN** each `tikz` example in the authoring reference is rendered
- **THEN** none produces an error
