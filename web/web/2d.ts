import { Parser } from "../lsystems/parser";
import * as CodeMirror from "codemirror"
import "codemirror/lib/codemirror.css"
import "./tests.css"
import "codemirror/mode/javascript/javascript"
import { toSVGCommands, State, toSVG } from "../lsystems/tosvg"


// Global variables ==========
let axiom: Array<string>, alphabet: Array<string>, num: number = null
let rules: Map<string, Array<string>> = new Map()
let iterations = []


// Helper ===================

function getElById<T>(id: string): T {
    return document.getElementById(id) as unknown as T
}


// Input parsing =============

function getParameters(): void {
    axiom = getElById<HTMLInputElement>("axiom").value.split(',')
    alphabet = getElById<HTMLInputElement>("alphabet").value.split(';')

    getElById<HTMLInputElement>("rules").value.split(';').forEach((str: string) => {
        var parts = str.split('>')

        rules.set(parts[0], parts[1].split(","))
    })

    num = (document.getElementById("n") as HTMLInputElement).value as unknown as number
}

function getDrawingCommands() {
    let table = document.getElementById("rulesBody")
    let map = new Map<string, (state: State) => void>()
    for (let child of Array.from(table.children)) {

        let symbol = (child.firstElementChild.firstElementChild as HTMLInputElement).value
        // @ts-ignore 
        let functionStr = child.querySelector(".CodeMirror").CodeMirror.getValue()
        let func = new Function("state", functionStr)
        // @ts-ignore - this is to avoid function typing issues
        map.set(symbol, func)

    }
    return map
}


// Error handling ============


function hideErrors() {
    document.getElementById("lsys-error-body").innerText = ""
    document.getElementById("lsys-error").style.display = "none"
    document.getElementById("svg-error").style.display = "none"
}

function checkLSystemErrors(parser: Parser) {
    let errors = parser.checkErrors()
    if (errors.length > 0) {
        let errStrings = errors.map(([err, symbol, input, alph], i, arr) =>
            `${err}: you used "${symbol.padStart(1)}" in ${input}, but "${symbol.padStart(1)}" is not in the alphabet ${alph.join(", ")}`
        )
        console.log(errStrings)
        document.getElementById("lsys-error-body").innerText = errStrings.join("\n")
        let warning = document.getElementById("lsys-error")
        warning.style.display = "block"
        warning.scrollIntoView({ block: "end", inline: "nearest", behavior: "smooth" })
    }
}

function showSVGError(err: string) {
    document.getElementById("svg-error-body").innerText = err
    document.getElementById("svg-error").style.display = "block"
}



// Editor/table setup ========

function createAllEditors() {
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

function addRow(symbol: string = "", func: string = "") {
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

function deleteRow(event: Event) {
    let btn = event.target as HTMLElement;
    if (btn.tagName == "I") btn = btn.parentElement
    let row = btn.parentElement.parentElement as HTMLTableRowElement
    //console.log(row, row.parentElement)
    row.parentElement.removeChild(row)
}

// Querystring save/load =====

function toQueryStringInURL() {
    let params = new URLSearchParams("")
    params.set("axiom", getElById<HTMLInputElement>("axiom").value)
    params.set("alphabet", getElById<HTMLInputElement>("alphabet").value)
    params.set("rules", getElById<HTMLInputElement>("rules").value)
    params.set("n", getElById<HTMLInputElement>("n").value)
    let table = getElById<HTMLTableElement>("rulesBody")
    let i = 0
    for (let child of Array.from(table.children)) {
        let symbol = (child.firstElementChild.firstElementChild as HTMLInputElement).value
        // @ts-ignore
        let functionStr = child.querySelector(".CodeMirror").CodeMirror.getValue()
        params.append("symbol:" + i, symbol)
        // hopefully this is URL-encoded?
        params.append("function:" + i, functionStr)
        i++
    }
    let str = params.toString()
    return [location.protocol, '//', location.host, location.pathname, "?", str, location.hash].join('');
}

function fromQueryString() {
    let params = new URLSearchParams(window.location.search)
    if (params.has("axiom")) {
        getElById<HTMLInputElement>("axiom").value = params.get("axiom")
    }
    if (params.has("alphabet")) {
        getElById<HTMLInputElement>("alphabet").value = params.get("alphabet")
    }
    if (params.has("rules")) {
        getElById<HTMLInputElement>("rules").value = params.get("rules")
    }
    if (params.has("n")) {
        getElById<HTMLInputElement>("n").value = params.get("n")
    }

    params.forEach((value, key, _) => {
        if (key.startsWith("symbol:")) {
            let index = parseInt(key.replace("symbol:", ""))
            if (params.has("function:" + index)) {
                addRow(value, params.get("function:" + index))
            } else {
                console.warn("Missing function to go with a symbol!!")
            }
        }
    })
}


// Save/load =================

function saveToLink() {
    // generate new url
    let newURL = toQueryStringInURL()

    // update current w/o reloading
    if (history.pushState) {
        window.history.pushState({ path: newURL }, '', newURL)
    }
    // add to clipboard??
    copyToClipboard(newURL)
    document.getElementById("saveNotif").style.display = "inline"
    setTimeout(() => {
        document.getElementById("saveNotif").style.display = "none"
    }, 20 * 1000);
}

function copyToClipboard(text: string) {
    // from https://stackoverflow.com/questions/33855641/copy-output-of-a-javascript-variable-to-the-clipboard
    var dummy = document.createElement("textarea");
    // to avoid breaking orgain page when copying more words
    // cant copy when adding below this code
    // dummy.style.display = 'none'
    document.body.appendChild(dummy);
    //Be careful if you use texarea. setAttribute('value', value), which works with "input" does not work with "textarea". – Eduard
    dummy.value = text;
    dummy.select();
    document.execCommand("copy");
    document.body.removeChild(dummy);
}

// Main logic ================

function getParser(): Parser {
    hideErrors()
    getParameters()
    var parser = new Parser(alphabet, axiom, rules)
    checkLSystemErrors(parser)
    return parser
}

function runLSystems() {
    let parser = getParser()
    iterations = parser.iterateN(num)
    document.getElementById("output").innerText = iterations.join("\n")
}

function generateSVGs() {

    let out = document.getElementById("svg-out")
    out.textContent = ''

    runLSystems()

    let map = getDrawingCommands()


    let i = 0
    console.log(iterations, out, map)
    for (const str of iterations) {
        let commands = toSVGCommands(str, map)

        // display the error
        if (typeof commands == "string") {
            showSVGError(commands)
            return
        }

        let para = document.createElement("dt")
        para.classList.add("col-sm-2")
        para.innerText = `Iteration #${i}`

        out.appendChild(para)
        let svgHolder = document.createElement("dd")
        svgHolder.classList.add("col-sm-10")
        out.appendChild(svgHolder)

        toSVG(commands, svgHolder, 1)

        i++
    }

}


// Add event handlers ========

document.getElementById("run").addEventListener("click", runLSystems, false)

document.getElementById("add-row-button").addEventListener("click", () => { addRow() }, false)

document.querySelectorAll(".delete-row-button").forEach(item => {
    item.addEventListener("click", deleteRow, false)
})

document.getElementById("gen-svgs").addEventListener("click", generateSVGs, false)

document.getElementById("saveToLinkButton").addEventListener("click", saveToLink, false)


// Run on load ===============

createAllEditors();

fromQueryString();
let table = getElById<HTMLTableElement>("rulesBody")
if (table.childElementCount == 0) {
    addRow("", "")
}