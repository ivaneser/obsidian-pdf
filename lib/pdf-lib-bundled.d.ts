declare module "pdf-lib-bundled" {
	export class PDFDocument {
		static load(bytes: ArrayBuffer | Uint8Array): Promise<PDFDocument>;
		static create(): Promise<PDFDocument>;
		getPageCount(): number;
		getPages(): any[];
		copyPages(source: PDFDocument, indices: number[]): Promise<any[]>;
		addPage(page: any): void;
		save(): Promise<ArrayBuffer>;
	}
}
