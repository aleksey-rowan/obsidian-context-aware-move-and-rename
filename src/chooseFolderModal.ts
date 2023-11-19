// adapted from https://github.com/vanadium23/obsidian-advanced-new-file/blob/master/src/ChooseFolderModal.ts
import { App, FuzzySuggestModal, TFolder, Vault } from "obsidian";

const EMPTY_TEXT = "No existing folder found.";
const PLACEHOLDER_TEXT = "Type a folder";
const SUGGESTION_HOTKEY = "Enter to create";
const INSTRUCTIONS = [
    { command: "↑↓", purpose: "to navigate" },
    { command: "Tab ↹", purpose: "to autocomplete folder" },
    { command: "↵", purpose: "to choose folder" },
    { command: "esc", purpose: "to dismiss" },
];

export default class ChooseFolderModal extends FuzzySuggestModal<TFolder> {
    folders: TFolder[] = [];

    suggestFolderDiv: HTMLDivElement;
    suggestTitleDiv: HTMLDivElement;
    suggestEmptyDiv: HTMLDivElement;

    noSuggestion: boolean;
    newDirectoryPath: string;

    private promiseResolver: (value: string) => void;

    constructor(app: App) {
        super(app);
        this.init();
    }

    init() {
        this.initFolders();
        this.initUI();
        this.initChooseFolderItem();
    }

    private initFolders() {
        Vault.recurseChildren(this.app.vault.getRoot(), (file) => {
            if (file instanceof TFolder && !this.folders.contains(file)) {
                this.folders.push(file);
            }
        });

        // TODO: think of a better sorting order for folder suggestions
        // reverse the arrayto show the elements in the same order as in the file explorer
        this.folders.reverse();
    }

    private initUI() {
        this.emptyStateText = EMPTY_TEXT;

        this.setPlaceholder(PLACEHOLDER_TEXT);
        this.setInstructions(INSTRUCTIONS);
    }

    /**
     * Initializes the HTML elements for a suggestion item in a folder.
     */
    private initChooseFolderItem() {
        this.suggestFolderDiv = document.createElement("div");
        this.suggestFolderDiv.innerHTML = `
            <div class="suggestion-item mod-complex is-selected">
                <div class="suggestion-content">
                    <div class="suggestion-title"></div>
                </div>
                <div class="suggestion-aux">
                    <span class="suggestion-hotkey">${SUGGESTION_HOTKEY}</span>
                </div>
            </div>
        `;

        this.suggestTitleDiv =
            // we know it's there, so
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.suggestFolderDiv.querySelector(".suggestion-title")!;

        this.suggestEmptyDiv = document.createElement("div");
        this.suggestEmptyDiv.innerHTML = `<div class="suggestion-empty">${EMPTY_TEXT}</div>`;
    }

    getItems(): TFolder[] {
        return this.folders;
    }

    getItemText(item: TFolder): string {
        this.noSuggestion = false;
        return item.path;
    }

    /**
     * Sets a flag to indicate that there are no suggestions, updates the text content of
     * a div element, hides all the results in a container, and appends two div elements to the
     * container.
     */
    onNoSuggestion() {
        this.noSuggestion = true;
        this.suggestTitleDiv.textContent = this.newDirectoryPath =
            this.inputEl.value;

        // hide all the results
        this.resultContainerEl.childNodes.forEach(
            (c) => c.parentNode && c.parentNode.removeChild(c)
        );

        this.resultContainerEl.append(
            this.suggestFolderDiv,
            this.suggestEmptyDiv
        );
    }

    inputListener(evt: KeyboardEvent) {
        const selectElement = document.querySelector<HTMLElement>(
            ".suggestion-item.is-selected"
        );
        // this acts as autocomplete for the suggestion
        if (evt.key == "Tab" && selectElement) {
            this.inputEl.value = selectElement.innerText;
            // to disable tab selections on input
            evt.preventDefault();
        }
    }

    onOpen() {
        // TODO: consider adding a title or some other indication of which file is being moved
        // const { contentEl } = this;
        // contentEl.createEl("h1", { text: "What's your name?" });

        super.onOpen();
        this.inputEl.addEventListener("keydown", this.inputListener.bind(this));
    }

    onClose() {
        this.inputEl.removeEventListener(
            "keydown",
            this.inputListener.bind(this)
        );
        super.onClose();
    }

    async open(): Promise<string> {
        return new Promise((resolve, reject) => {
            this.promiseResolver = resolve;

            super.open();
        });
    }

    /**
     * Resolves a promise with either the new directory path or the path of
     * the selected item.
     * @param {TFolder} item - TFolder - a type representing a folder object
     */
    onChooseItem(item: TFolder): void {
        this.promiseResolver(
            this.noSuggestion ? this.newDirectoryPath : item.path
        );
    }
}
