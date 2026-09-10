# obsidian-pdf

An Obsidian plugin for working with PDF files directly inside your vault, built on the same client-side approach as [`pdf-studio`](../pdf-studio) (bundled [pdf-lib](https://pdf.js.org/), no server).

## Features

- **Merge** — combine multiple PDFs into one.
- **Cut / Extract pages** — pull specific page ranges out of a vault PDF into a new file.

Both work entirely in the browser/Vault; files never leave your device.

## Commands

| Command | ID | Description |
| ------- | ---- | ----------- |
| PDF Merge | `pdf-merge` | Pick one or more PDFs from fuzzy search and merge them into a single new PDF saved next to the first selected file. |
| PDF Cut | `pdf-cut` | Choose a PDF (or run it on the active file), enter page ranges like `1-3, 5, 8-10`, and save the extracted pages as `<name>-cut.pdf` beside the original. |

## Install into a vault

The plugin ships as two files in the plugin folder:

```
.obsidian/plugins/obsidian-pdf/
├── main.js          # bundled code (compiled from TypeScript)
└── manifest.json    # plugin metadata
```

To build and install directly into your Obsidian vault, run:

```bash
npm run install --vault=/path/to/your/vault   # defaults to ~/.obsidian if omitted
```

This compiles `main.js` with esbuild (production bundle of pdf-lib + the plugin), creates the plugin folder, and copies `main.js` and `manifest.json` into it. Then restart Obsidian or toggle the plugin in **Settings → Community plugins** to load it.

## Merge picker behaviour

When you right-click a PDF → **PDF Studio: Merge with this PDF**, a modal lists every other PDF in the same folder plus the reference file (the one you clicked on):

- The **reference file is always shown first** and pre-selected, with no checkbox.
- Every non-reference row has a **checkbox**; uncheck to exclude it from the merge.
- Each row also has an optional **page-range input**. Leave it empty for "all pages", or type `1-3, 5, 8-10` (source page numbers) to extract only those pages before merging. The reference file gets its own range input too.
- Rows are **draggable** by the ⠿ handle to reorder output; drag works live and applies on drop.
- Clicking **Merge (N)** passes only the checked files in their current order, along with each file's page ranges.

## Merge bugs fixed

These were resolved iteratively — kept here for anyone debugging the same symptoms:

- **Checkboxes ignored / every PDF always merged.** The merge button originally passed `this.order` directly to the builder, so unchecked files still ended up in the output (and any prior `*-merged.pdf` sitting in the folder got re-merged, doubling page counts). Now only paths in the checkbox `selected` set are included (`FilePickerModal.renderList`, Merge handler), and `*.pdf` names ending in `-merged.pdf` are excluded from the list so outputs can never be re-merged.
- **Reference PDF missing from the folder list.** The reference was being spliced out of the filtered list but never put back, so it disappeared entirely. It is now removed then unshifted to guarantee it shows first (`FilePickerModal` constructor).
- **Reference row had no visible name.** The reference branch rendered only a drag handle and an "— included" label; added the filename span so it's readable in the list.
- **Drag-and-drop didn't reorder / reference not pinned first.** Reorder now reorders live via `getDragAfterElement` and reads DOM order on drop (`reorderFromDom`); the reference is never a drag target (skipped in `getDragAfterElement`) and is always unshifted back to the front.
- **Folder filter excluded all files ("No PDF files found").** Folder was derived from each file's own path via `normalizeFolder()` rather than comparing parent references, which broke on Windows path separators.

## Architecture

- `main.ts` — plugin entrypoint; registers the two commands and adds a right-click file-menu action for PDFs.
- `commands/merge.ts`, `commands/cut.ts` — command UI (fuzzy picker, page-range modal).
- `utils/pdf.ts` — pdf-lib wrappers: range parsing, merge, extract.
- `utils/files.ts` — read/write binary files in the vault.
- `modal/text-entry.ts` — reusable text-entry modal for page ranges.
