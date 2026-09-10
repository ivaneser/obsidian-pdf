import { App, Modal, Notice } from "obsidian";

/**
 * Multi-select checkbox modal listing PDFs in a single folder.
 * The user picks any number of files and confirms with the Merge button.
 */
export class FilePickerModal extends Modal {
	private onPick: (paths: string[]) => void;
	// Selection is tracked by path, not by the checkbox element.
	private selected = new Set<string>();
	private boxes = new Map<string, HTMLInputElement>();
	private pdfs: { path: string }[];

	constructor(app: App, onPick: (paths: string[]) => void, referencePath?: string) {
		super(app);
		this.onPick = onPick;
		this.referencePath = referencePath;

		const allFiles = app.vault.getFiles().filter((f) => f.extension === "pdf");
		if (referencePath) {
			const ref = allFiles.find((f) => f.path === referencePath);
			const parentPath = ref?.parent ? ref.parent.path : "";
			this.pdfs = allFiles
				.filter((f) => !ref || f.parent?.path === parentPath)
				.map((f) => ({ path: f.path }));
		} else {
			this.pdfs = allFiles.map((f) => ({ path: f.path }));
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

			const isReference = file.path === this.referencePath;

			if (isReference) {
				// Already chosen via right-click — show as read-only.
				row.createSpan({
					text: `${file.path.split("/").pop()}  (included)`,
				}).style.color = "var(--text-muted)";
				this.selected.add(file.path);
			} else {
				const input = row.createEl("input", { type: "checkbox" });
				this.boxes.set(file.path, input);
				input.addEventListener("change", () => {
					if (input.checked) this.selected.add(file.path);
					else this.selected.delete(file.path);
					selectedCount = this.selected.size;
					updateMergeBtn();
				});

				const label = row.createSpan({ text: file.path.split("/").pop() });
				label.style.cursor = "pointer";
				label.addEventListener("click", () => {
					input.checked = !input.checked;
					input.dispatchEvent(new Event("change"));
				});
			}
		});

		this.mergeBtn = contentEl.createEl("button", {
			text: `Merge (${this.pdfs.length})`,
			cls: "mod-primary pdf-merge-btn",
		});
		this.mergeBtn.addEventListener("click", () => {
			console.log("[merge] button clicked");
			const chosen = this.pdfs
				.filter((f) => this.selected.has(f.path))
				.map((f) => f.path);
			console.log("[merge] selected:", chosen, "count:", chosen.length);
			if (!chosen.length) {
				new Notice("Ничего не выбрано для слияния.");
				return;
			}
			try {
				this.onPick(chosen);
			} catch (e) {
				console.error("[merge] onPick threw:", e);
				void new Notice(`Ошибка: ${(e as Error).message}`);
			}
			this.close();
		});

		updateMergeBtn();
	}

	private mergeBtn: HTMLButtonElement = null as any;

	/** Pre-select a file path (used when invoked from the right-click menu). */
	preselect(path: string): void {
		if (!this.pdfs.some((f) => f.path === path)) return;
		this.selected.add(path);
		this.mergeBtn.setText(`Merge (${this.selected.size})`);
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private referencePath?: string;
}
