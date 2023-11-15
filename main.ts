import {
    App,
    Editor,
    EditorPosition,
    FileManager,
    Plugin,
    MarkdownFileInfo,
    TFile,
    Workspace,
} from "obsidian";

interface ClickableToken {
    type: linkTypeEnum;
    text: string;
    start: EditorPosition;
    end: EditorPosition;
}

abstract class EditorExtended extends Editor {
    abstract getClickableTokenAt(
        position: EditorPosition
    ): ClickableToken | null;
}

abstract class AppExtended extends App {
    commands: {
        executeCommandById(id: string): void;
    };
    workspace: WorkspaceExtended;
    fileManager: FileManagerExtended;
}

abstract class FileManagerExtended extends FileManager {
    abstract promptForFileRename(file: TFile): void;
}

abstract class WorkspaceExtended extends Workspace {
    activeEditor: MarkdownFileInfoExtended;
}

interface MarkdownFileInfoExtended extends MarkdownFileInfo {
    getFile(): { path: string };
}

const enum linkTypeEnum {
    internal = "internal-link",
    external = "external-link",
}

type LinkTypes = {
    [key in linkTypeEnum]: () => void;
};

export default class ContextAwareRenamePlugin extends Plugin {
    app: AppExtended;

    async onload() {
        this.addCommand({
            id: "rename-file-or-link",
            name: "Rename file or link",
            editorCallback: this.renameFileOrLink.bind(this, 123),
        });

        this.addCommand({
            id: "rename-link-only",
            name: "Rename link only",
            editorCallback: this.renameLinkOnly.bind(this),
        });

        this.addCommand({
            id: "move-file-or-link",
            name: "Move file or link",
            editorCallback: this.moveFileOrLink.bind(this),
        });

        this.addCommand({
            id: "move-link-only",
            name: "Move link only",
            editorCallback: this.moveLinkOnly.bind(this),
        });
    }

    renameLinkOnly() {}
    moveLinkOnly() {}

    /**
     * The function `renameFileOrLink` renames a file or triggers a rename dialog for a link in a
     * Markdown editor.
     * @param {EditorExtended} editor - The `editor` parameter is an instance of the `EditorExtended`
     * class, which represents the editor in which the code is being executed. It provides methods for
     * interacting with the editor, such as getting the current cursor position and getting the
     * clickable token at a specific position.
     * @returns the result of calling `this.app.fileManager.promptForFileRename(link)`.
     */
    renameFileOrLink(editor: EditorExtended) {
        const token = this.getClickableToken(editor);

        // rename file since we are not on top of anything clickable
        if (!token) {
            this.app.commands.executeCommandById("workspace:edit-file-title");
            return;
        }

        const linkTypes: LinkTypes = {
            [linkTypeEnum.external]: () => {
                // call "edit link" command which just selects the text of the link
                editor.focus();
                editor.setSelection(token.start, token.end);
            },
            [linkTypeEnum.internal]: () => {
                const linkTFile = this.getLinkTFile(token);

                // abort if we can't find the link object for some reason
                if (!linkTFile) {
                    return;
                }

                // call to trigger a rename dialog for the link we found
                this.app.fileManager.promptForFileRename(linkTFile);
            },
        };

        linkTypes[token.type]();
    }

    moveFileOrLink(editor: EditorExtended) {
        const token = this.getClickableToken(editor);

        // move the open file since we are not on top of anything clickable
        if (!token) {
            this.app.commands.executeCommandById("file-explorer:move-file");
            return;
        }

        const linkTypes: LinkTypes = {
            [linkTypeEnum.external]: () => {},
            [linkTypeEnum.internal]: () => {
                // open the folder selector
                // rename the file
                this.app.fileManager.renameFile;
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
        const linkPath = this.normalize(token.text).path;
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
     * The `normalize` function takes a string value, replaces non-breaking spaces with regular spaces,
     * normalizes the string using the "NFC" normalization form, splits the string at the "#"
     * character, and returns an object with the path and subpath.
     * @param {string} value - A string value that represents a path or URL.
     * @returns The function `normalize` returns an object with two properties: `path` and `subpath`.
     */
    private normalize(value: string): { path: string; subpath: string } {
        // this replaces a non-breaking space with a regular one
        const nonBreakingSpace = /\u00A0/g;

        value = value.replace(nonBreakingSpace, " ").normalize("NFC");

        const path = value.split("#")[0];

        return {
            path,
            subpath: value.substring(path.length),
        };
    }

    onunload() {}
}
