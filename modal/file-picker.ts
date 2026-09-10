import { App, Modal } from "obsidian";

/**
 * Multi-select checkbox modal listing every PDF in the vault.
 * The user picks any number of files and confirms with the Merge button.
 */
export class FilePickerModal extends Modal {
	private onPick: (paths: string[]) => void;
	private selected = new Set<string>();
	private boxes = new Map<string, HTMLInputElement>();

	constructor(app: App, onPick: (paths: string[]) => void) {
		super(app);
		this.onPick = onPick;
		this.titleEl.setText("Select PDF files to merge");
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		const files = this.app.vault.getFiles().filter((f) => f.extension === "pdf");

		if (files.length === 0) {
			contentEl.createDiv({ text: "No PDF files found in your vault." });
			return;
		}

		let selectedCount = 0;
		const updateMergeBtn = () => {
			this.mergeBtn.setText(
				selectedCount > 0 ? `Merge (${selectedCount})` : "Merge"
			);
		};

		files.forEach((file) => {
			const row = contentEl.createDiv({ cls: "pdf-file-row" });

			const input = row.createEl("input", { type: "checkbox" });
			this.boxes.set(file.path, input);
			input.addEventListener("change", () => {
				selectedCount += input.checked ? 1 : -1;
				updateMergeBtn();
			});

			const label = row.createSpan({ text: file.path });
			label.style.cursor = "pointer";
			label.addEventListener("click", () => {
				input.checked = !input.checked;
				input.dispatchEvent(new Event("change"));
			});
		});

		this.mergeBtn = contentEl.createEl("button", {
			text: `Merge (${files.length})`,
			cls: "mod-primary pdf-merge-btn",
		});
		this.mergeBtn.addEventListener("click", () => {
			if (!this.selected.size) return;
			const chosen = files
				.filter((f) => this.selected.has(f.path))
				.map((f) => f.path);
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
