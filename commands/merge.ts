import { App, FuzzySuggestModal, Notice } from "obsidian";
import { PDFDocument } from "pdf-lib-bundled";
import { loadPdf, mergePdfs, savePdf } from "../utils/pdf";
import { readVaultFile, saveToVault } from "../utils/files";

/** Pick one or more PDF files from the vault via fuzzy search, then merge. */
export function runMerge(app: App): void {
	new FilePickerModal(app, (paths) => {
		void mergeFiles(app, paths);
	}).open();
}

async function mergeFiles(app: App, paths: string[]): Promise<void> {
	if (paths.length === 0) return void new Notice("No PDF files selected.");

	const notices: string[] = [];
	const docs: PDFDocument[] = [];
	for (const path of paths) {
		try {
			const bytes = await readVaultFile(app.vault, { path });
			docs.push(await loadPdf(bytes));
		} catch (e) {
			notices.push(`${path}: ${(e as Error).message}`);
		}
	}

	if (docs.length === 0) return void new Notice("No valid PDFs to merge.");

	try {
		const merged = await mergePdfs(docs);
		const out = await savePdf(merged);

		const baseName = `merged-${new Date().toISOString().slice(0, 10)}.pdf`;
		const targetFile = app.vault.getAbstractFileByPath(paths[0]);
		const dir = targetFile?.parent ? targetFile.parent.path : "";
		await saveToVault(app, `${dir}/${baseName}`, out);

		if (notices.length) new Notice(notices.join("\n"));
		new Notice(`Merged ${docs.length} file(s).`);
	} catch (e) {
		void new Notice(`Merge failed: ${(e as Error).message}`);
	}
}

/** Fuzzy picker that lets the user choose PDF files from the vault. */
class FilePickerModal extends FuzzySuggestModal<string> {
	private onPick: (paths: string[]) => void;

	constructor(app: App, onPick: (paths: string[]) => void) {
		super(app);
		this.onPick = onPick;
		this.setPlaceholder("Search for PDF files...");
	}

	getItems(): string[] {
		return this.app.vault
			.getFiles()
			.filter((f) => f.extension === "pdf")
			.map((f) => f.path);
	}

	getItemText(path: string): string {
		return path;
	}

	onChooseItem(path: string): void {
		this.onPick([path]);
	}
}
