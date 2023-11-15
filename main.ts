import {
    App,
    Editor,
    EditorPosition,
    FileManager,
    MarkdownView,
    Plugin,
    MarkdownFileInfo,
    TFile,
    Workspace,
} from "obsidian";

interface ClickableToken {
    type: string;
    text: string;
}

abstract class EditorExtended extends Editor {
    abstract getClickableTokenAt(position: EditorPosition): ClickableToken;
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

export default class ContextAwareRenamePlugin extends Plugin {
    app: AppExtended;

    async onload() {
        // This adds an editor command that can perform some operation on the current editor instance
        this.addCommand({
            id: "rename-file-or-link",
            name: "File or Link",
            editorCallback: this.renameFileOrLink.bind(this),
        });
    }

    /**
     * The function `renameFileOrLink` renames a file or triggers a rename dialog for a link in a
     * Markdown editor.
     * @param {EditorExtended} editor - The `editor` parameter is an instance of the `EditorExtended`
     * class, which represents the editor in which the code is being executed. It provides methods for
     * interacting with the editor, such as getting the current cursor position and getting the
     * clickable token at a specific position.
     * @param {MarkdownView} view - The `view` parameter is an object of type `MarkdownView`. It
     * represents the current markdown view in the application and provides methods and properties
     * related to the view, such as getting the current cursor position and the clickable token at the
     * cursor position.
     * @returns the result of calling `this.app.fileManager.promptForFileRename(link)`.
     */
    renameFileOrLink(editor: EditorExtended, view: MarkdownView) {
        const cursorPosition = editor.getCursor();
        const token = editor.getClickableTokenAt(cursorPosition);

        if (!token) {
            // rename file since we are not on top of a link
            this.app.commands.executeCommandById("workspace:edit-file-title");

            return;
        }

        // ignore external links
        // TODO: actually trigger "edit link" command
        if (token.type !== "internal-link") {
            return;
        }

        const linkPath = this.normalize(token.text).path;
        const { path: filePath } = this.app.workspace.activeEditor.getFile();

        // get the link object itself
        const link = this.app.metadataCache.getFirstLinkpathDest(
            linkPath,
            filePath
        );

        if (!link) {
            return;
        }

        // call to trigger a rename dialog for the link we found
        return this.app.fileManager.promptForFileRename(link);
    }

    /**
     * The `normalize` function takes a string value, replaces non-breaking spaces with regular spaces,
     * normalizes the string using the "NFC" normalization form, splits the string at the "#"
     * character, and returns an object with the path and subpath.
     * @param {string} value - A string value that represents a path or URL.
     * @returns The function `normalize` returns an object with two properties: `path` and `subpath`.
     */
    normalize(value: string): { path: string; subpath: string } {
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
