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
	// Map to 0-based indices and copy them all in one pass via copyPages().
	const indices = pages
		.filter((p) => p >= 1 && p <= totalPages)
		.map((p) => p - 1);

	if (indices.length === 0) return out;

	const copied = await out.copyPages(source, indices);
	for (const page of copied) {
		out.addPage(page);
	}
	return out;
}

/** Merge many PDFs into a single document. */
export async function mergePdfs(docs: PDFDocument[]): Promise<PDFDocument> {
	if (docs.length === 0) throw new Error("No documents to merge.");
	const merged = await PDFDocument.create();

	// Collect all pages across docs, copy them in one batch per source doc.
	for (const doc of docs) {
		const indices: number[] = [];
		for (let i = 0; i < doc.getPageCount(); i++) indices.push(i);
		if (indices.length === 0) continue;
		const copied = await merged.copyPages(doc, indices);
		for (const page of copied) {
			merged.addPage(page);
		}
	}
	return merged;
}

/** Serialize a PDFDocument back to bytes. */
export async function savePdf(doc: PDFDocument): Promise<ArrayBuffer> {
	return await doc.save();
}
