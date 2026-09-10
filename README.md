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

## Development

```bash
npm install      # installs obsidian types + esbuild
npm run dev      # build in development mode (with sourcemaps)
npm run build    # production build -> main.js
```

The compiled `main.js` is what Obsidian loads. Copy it into your vault's `.obsidian/plugins/obsidian-pdf/` folder along with `manifest.json`.

## Architecture

- `main.ts` — plugin entrypoint; registers the two commands and adds a right-click file-menu action for PDFs.
- `commands/merge.ts`, `commands/cut.ts` — command UI (fuzzy picker, page-range modal).
- `utils/pdf.ts` — pdf-lib wrappers: range parsing, merge, extract.
- `utils/files.ts` — read/write binary files in the vault.
- `modal/text-entry.ts` — reusable text-entry modal for page ranges.
