import { App, Modal } from "obsidian";

/** Result of a merge: ordered file paths + optional per-file page ranges. */
export interface MergeSelection {
	order: string[];
	ranges: Record<string, string>;
}

/** Normalize a vault path to its containing folder (always forward slashes). */
function normalizeFolder(path: string): string {
	const parts = path.replace(/\\/g, "/").split("/");
	parts.pop();
	return parts.join("/");
}

/**
 * Multi-select checkbox modal listing PDFs in a single folder.
 * Rows are draggable to reorder (output follows order), and each row has an
 * optional page-range input ("all pages" when empty). The reference file (the
 * one the right-click was invoked on) is preselected and shown first with no
 * checkbox.
 */
export class FilePickerModal extends Modal {
	private onPick: (selection: MergeSelection) => void;

	// Ordered list of candidate paths (reference first, then others in vault order).
	private order: string[];
	// Selection state keyed by path.
	private selected = new Set<string>();
	// Per-file page range input values. Empty means "all pages".
	private ranges: Record<string, string> = {};

	// The DOM element currently being dragged, for live reordering.
	private draggedElement: HTMLElement | null = null;

	// Reference to the list container so drop handlers can read it.
	private listEl: HTMLElement | null = null;

	constructor(app: App, onPick: (selection: MergeSelection) => void, referencePath?: string) {
		super(app);
		this.onPick = onPick;
		this.referencePath = referencePath;

		const allFiles = app.vault.getFiles().filter((f) => f.extension === "pdf").map((f) => f.path);

		if (referencePath && !allFiles.includes(referencePath)) {
			allFiles.unshift(referencePath);
		}

		// Restrict the list to the reference file's folder (the current folder).
		if (referencePath) {
			const refFolder = normalizeFolder(referencePath);
			let filtered = allFiles.filter((p) => normalizeFolder(p) === refFolder);

			// Ensure the reference is always shown first, regardless of its
			// original position in the vault listing.
			if (filtered.includes(referencePath)) {
				filtered.splice(filtered.indexOf(referencePath), 1);
			}
			filtered.unshift(referencePath);
			this.order = filtered;
		} else {
			this.order = allFiles;
		}

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
		this.listEl = list;

		this.order.forEach((path) => {
			const name = path.split("/").pop() ?? path;
			const isReference = path === this.referencePath;

			const row = list.createDiv({ cls: "pdf-file-row" });
			row.setAttr("data-path", path);
			if (isReference) row.classList.add("is-reference");

			// Drag handle.
			const handle = row.createSpan({ text: "\u2807", cls: "drag-handle" });

			if (!isReference) {
				// Checkbox for non-reference files only; the reference is always
				// selected and shown first with no checkbox.
				const input = row.createEl("input", { type: "checkbox" });
				input.checked = this.selected.has(path);
				input.addEventListener("change", () => this.toggle(path, input.checked));

				// Name label (clickable to toggle the checkbox).
				const label = row.createSpan({ text: name, cls: "pdf-file-name" });
				label.style.cursor = "pointer";
				label.addEventListener("click", () => {
					input.checked = !input.checked;
					this.toggle(path, input.checked);
				});

				// Page-range input.
				const rangeInput = row.createEl("input", { type: "text", cls: "pdf-page-range" });
				rangeInput.placeholder = "all pages";
				rangeInput.value = this.ranges[path] ?? "";
				rangeInput.addEventListener("input", () => {
					this.ranges[path] = rangeInput.value.trim();
				});

				this.setupDragDrop(handle, row, path);
			} else {
				row.createEl("span", { text: name, cls: "pdf-file-name" });
				row.createEl("span", { text: "  \u2014 included", cls: "pdf-file-ref" });

				// Page-range input so the reference file's pages can be edited too.
				const rangeInput = row.createEl("input", { type: "text", cls: "pdf-page-range" });
				rangeInput.placeholder = "all pages";
				rangeInput.value = this.ranges[path] ?? "";
				rangeInput.addEventListener("input", () => {
					this.ranges[path] = rangeInput.value.trim();
				});
			}
		});

		// Live drag preview + drop handling at the container level.
		list.addEventListener("dragover", (e) => {
			e.preventDefault();
			if (!this.draggedElement) return;
			const after = this.getDragAfterElement(list, e.clientY);
			this.listEl!.insertBefore(this.draggedElement!, after);
		});
		list.addEventListener("drop", (e) => {
			e.preventDefault();
			this.reorderFromDom();
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

	private setupDragDrop(handle: HTMLElement, row: HTMLElement, path: string): void {
		handle.setAttribute("draggable", "true");

		handle.addEventListener("dragstart", () => {
			this.draggedElement = row;
		});

		handle.addEventListener("dragend", () => {
			this.reorderFromDom();
			this.draggedElement = null;
		});

		row.addEventListener("dragover", (e) => e.preventDefault());
	}

	private getDragAfterElement(list: HTMLElement, y: number): HTMLElement | null {
		const rows = Array.from(list.querySelectorAll<HTMLElement>(".pdf-file-row"));
		let closest: HTMLElement | null = null;
		let closestOffset = Number.NEGATIVE_INFINITY;
		for (const child of rows) {
			if (child.classList.contains("is-reference")) continue;
			const box = child.getBoundingClientRect();
			const offset = y - box.top - box.height / 2;
			if (offset < 0 && offset > closestOffset) {
				closest = child;
				closestOffset = offset;
			}
		}
		return closest;
	}

	private reorderFromDom(): void {
		if (!this.listEl) return;
		const rows = Array.from(this.listEl.querySelectorAll<HTMLElement>(".pdf-file-row"));
		const newOrder = rows.map((row) => row.dataset.path!).filter(Boolean);

		// Move any tracked paths that aren't in the DOM (e.g. reference, which is
		// not draggable) back to their correct positions at the front.
		if (this.referencePath && !newOrder.includes(this.referencePath)) {
			newOrder.unshift(this.referencePath);
		}
		for (const path of this.order) {
			if (!newOrder.includes(path)) newOrder.push(path);
		}

		this.order = newOrder;
		this.renderList();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private referencePath?: string;
}
