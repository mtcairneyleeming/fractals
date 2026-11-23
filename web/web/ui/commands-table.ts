import { EditorState } from "@codemirror/state"
import { EditorView, lineNumbers, keymap, drawSelection } from "@codemirror/view"
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { javascript } from "@codemirror/lang-javascript"
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language"
import { State } from "../../lsystems/tosvg"
import { showPreview } from "./previews/controller";

// Replace a <textarea> by a CodeMirror 6 editor holding the same text (the textarea stays in the DOM, hidden).
// The editor is inserted just after the textarea, inside a `.cm-editor` element.
function editorFromTextArea(textarea: HTMLTextAreaElement, readOnly: boolean, onChange?: () => void): EditorView {
    const view = new EditorView({
        parent: textarea.parentElement,
        doc: textarea.value,
        extensions: [
            lineNumbers(),
            history(),
            drawSelection(),
            keymap.of([...defaultKeymap, ...historyKeymap]),
            javascript({ typescript: true }),
            syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
            EditorState.readOnly.of(readOnly),
            EditorView.updateListener.of((update) => {
                if (update.docChanged && onChange) onChange()
            }),
        ],
    })
    textarea.after(view.dom)
    textarea.style.display = "none"
    return view
}

function editorIn(el: Element): EditorView | null {
    const dom = el.querySelector(".cm-editor")
    return dom ? EditorView.findFromDOM(dom as HTMLElement) : null
}

export function createAllEditors() {
    document.querySelectorAll("textarea.edit").forEach(element => {
        if ((element as HTMLTextAreaElement).style.display != "none") {
            editorFromTextArea(element as HTMLTextAreaElement, element.classList.contains("readonly-edit"))
        }
    });
}

export function addRow(symbol: string = "", func: string = "") {
    let table = document.getElementById("rulesBody")
    table.insertAdjacentHTML("beforeend", `
    <tr class="m-0">
        <td class="t-small"><input placeholder="Symbol" class="mono symbol-input table-input" value=${symbol}></td>
        <td class="t-large"><textarea placeholder="Function" class="edit">${func}</textarea></td>
        <td class="t-small">
            <button class="btn btn-link delete-row-button">
                <i class="fa-solid fa-xmark" aria-hidden="true" aria-label="Delete row"></i>
            </button>
        </td>
    </tr>
    `)

    var n = table.lastElementChild as HTMLTableRowElement

    editorFromTextArea(n.querySelector("textarea.edit") as HTMLTextAreaElement, false, showPreview)
    n.querySelector(".delete-row-button").addEventListener("click", deleteRow, false)

    n.querySelector(".symbol-input").addEventListener("input", showPreview, false)
}

export function deleteRow(event: Event) {
    let btn = event.target as HTMLElement;
    if (btn.tagName == "I") btn = btn.parentElement
    let row = btn.parentElement.parentElement as HTMLTableRowElement
    editorIn(row)?.destroy()
    row.parentElement.removeChild(row)
}
export function getDrawingCommands(ignoreErrors = false): [Map<string, string>, any[]] {
    let table = document.getElementById("rulesBody")
    let functions = new Map<string, string>()
    let strings = [];// new Map<string, string>()
    for (let child of Array.from(table.children)) {

        let symbol = (child.firstElementChild.firstElementChild as HTMLInputElement).value
        if (symbol.length > 1 && !ignoreErrors) {
            throw new Error(`All symbols must be 1 character only - "${symbol}" is too long.`)
        }
        let functionStr = editorIn(child).state.doc.toString()
        try {
            let func = new Function("state", functionStr)
            // @ts-ignore - this is to avoid function typing issues
            functions.set(symbol, functionStr)
            strings.push([symbol, functionStr])
        } catch (e) {
            if (!ignoreErrors) {
                throw new Error(`Your drawing code for the symbol "${symbol}" was not valid Javascript`)
            }
        }

    }
    return [functions, strings]
}

export function setupTables() {

    addRow()
    document.getElementById("add-row-button").addEventListener("click", () => { addRow() }, false)

    document.querySelectorAll(".delete-row-button").forEach(item => {
        item.addEventListener("click", deleteRow, false)
    })

    document.querySelectorAll(".edit.readonly-edit").forEach((el: HTMLTextAreaElement) => {
        editorFromTextArea(el, true)
    })

}
