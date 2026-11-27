## MODIFIED Requirements

### Requirement: Missing toolchain

When a diagram is not cached, the check SHALL make sure TeX can render it: the programs `xelatex` and `dvisvgm`, and the TeX files every diagram loads (`standalone.cls`, `tikz.sty`, `pgfsys-dvisvgm.def`, `fontspec.sty`, `FiraSans.sty`, `FiraMono.sty`). If any is missing, it SHALL report an error at the block naming what is missing (files with their TeX Live package) and how to fix it. Cached diagrams SHALL NOT need TeX.

#### Scenario: No toolchain
- **WHEN** a deck has an uncached diagram and `xelatex` is not installed
- **THEN** the check reports an error saying that TeX (`xelatex`, `dvisvgm`) is needed to render new diagrams

#### Scenario: Incomplete TeX installation
- **WHEN** a deck has an uncached diagram, `xelatex` and `dvisvgm` are installed, and TeX can't find `standalone.cls` or `FiraSans.sty`
- **THEN** the check reports, without running TeX, an error naming both files and their packages (`standalone`, `fira`), saying to install them or to use the engine's Nix shell

#### Scenario: Everything cached
- **WHEN** every diagram of a deck is cached and TeX is not installed at all
- **THEN** the check reports no toolchain error

### Requirement: Diagram diagnostics

A diagram that fails to compile SHALL produce a check error with TeX's first error (not the "Emergency stop" after it); for a file TeX can't find, it SHALL say to install the package that provides it or use the engine's Nix shell. When TeX reports a line, the error SHALL point to it in its file: the block's line in `slides.md` (with the slide id), or the preamble's line. If TeX can't place the error within a file (e.g. an unclosed brace in a preamble), it SHALL name the file without a line.

#### Scenario: Error in a block
- **WHEN** line 3 of a `tikz` block refers to an undefined node
- **THEN** the check reports an error at that line of `slides.md`, with the slide id and TeX's message

#### Scenario: Error in a preamble
- **WHEN** line 12 of `tikz/preamble.tex` uses an undefined macro
- **THEN** the check reports an error at `tikz/preamble.tex:12` for the diagrams that use it

#### Scenario: Unlocated error in a preamble
- **WHEN** `tikz/preamble.tex` leaves a brace open until its end
- **THEN** the check reports an error naming `tikz/preamble.tex` without a line

#### Scenario: Package missing from a preamble
- **WHEN** `tikz/preamble.tex` loads `\usepackage{pgfplots}` and TeX can't find `pgfplots.sty`
- **THEN** the check reports that TeX can't find `pgfplots.sty`, with the install hint, and not "Emergency stop"
