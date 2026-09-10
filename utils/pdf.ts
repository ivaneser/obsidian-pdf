import { PDFDocument } from "pdf-lib-bundled";

/** Load a PDF from raw bytes, returning the parsed document. */
export async function loadPdf(bytes: ArrayBuffer): Promise<PDFDocument> {
	try {
		return await PDFDocument.load(bytes);
	} catch (e) {
		throw new Error(`Could not read this PDF file — it may be corrupt or password-protected.`);
	}
}

/** Extract the listed 1-based pages from a source doc into a new document. */
export async function extractPages(
	source: PDFDocument,
	pages: number[],
	totalPages: number
): Promise<PDFDocument> {
	const out = await PDFDocument.create();
	for (const p of pages) {
		if (p < 1 || p > totalPages) continue;
		out.copyPage(source.getPages()[p - 1]);
	}
	return out;
}

/** Merge many PDFs into a single document. */
export async function mergePdfs(docs: PDFDocument[]): Promise<PDFDocument> {
	if (docs.length === 0) throw new Error("No documents to merge.");
	const merged = await PDFDocument.create();
	for (const doc of docs) {
		for (const page of doc.getPages()) merged.copyPage(page);
	}
	return merged;
}

/** Serialize a PDFDocument back to bytes. */
export async function savePdf(doc: PDFDocument): Promise<ArrayBuffer> {
	return await doc.save();
}
