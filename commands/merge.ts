import { App, Notice, TFile } from "obsidian";
import { PDFDocument } from "pdf-lib-bundled";
import { loadPdf, mergePdfs, savePdf } from "../utils/pdf";
import { readBinary, saveToVault } from "../utils/files";
import { FilePickerModal } from "../modal/file-picker";

/** Pick one or more PDF files from the vault, then merge them. */
export function runMerge(app: App): void {
	new FilePickerModal(app, (paths) => {
		void mergeFiles(app, paths);
	}).open();
}

/** Start a merge that already includes `filePath` as the first selected file. */
export function runMergeWith(app: App, filePath: string): void {
	const modal = new FilePickerModal(app, (paths) => {
		void mergeFiles(app, paths);
	}, filePath);
	modal.preselect(filePath);
	modal.open();
}

async function mergeFiles(app: App, paths: string[]): Promise<void> {
	console.log("[merge] mergeFiles called with:", paths);
	if (paths.length === 0) return void new Notice("No PDF files selected.");

	const notices: string[] = [];
	const docs: PDFDocument[] = [];
	for (const path of paths) {
		try {
			const target = app.vault.getAbstractFileByPath(path);
			console.log("[merge] resolved:", path, "->", target?.path ?? "null");
			if (!(target instanceof TFile)) continue;
			const bytes = await readBinary(app.vault, target);
			docs.push(await loadPdf(bytes));
		} catch (e) {
			notices.push(`${path}: ${(e as Error).message}`);
			console.error("[merge] failed to load:", path, e);
		}
	}

	console.log("[merge] docs loaded:", docs.length);
	if (docs.length === 0) return void new Notice("No valid PDFs to merge.");

	try {
		const merged = await mergePdfs(docs);
		const out = await savePdf(merged);
		console.log("[merge] pdf merged, saving...");

		// Save in the same folder as the first selected file.
		const first = app.vault.getAbstractFileByPath(paths[0]);
		if (!(first instanceof TFile)) return void new Notice("No valid PDFs to merge.");
		const dir = first.parent ? first.parent.path : "";

		const baseName = `merged-${new Date().toISOString().slice(0, 10)}.pdf`;
		await saveToVault(app, `${dir}/${baseName}`, out);
		console.log("[merge] saved successfully");

		if (notices.length) new Notice(notices.join("\n"));
		new Notice(`Merged ${docs.length} file(s).`);
	} catch (e) {
		console.error("[merge] save failed:", e);
		void new Notice(`Merge failed: ${(e as Error).message}`);
	}
}
