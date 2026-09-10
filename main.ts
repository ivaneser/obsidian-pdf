import { App, Plugin } from "obsidian";
import { runMerge, runMergeWith } from "./commands/merge";
import { runCut } from "./commands/cut";

export default class ObsidianPdfPlugin extends Plugin {
	async onload(): Promise<void> {
		this.addCommand({
			id: "pdf-merge",
			name: "Merge PDF files",
			callback: () => runMerge(this.app),
		});

		this.addCommand({
			id: "pdf-cut",
			name: "Cut/extract pages from a PDF",
			callback: () => runCut(this.app),
		});

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if ((file as any).extension === "pdf") {
					menu.addItem((item) => {
						item
							.setTitle("PDF Studio: Merge with this PDF")
							.setIcon("files")
							.onClick(() => runMergeWith(this.app, file.path));
					});
					menu.addItem((item) => {
						item
							.setTitle("PDF Studio: Cut/extract pages")
							.setIcon("scissors")
							.onClick(() => runCut(this.app, file));
					});
				}
			})
		);

		this.addRibbonIcon("file-text", "PDF Studio", () => {
			runMerge(this.app);
		});
	}
}
