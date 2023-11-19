import {
    App,
    Editor,
    EditorPosition,
    FileManager,
    MarkdownFileInfo,
    TFile,
    Workspace,
} from "obsidian";

export interface ClickableToken {
    type: linkTypeEnum;
    text: string;
    start: EditorPosition;
    end: EditorPosition;
}
export abstract class EditorExtended extends Editor {
    abstract getClickableTokenAt(
        position: EditorPosition
    ): ClickableToken | null;
}
export abstract class AppExtended extends App {
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
export const enum linkTypeEnum {
    internal = "internal-link",
    external = "external-link",
}
export type LinkTypes = {
    [key in linkTypeEnum]: () => void;
};
