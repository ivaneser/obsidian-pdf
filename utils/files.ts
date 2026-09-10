import { App, normalizePath, TFile } from "obsidian";

/** Save binary bytes to a path in the vault (creating parent folders). */
export async function saveToVault(
	app: App,
	path: string,
	bytes: ArrayBuffer
): Promise<void> {
	const normalized = normalizePath(path);
	await app.vault.createBinary(normalized, bytes);
}

/** Read binary bytes directly from a real TFile (from disk). */
export async function readBinary(vault: any, file: TFile): Promise<ArrayBuffer> {
	return await vault.readBinary(file);
}
