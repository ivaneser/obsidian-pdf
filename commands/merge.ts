import { App, Notice, TFile } from "obsidian";
import { PDFDocument } from "pdf-lib-bundled";
import { loadPdf, savePdf } from "../utils/pdf";
import { readBinary, saveToVault } from "../utils/files";
import { FilePickerModal, MergeSelection } from "../modal/file-picker";

/** Parse a page-range string like "1-3, 5" into 1-based indices. */
function parsePageRange(rangeStr: string, totalPages: number): number[] {
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
	const seen = new Set<number>();
	return out.filter((n) => !seen.has(n) && seen.add(n));
}

/** Pick one or more PDF files from the vault, then merge them. */
export function runMerge(app: App): void {
	new FilePickerModal(app, (selection) => {
		void mergeFiles(app, selection);
	}).open();
}

/** Start a merge that already includes `filePath` as the reference file. */
export function runMergeWith(app: App, filePath: string): void {
	const modal = new FilePickerModal(app, (selection) => {
		void mergeFiles(app, selection);
	}, filePath);
	modal.open();
}

async function mergeFiles(app: App, selection: MergeSelection): Promise<void> {
	const { order, ranges } = selection;
	if (order.length === 0) return void new Notice("No PDF files selected.");

	// The reference file is the first in the ordered list.
	const referencePath = order[0];
	const refFile = app.vault.getAbstractFileByPath(referencePath);
	if (!(refFile instanceof TFile)) return void new Notice("No valid PDF file selected.");

	const outDoc = await PDFDocument.create();
	let totalCopied = 0;
	const notices: string[] = [];

	for (const path of order) {
		try {
			const target = app.vault.getAbstractFileByPath(path);
			if (!(target instanceof TFile)) continue;
			const bytes = await readBinary(app.vault, target);
			const src = await loadPdf(bytes);
			const totalPages = src.getPageCount();

			let indices: number[];
			const rangeStr = ranges[path]?.trim();
			if (!rangeStr) {
				indices = Array.from({ length: totalPages }, (_, i) => i + 1);
			} else {
				try {
					indices = parsePageRange(rangeStr, totalPages);
				} catch (e) {
					notices.push(`${path.split("/").pop()}: ${(e as Error).message}`);
					continue;
				}
			}

			const copied = await outDoc.copyPages(src, indices.map((n) => n - 1));
			for (const page of copied) {
				outDoc.addPage(page);
			}
			totalCopied += copied.length;
		} catch (e) {
			notices.push(`${path.split("/").pop()}: ${(e as Error).message}`);
		}
	}

	if (totalCopied === 0) return void new Notice("No pages were selected for merging.");

	try {
		const data = await savePdf(outDoc);
		const dir = refFile.parent ? refFile.path.split("/").slice(0, -1).join("/") : "";
		const baseName = `${refFile.basename}-merged.pdf`;
		await saveToVault(app, `${dir}/${baseName}`, data);

		if (notices.length) new Notice(notices.join("\n"));
		new Notice(`Merged ${totalCopied} page(s) as ${baseName}`);
	} catch (e) {
		void new Notice(`Merge failed: ${(e as Error).message}`);
	}
}
