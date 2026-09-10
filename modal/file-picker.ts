import { App, Modal } from "obsidian";

/**
 * Multi-select checkbox modal listing PDFs in a single folder.
 * The user picks any number of files and confirms with the Merge button.
 */
export class FilePickerModal extends Modal {
	private onPick: (paths: string[]) => void;
	private selected = new Set<string>();
	private boxes = new Map<string, HTMLInputElement>();
	private pdfs: { path: string; parentPath: string }[];

	constructor(app: App, onPick: (paths: string[]) => void, referencePath?: string) {
		super(app);
		this.onPick = onPick;

		const allFiles = app.vault.getFiles().filter((f) => f.extension === "pdf");
		if (referencePath) {
			const ref = allFiles.find((f) => f.path === referencePath);
			const parentPath = ref?.parent ? ref.parent.path : "";
			this.pdfs = allFiles
				.filter((f) => !ref || f.parent?.path === parentPath)
				// Skip the file that was already chosen (right-click target).
				.filter((f) => f.path !== referencePath)
				.map((f) => ({ path: f.path, parentPath: f.parent?.path ?? "" }));
		} else {
			this.pdfs = allFiles.map((f) => ({ path: f.path, parentPath: f.parent?.path ?? "" }));
		}

		this.titleEl.setText("Select PDF files to merge");
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		if (this.pdfs.length === 0) {
			contentEl.createDiv({ text: "No other PDF files found in this folder." });
			return;
		}

		let selectedCount = 0;
		const updateMergeBtn = () => {
			this.mergeBtn.setText(
				selectedCount > 0 ? `Merge (${selectedCount})` : "Merge"
			);
		};

		this.pdfs.forEach((file) => {
			const row = contentEl.createDiv({ cls: "pdf-file-row" });

			const input = row.createEl("input", { type: "checkbox" });
			this.boxes.set(file.path, input);
			input.addEventListener("change", () => {
				selectedCount += input.checked ? 1 : -1;
				updateMergeBtn();
			});

			// Show only the file name (all files share this folder).
			const label = row.createSpan({ text: file.path.split("/").pop() });
			label.style.cursor = "pointer";
			label.addEventListener("click", () => {
				input.checked = !input.checked;
				input.dispatchEvent(new Event("change"));
			});
		});

		this.mergeBtn = contentEl.createEl("button", {
			text: `Merge (${this.pdfs.length})`,
			cls: "mod-primary pdf-merge-btn",
		});
		this.mergeBtn.addEventListener("click", () => {
			const chosen = this.pdfs
				.filter((f) => this.selected.has(f.path))
				.map((f) => f.path);
			if (!chosen.length) return;
			this.onPick(chosen);
			this.close();
		});

		updateMergeBtn();
	}

	private mergeBtn: HTMLButtonElement = null as any;

	/** Pre-select a file path (used when invoked from the right-click menu). */
	preselect(path: string): void {
		if (!this.boxes.has(path)) return;
		const input = this.boxes.get(path)!;
		input.checked = true;
		this.selected.add(path);
		input.dispatchEvent(new Event("change"));
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
