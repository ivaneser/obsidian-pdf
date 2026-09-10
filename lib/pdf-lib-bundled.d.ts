declare module "pdf-lib-bundled" {
	export class PDFDocument {
		static load(bytes: ArrayBuffer | Uint8Array): Promise<PDFDocument>;
		static create(): Promise<PDFDocument>;
		getPageCount(): number;
		getPages(): any[];
		copyPage(page: any): void;
		save(): Promise<ArrayBuffer>;
	}
}
