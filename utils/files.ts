import { App, normalizePath } from "obsidian";

/** Save binary bytes to a path in the vault (creating parent folders). */
export async function saveToVault(
	app: App,
	path: string,
	bytes: ArrayBuffer
): Promise<void> {
	const normalized = normalizePath(path);
	await app.vault.createBinary(normalized, bytes);
}

/** Read a Vault file's bytes. */
export async function readVaultFile(vault: any, file: { path: string }): Promise<ArrayBuffer> {
	return await vault.readBinary(file.path);
}
