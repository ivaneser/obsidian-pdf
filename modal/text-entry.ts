import { App, Modal } from "obsidian";

/** Simple text-entry modal for collecting a page-range string. */
export class TextEntryModal extends Modal {
	private onSubmit: (value: string) => void;

	constructor(app: App, title: string, onSubmit: (value: string) => void) {
		super(app);
		this.titleEl.setText(title);
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;

		const input = contentEl.createEl("input", {
			type: "text",
			placeholder: "e.g. 1-3, 5, 8-10",
			cls: "pdf-range-input",
		});
		input.focus();

		const submitBtn = contentEl.createEl("button", { text: "Extract" });
		submitBtn.addEventListener("click", () => {
			this.onSubmit(input.value.trim());
			this.close();
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
