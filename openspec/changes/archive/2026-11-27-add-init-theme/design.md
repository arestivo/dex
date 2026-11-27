# Design

## Context

`dex init` builds a plan (`planScaffold` in `src/cli/scaffold.ts`): a list of create/update/unchanged/kept/skipped changes plus errors, applied only when there are no errors. Each change says whether it is Dex-managed; only managed paths feed the "instructions out of date" warning (`staleInstructions`). `dex.yaml` and the theme loader come from `add-themes` (`src/core/settings.ts`, `loadWorkspaceThemes` in `src/core/workspace.ts`).

## Goals / Non-Goals

**Goals:**
- A `dex.yaml` that is there from the start and explains itself.
- Setting the folder theme from `dex init`, with the same all-or-nothing behaviour as the rest of the plan.

**Non-Goals:**
- New settings keys. The starter file documents only what exists, so its comments never promise a setting the engine doesn't read. A future key (for example a default mode) adds its own commented line to the starter.
- Refreshing an existing `dex.yaml` when the starter changes: the file is the author's.
- Validating the rest of an existing `dex.yaml`: `dex check` already reports unknown keys.

## Decisions

- **The starter is a scaffold file.** `scaffold/dex.yaml` holds the text, with `theme: default` written out (not commented), so the file shows a working value. `dex init --theme <name>` writes the same text with that name. Alternative: a commented-out `# theme: default`. Rejected: an uncommented value is easier to edit and makes clear the setting is live.
- **Not managed.** The `dex.yaml` change has `managed: false`: an existing file is reported as unchanged and never restored, and a starter that later changes in the engine never triggers the out-of-date warning.
- **A planned change, not a separate step.** `planScaffold` takes an optional `theme` and adds a `dex.yaml` change (create, update or unchanged) or an error. An unknown theme or a broken `dex.yaml` then stops the whole run before anything is written. Alternative: write `dex.yaml` after the scaffold. Rejected: a bad name would leave a half-initialised folder.
- **Knowing the themes.** The plan receives the available theme names from the caller (`init.ts` loads them with `loadWorkspaceThemes`), so `scaffold.ts` stays testable without the engine's themes. The error lists the names, like the unknown-theme diagnostic in `dex check`.
- **Editing, not rewriting.** With `--theme`, an existing `dex.yaml` is parsed with the `yaml` package's `parseDocument` and changed with `doc.set('theme', name)`, so comments, key order and other keys survive. Invalid YAML or a non-mapping document is an error (`dex.yaml can't be read: …. Fix or delete it, then run dex init again.`).
- **Option guard.** `--theme` with any command other than `init` is an error, mirroring the `--deck` guard in `main.ts`, so it is never silently ignored.

## Risks / Trade-offs

- [Existing content folders get a new file on their next `dex init`] → it sets `default`, the theme they already use, so nothing looks different. The output lists it as created.
- [`--theme` replaces a theme the author chose by hand] → only when the user passes it, and the output reports `dex.yaml` as updated.
- [`yaml` may reformat parts of an existing file] → only the `theme` value changes in practice; a test checks that a comment and another key survive.
