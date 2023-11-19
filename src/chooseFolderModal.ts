// adapted from https://github.com/vanadium23/obsidian-advanced-new-file/blob/master/src/ChooseFolderModal.ts
import { App, FuzzySuggestModal, TFolder, Vault } from "obsidian";

const EMPTY_TEXT = "No folder found. Press esc to dismiss.";
const PLACEHOLDER_TEXT = "Type folder name to fuzzy find.";
const instructions = [
    { command: "↑↓", purpose: "to navigate" },
    { command: "Tab ↹", purpose: "to autocomplete folder" },
    { command: "↵", purpose: "to choose folder" },
    { command: "esc", purpose: "to dismiss" },
];

export default class ChooseFolderModal extends FuzzySuggestModal<TFolder> {
    folders: TFolder[] = [];

    chooseFolderDiv: HTMLDivElement;
    suggestionEmptyDiv: HTMLDivElement;

    noSuggestion: boolean;
    newDirectoryPath: string;

    constructor(app: App) {
        super(app);
        this.init();
    }

    init() {
        Vault.recurseChildren(this.app.vault.getRoot(), (file) => {
            if (file instanceof TFolder && !this.folders.contains(file)) {
                this.folders.push(file);
            }
        });

        // TODO: think of a better sorting order for folder suggestions
        // reverse the arrayto show the elements in the same order as in the file explorer
        this.folders.reverse();

        this.emptyStateText = EMPTY_TEXT;

        this.setPlaceholder(PLACEHOLDER_TEXT);
        this.setInstructions(instructions);

        this.initChooseFolderItem();
    }

    getItems(): TFolder[] {
        return this.folders;
    }

    getItemText(item: TFolder): string {
        this.noSuggestion = false;
        return item.path;
    }

    onNoSuggestion() {
        this.noSuggestion = true;
        this.newDirectoryPath = this.inputEl.value;

        // hide all the results
        this.resultContainerEl.childNodes.forEach(
            (c) => c.parentNode && c.parentNode.removeChild(c)
        );

        this.chooseFolderDiv.innerText = this.inputEl.value;

        this.itemInstructionMessage(
            this.chooseFolderDiv,
            "Press ↵ or append / to create folder."
        );
        this.resultContainerEl.appendChild(this.chooseFolderDiv);
        this.resultContainerEl.appendChild(this.suggestionEmptyDiv);
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

    private promiseResolver: (value: string) => void;

    async open(): Promise<string> {
        return new Promise((resolve, reject) => {
            this.promiseResolver = resolve;

            super.open();
        });
    }

    onChooseItem(item: TFolder, evt: MouseEvent | KeyboardEvent): void {
        this.promiseResolver(
            this.noSuggestion ? this.newDirectoryPath : item.path
        );
    }

    private initChooseFolderItem() {
        this.chooseFolderDiv = document.createElement("div");
        this.chooseFolderDiv.addClasses(["suggestion-item", "is-selected"]);

        this.suggestionEmptyDiv = document.createElement("div");
        this.suggestionEmptyDiv.addClass("suggestion-empty");
        this.suggestionEmptyDiv.innerText = EMPTY_TEXT;
    }

    private itemInstructionMessage(resultEl: HTMLElement, message: string) {
        const el = document.createElement("kbd");
        el.addClass("suggestion-hotkey");
        el.innerText = message;
        resultEl.appendChild(el);
    }
}
