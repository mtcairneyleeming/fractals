import * as CodeMirror from "codemirror"
import "codemirror/lib/codemirror.css"
import "codemirror/mode/javascript/javascript"
import { State } from "../../lsystems/tosvg"
export function createAllEditors() {
    document.querySelectorAll("textarea.edit").forEach(element => {
        if ((element as HTMLTextAreaElement).style.display != "none") {
            let code = CodeMirror.fromTextArea(element as HTMLTextAreaElement, {
                lineNumbers: true,
                mode: "text/typescript",
                viewportMargin: Infinity
            });
            if (element.classList.contains("readonly-edit")) {
                code.setOption("readOnly", true);
            }
        }
    });
}

export function addRow(symbol: string = "", func: string = "") {
    let table = document.getElementById("rulesBody")
    table.insertAdjacentHTML("beforeend", `
    <tr>
        <td><input placeholder="Symbol" class="symbol-input" value=${symbol}></td>
        <td><textarea placeholder="Function" class="edit">${func}</textarea></td>
        <td>
            <button class="btn btn-link delete-row-button">
                <i class="fa fa-times" aria-hidden="true" aria-label="Delete row"></i>
            </button>
        </td>
    </tr>
    `)
    // note all the rest won't be textareas any more!
    createAllEditors()
    var n = table.lastElementChild as HTMLTableRowElement
    n.querySelector(".delete-row-button").addEventListener("click", deleteRow, false)
}

export function deleteRow(event: Event) {
    let btn = event.target as HTMLElement;
    if (btn.tagName == "I") btn = btn.parentElement
    let row = btn.parentElement.parentElement as HTMLTableRowElement
    row.parentElement.removeChild(row)
}
export function getDrawingCommands(): [Map<string, (state: State) => void>, any[]] {
    let table = document.getElementById("rulesBody")
    let functions = new Map<string, (state: State) => void>()
    let strings = [];// new Map<string, string>()
    for (let child of Array.from(table.children)) {

        let symbol = (child.firstElementChild.firstElementChild as HTMLInputElement).value
        // @ts-ignore 
        let functionStr = child.querySelector(".CodeMirror").CodeMirror.getValue()
        let func = new Function("state", functionStr)
        // @ts-ignore - this is to avoid function typing issues
        functions.set(symbol, func)
        strings.push([symbol, functionStr])


    }
    console.log(functions, strings)
    return [functions, strings]
}

export function setupTables() {

    addRow()
    document.getElementById("add-row-button").addEventListener("click", () => { addRow() }, false)

    document.querySelectorAll(".delete-row-button").forEach(item => {
        item.addEventListener("click", deleteRow, false)
    })

}