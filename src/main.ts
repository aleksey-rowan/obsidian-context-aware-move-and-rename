import { MarkdownFileInfo, Plugin, normalizePath } from "obsidian";
import {
    AppExtended,
    EditorExtended,
    LinkTypes,
    linkTypeEnum,
    ClickableToken,
} from "./types";
import ChooseFolderModal from "./chooseFolderModal";
import { createDirectory, path } from "./util";

export default class ContextAwareRenamePlugin extends Plugin {
    app: AppExtended;

    async onload() {
        this.addCommand({
            id: "rename-file-or-link",
            name: "Rename file or link",
            editorCallback: this.renameFileOrLink.bind(this),
        });

        this.addCommand({
            id: "rename-link-only",
            name: "Rename link only",
            editorCallback: (e, v) =>
                this.renameFileOrLink(e as EditorExtended, v, true),
        });

        this.addCommand({
            id: "move-file-or-link",
            name: "Move file or link",
            editorCallback: this.moveFileOrLink.bind(this),
        });

        this.addCommand({
            id: "move-link-only",
            name: "Move link only",
            editorCallback: (e, v) =>
                this.moveFileOrLink(e as EditorExtended, v, true),
        });
    }

    /**
     * The function `renameFileOrLink` renames a file or triggers a rename dialog for a link in a
     * Markdown editor.
     * @param {EditorExtended} editor - an instance of the `EditorExtended`
     * class, which represents the editor in which the code is being executed. It provides methods for
     * interacting with the editor, such as getting the current cursor position and getting the
     * clickable token at a specific position.
     * @param [linkOnly=false] - The `linkOnly` parameter is a boolean flag that determines whether
     * only the link should be renamed or the entire file. If `linkOnly` is set to `true`, only the
     * link will be renamed.
     * */
    private renameFileOrLink(
        editor: EditorExtended,
        v: MarkdownFileInfo,
        linkOnly = false
    ) {
        const token = this.getClickableToken(editor);

        // TODO: consider updating H1 in the note to match the new file title
        // rename file since we are not on top of anything clickable
        if (!token) {
            // exit if we are only renaming link
            if (!linkOnly) {
                this.app.commands.executeCommandById(
                    "workspace:edit-file-title"
                );
            }
            return;
        }

        const linkTypes: LinkTypes = {
            [linkTypeEnum.external]: () => {
                // call "edit link" command which just selects the text of the link
                editor.focus();
                editor.setSelection(token.start, token.end);
            },
            [linkTypeEnum.internal]: () => {
                // abort if we can't find the link object for some reason
                const linkTFile = this.getLinkTFile(token);
                if (!linkTFile) return;

                // call to trigger a rename dialog for the link we found
                this.app.fileManager.promptForFileRename(linkTFile);
            },
        };

        linkTypes[token.type]();
    }

    /**
     * Moves a file or updates a link based on the token type.
     * @param {EditorExtended} editor - The `editor` parameter is an instance of the `EditorExtended`
     * class, which represents the current editor in the application.
     * @param [linkOnly=false] - The `linkOnly` parameter is a boolean flag that determines whether
     * only the links should be moved or both the links and the file itself.
     * @returns nothing (void).
     */
    private moveFileOrLink(
        editor: EditorExtended,
        v: MarkdownFileInfo,
        linkOnly = false
    ) {
        // TODO: consider mass link manipulation using selection
        const token = this.getClickableToken(editor);

        // move the open file since we are not on top of anything clickable
        if (!token) {
            // exit if we are only moving links
            if (!linkOnly) {
                this.app.commands.executeCommandById("file-explorer:move-file");
            }
            return;
        }

        const linkTypes: LinkTypes = {
            [linkTypeEnum.external]: () => {
                /* can't move external links */
            },
            [linkTypeEnum.internal]: async () => {
                // abort if we can't find the link object for some reason
                const linkTFile = this.getLinkTFile(token);
                if (!linkTFile) return;

                // open the folder selector
                const newFolderPath = await new ChooseFolderModal(
                    this.app
                ).open();

                // TODO: consider adding an option to clean empty folder after moving the file
                await createDirectory(this.app.vault, newFolderPath);
                this.app.fileManager.renameFile(
                    linkTFile,
                    path.join(newFolderPath, linkTFile.name)
                );
            },
        };

        linkTypes[token.type]();
    }

    /**
     * Retrieves the link object for a given clickable token.
     * @param {ClickableToken} token - The `token` parameter is of type `ClickableToken`. It represents a
     * clickable token in the editor, such as a link or a mention.
     * @returns Returns the `linkTFile` object.
     */
    private getLinkTFile(token: ClickableToken) {
        const linkPath = this.getPath(token.text);
        const { path: filePath } = this.app.workspace.activeEditor.getFile();

        // get the link object itself
        const linkTFile = this.app.metadataCache.getFirstLinkpathDest(
            linkPath,
            filePath
        );
        return linkTFile;
    }

    /**
     * Returns the clickable token at the current cursor position in the
     * editor.
     * @param {EditorExtended} editor - The `editor` parameter is an instance of the `EditorExtended`
     * class. It represents the editor component or object that you are working with.
     * @returns the clickable token at the current cursor position in the editor.
     */
    private getClickableToken(editor: EditorExtended) {
        const cursorPosition = editor.getCursor();
        const token = editor.getClickableTokenAt(cursorPosition);

        return token;
    }

    /**
     * Returns the normalized path without the fragment
     * identifier.
     * @param {string} value - The `value` parameter is a string representing a path.
     * @returns a string.
     */
    private getPath(value: string): string {
        return normalizePath(value).split("#")[0];
    }

    onunload() {}
}
