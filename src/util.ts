// adapted from https://github.com/vanadium23/obsidian-advanced-new-file/blob/master/src/CreateNoteModal.ts

import { Platform, Vault, normalizePath } from "obsidian";

interface ParsedPath {
    /** The full directory path such as '/home/user/dir' or 'folder/sub' */
    dir: string;
    /** The file name without extension */
    name: string;
}

export const path = {
    /**
     * Parses the file path into a directory and file name.
     * If the path string does not include a file name, it will default to
     * 'Untitled'.
     *
     * @example
     * parse('/one/two/file name')
     * // ==> { dir: '/one/two', name: 'file name' }
     *
     * parse('\\one\\two\\file name')
     * // ==> { dir: '/one/two', name: 'file name' }
     *
     * parse('')
     * // ==> { dir: '', name: 'Untitled' }
     *
     * parse('/one/two/')
     * // ==> { dir: '/one/two/', name: 'Untitled' }
     */
    parse(pathString: string): ParsedPath {
        const regex = /(?<dir>([^/\\]+[/\\])*)(?<name>[^/\\]*$)/;
        const match = String(pathString).match(regex);
        const { dir, name } = (match && match.groups) ?? { dir: "", name: "" };
        return { dir, name: name || "Untitled" };
    },

    /**
     * Joins multiple strings into a path using Obsidian's preferred format.
     * The resulting path is normalized with Obsidian's `normalizePath` func.
     * - Converts path separators to '/' on all platforms
     * - Removes duplicate separators
     * - Removes trailing slash
     */
    join(...strings: string[]): string {
        const parts = strings
            .map((s) => String(s).trim())
            .filter((s) => s != null);
        return normalizePath(parts.join("/"));
    },
};

/**
 * Creates a directory (recursive) if it does not already exist.
 * This is a helper function that includes a workaround for a bug in the
 * Obsidian mobile app.
 */
export async function createDirectory(
    vault: Vault,
    dir: string
): Promise<void> {
    const { adapter } = vault;
    const root = vault.getRoot().path;
    const directoryPath = path.join(root, dir);
    const directoryExists = await adapter.exists(directoryPath);
    // ===============================================================
    // -> Desktop App
    // ===============================================================
    if (!Platform.isIosApp) {
        if (!directoryExists) {
            return adapter.mkdir(normalizePath(directoryPath));
        }
    }
    // ===============================================================
    // -> Mobile App (IOS)
    // ===============================================================
    // This is a workaround for a bug in the mobile app:
    // To get the file explorer view to update correctly, we have to create
    // each directory in the path one at time.

    // Split the path into an array of sub paths
    // Note: `normalizePath` converts path separators to '/' on all platforms
    // @example '/one/two/three/' ==> ['one', 'one/two', 'one/two/three']
    // @example 'one\two\three' ==> ['one', 'one/two', 'one/two/three']
    const subPaths: string[] = normalizePath(directoryPath)
        .split("/")
        .filter((part) => part.trim() !== "")
        .map((_, index, arr) => arr.slice(0, index + 1).join("/"));

    // Create each directory if it does not exist
    for (const subPath of subPaths) {
        const directoryExists = await adapter.exists(path.join(root, subPath));
        if (!directoryExists) {
            await adapter.mkdir(path.join(root, subPath));
        }
    }
}
