import { App, FuzzySuggestModal, Notice } from "obsidian";
import { PDFDocument } from "pdf-lib-bundled";
import { loadPdf, extractPages, savePdf } from "../utils/pdf";
import { readVaultFile, saveToVault } from "../utils/files";
import { TextEntryModal } from "../modal/text-entry";

/** Cut / extract pages from a single PDF file. */
export function runCut(app: App, file?: { path: string } | null): void {
	// Guard against missing/invalid file argument (e.g. stale file-menu callback)
	if (!file || typeof file.path !== "string" || !file.path.trim()) {
		new Notice("No valid PDF file selected.");
		return;
	}

	promptForRanges(app, file.path);
}

function promptForRanges(app: App, filePath: string): void {
	loadPdfFromVault(app, filePath)
		.then((bytes) => loadPdf(bytes))
		.then((source) => {
			const totalPages = source.getPageCount();
			new TextEntryModal(
				app,
				"Enter page ranges (e.g. 1-3, 5, 8-10)",
				async (value) => {
					await extractPagesFrom(app, filePath, source, totalPages, value);
				}
			).open();
		})
		.catch((e) => new Notice(`Could not open file: ${(e as Error).message}`));
}

async function extractPagesFrom(
	app: App,
	filePath: string,
	source: PDFDocument,
	totalPages: number,
	rangeStr: string
): Promise<void> {
	let pages: number[];
	try {
		pages = parseRange(rangeStr, totalPages);
	} catch (e) {
		return void new Notice((e as Error).message);
	}

	if (pages.length === 0) return void new Notice("No valid pages selected.");

	try {
		const bytes = await loadPdfFromVault(app, filePath);
		const out = await savePdf(await extractPages(source, pages, totalPages));

		const file = app.vault.getAbstractFileByPath(filePath);
		const dir = file?.parent ? file.parent.path : "";
		const baseName = filePath.replace(/\.pdf$/i, "") + `-cut.pdf`;
		await saveToVault(app, `${dir}/${baseName}`, out);

		new Notice(`Extracted ${pages.length} page(s) to ${baseName}`);
	} catch (e) {
		void new Notice(`Extraction failed: ${(e as Error).message}`);
	}
}

async function loadPdfFromVault(app: App, filePath: string): Promise<ArrayBuffer> {
	return readVaultFile(app.vault, { path: filePath });
}

function parseRange(rangeStr: string, totalPages: number): number[] {
	const parts = rangeStr
		.split(",")
		.map((p) => p.trim())
		.filter(Boolean);
	const out: number[] = [];
	for (const part of parts) {
		if (/^\d+$/.test(part)) {
			const n = parseInt(part, 10);
			if (n < 1 || n > totalPages) throw new Error(`Page ${n} is out of range (1-${totalPages}).`);
			out.push(n);
		} else if (/^\d+\s*-\s*\d+$/.test(part)) {
			const [aStr, bStr] = part.split("-").map((n) => parseInt(n.trim(), 10));
			if (aStr > bStr) throw new Error(`Invalid range "${part}": start > end`);
			for (let n = aStr; n <= bStr; n++) {
				if (n < 1 || n > totalPages) throw new Error(`Page ${n} is out of range.`);
				out.push(n);
			}
		} else {
			throw new Error(`Invalid page specification: "${part}"`);
		}
	}
	return dedupe(out);
}

function dedupe(arr: number[]): number[] {
	const seen = new Set<number>();
	const out: number[] = [];
	for (const n of arr) if (!seen.has(n)) {
		seen.add(n);
		out.push(n);
	}
	return out;
}

/** Fuzzy picker for choosing a single PDF file. */
class FilePickerModal extends FuzzySuggestModal<string> {
	private onPick: (path: string) => void;

	constructor(app: App, onPick: (path: string) => void) {
		super(app);
		this.onPick = onPick;
		this.setPlaceholder("Search for a PDF file...");
	}

	getItems(): string[] {
		return this.app.vault.getFiles().filter((f) => f.extension === "pdf").map((f) => f.path);
	}

	getItemText(path: string): string {
		return path;
	}

	onChooseItem(path: string): void {
		this.onPick(path);
	}
}
