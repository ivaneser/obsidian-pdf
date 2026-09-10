import { App, Modal } from "obsidian";

/** Result of a merge: ordered file paths + optional per-file page ranges. */
export interface MergeSelection {
	order: string[];
	ranges: Record<string, string>;
}

/**
 * Multi-select checkbox modal listing PDFs in a single folder.
 * Rows are draggable to reorder (output follows order), and each row has an
 * optional page-range input ("all pages" when empty). The reference file (the
 * one the right-click was invoked on) is preselected and shown first.
 */
export class FilePickerModal extends Modal {
	private onPick: (selection: MergeSelection) => void;

	// Ordered list of candidate paths (reference first, then others in vault order).
	private order: string[];
	// Selection state keyed by path.
	private selected = new Set<string>();
	// Per-file page range input values. Empty means "all pages".
	private ranges: Record<string, string> = {};

	constructor(app: App, onPick: (selection: MergeSelection) => void, referencePath?: string) {
		super(app);
		this.onPick = onPick;

		const allFiles = app.vault.getFiles().filter((f) => f.extension === "pdf").map((f) => f.path);
		if (referencePath && !allFiles.includes(referencePath)) {
			allFiles.unshift(referencePath);
		}
		this.order = allFiles;

		if (referencePath) this.selected.add(referencePath);

		this.titleEl.setText("Select PDF files to merge");
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		if (this.order.length === 0) {
			contentEl.createDiv({ text: "No PDF files found in this folder." });
			return;
		}

		this.renderList();
	}

	private renderList(): void {
		const { contentEl } = this;
		contentEl.empty();

		let selectedCount = 0;
		for (const path of this.order) {
			if (this.selected.has(path)) selectedCount++;
		}

		const list = contentEl.createDiv({ cls: "pdf-merge-list" });

		this.order.forEach((path) => {
			const name = path.split("/").pop() ?? path;
			const isReference = path === this.referencePath;

			const row = list.createDiv({ cls: "pdf-file-row" });
			if (isReference) row.classList.add("is-reference");

			// Drag handle.
			const handle = row.createSpan({ text: "\u2807", cls: "drag-handle" });
			handle.setAttribute("draggable", "true");

			// Checkbox.
			const input = row.createEl("input", { type: "checkbox" });
			input.checked = this.selected.has(path);
			if (isReference) input.disabled = true;

			// Name label.
			const label = row.createSpan({ text: name, cls: "pdf-file-name" });
			if (isReference) {
				label.style.color = "var(--text-muted)";
				row.createEl("span", { text: "  \u2014 included", cls: "pdf-file-ref" });
			} else {
				label.style.cursor = "pointer";
				label.addEventListener("click", () => {
					input.checked = !input.checked;
					this.toggle(path, input.checked);
				});
			}

			input.addEventListener("change", () => this.toggle(path, input.checked));

			// Page-range input.
			const rangeInput = row.createEl("input", { type: "text", cls: "pdf-page-range" });
			rangeInput.placeholder = "all pages";
			rangeInput.value = this.ranges[path] ?? "";
			if (isReference) rangeInput.disabled = true;
			rangeInput.addEventListener("input", () => {
				this.ranges[path] = rangeInput.value.trim();
			});

			// Drag-and-drop reordering.
			let draggedPath: string | null = null;
			handle.addEventListener("dragstart", (e) => {
				draggedPath = path;
				e.dataTransfer!.setData("text/plain", path);
				e.dataTransfer!.effectAllowed = "move";
				row.classList.add("dragging");
			});
			handle.addEventListener("dragend", () => {
				row.classList.remove("dragging");
				draggedPath = null;
			});

			row.addEventListener("dragover", (e) => {
				e.preventDefault();
				if (draggedPath && draggedPath !== path) {
					const targetIndex = this.order.indexOf(path);
					const dragIndex = this.order.indexOf(draggedPath);
					if (dragIndex !== -1 && targetIndex !== -1 && dragIndex !== targetIndex) {
						// Move the dragged item to the current row's position.
						const [moved] = this.order.splice(dragIndex, 1);
						this.order.splice(targetIndex, 0, moved);
						this.renderList();
					}
				}
			});
		});

		// Merge button (created last so it stays at the bottom).
		const btn = contentEl.createEl("button", {
			text: selectedCount > 0 ? `Merge (${selectedCount})` : "Merge",
			cls: "mod-primary pdf-merge-btn",
		});
		btn.addEventListener("click", () => {
			if (selectedCount === 0) return;
			const ranges = { ...this.ranges };
			this.onPick({ order: [...this.order], ranges });
			this.close();
		});
	}

	private toggle(path: string, checked: boolean): void {
		if (checked) this.selected.add(path);
		else this.selected.delete(path);
		this.renderList();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private referencePath?: string;
}
