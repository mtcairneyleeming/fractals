import { Parser } from "../lsystems/parser";
import * as CodeMirror from "codemirror"
import "codemirror/lib/codemirror.css"
import "./tests.css"
import "codemirror/mode/javascript/javascript"
import { toSVGCommands, State} from "../lsystems/tosvg"
import { SVG } from '@svgdotjs/svg.js'

// Add L-systems button
document.getElementById("run").addEventListener("click", runLSystems, false)

function getParameters() {
    var axiom = document.getElementById("axiom").value.split(',')
    var variables = document.getElementById("alphabet").value.split(';')
    var rulesMap = new Map()
    document.getElementById("rules").value.split(';').forEach((str: string) => {
        var parts = str.split('>')

        rulesMap.set(parts[0], parts[1].split(","))
    })
    
    var n = (document.getElementById("n") as HTMLInputElement).value as unknown as number
    return [axiom, variables, rulesMap, n]
}

function runLSystems() {
    let [axiom, alphabet, rules, n] = getParameters()
    var parser = new Parser(alphabet, axiom, rules)
    var res = parser.iterateN(n)
    document.getElementById("output").innerText = res.join("\n")
}

// Add editors
createAllEditors();

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


// Add row manipulation
document.getElementById("add-row-button").addEventListener("click", addRowClick, false)

function addRowClick() { addRow() }

function addRow(symbol: string = "", func: string = "") {
    let table = document.getElementById("rulesBody")
    table.insertAdjacentHTML("beforeend", `<tr>
    <td><input placeholder="Symbol" class="symbol-input" value=${symbol}></td>
    <td><textarea placeholder="Function" class="edit">${func}</textarea></td>
    <td><button class="btn btn-link delete-row-button"><i class="fa fa-times" aria-hidden="true"
                aria-label="Delete row"></i></button></td>
</tr>`)
    // note all the rest won't be textareas any more!
    createAllEditors()
    var n = table.lastChild as HTMLTableRowElement
    n.querySelector(".delete-row-button").addEventListener("click", deleteRow, false)
}

function deleteRow(event: Event) {
    let btn = event.target as HTMLElement;
    if (btn.tagName == "I") btn = btn.parentElement
    let row = btn.parentElement.parentElement as HTMLTableRowElement
    //console.log(row, row.parentElement)
    row.parentElement.removeChild(row)
}

document.querySelectorAll(".delete-row-button").forEach(item => {
    item.addEventListener("click", deleteRow, false)
})

function getDrawingCommands() {
    let table = document.getElementById("rulesBody")
    let map = new Map<string, (state: State) => void>()
    for (let child of Array.from(table.children)) {

        let symbol = (child.firstElementChild.firstElementChild as HTMLInputElement).value
        let functionStr = child.querySelector(".CodeMirror").CodeMirror.getValue()
        let func = new Function("state", functionStr)
        // @ts-ignore - this is to avoid function typing issues
        map.set(symbol, func)

    }
    return map
}

function generateSVGs() {
    let out = document.getElementById("svg-out")
    out.textContent = ''
    let [axiom, alphabet, rules, n] = getParameters()
    let map = getDrawingCommands()

    var parser = new Parser(alphabet, axiom, rules)
    var res = parser.iterateN(n)

    let i = 0
    console.log(res, out, map)
    for (const str of res) {
        let commands = toSVGCommands(str, map)

        let para = document.createElement("p")
        para.innerText = `Iteration #${i}`
        out.appendChild(para)

        let draw = SVG().addTo(out).size(200, 200)

        let strokeWidth = 2

        let path = draw.path(commands.join("\n")).attr({
            fill: "transparent",
            stroke: "black",
            "stroke-width": `${strokeWidth}px`
        }).transform({
            flip: "y"
        })

        let bbox = path.bbox()
        if (bbox.width < bbox.height) {
            bbox.x -= (bbox.height - bbox.width) / 2
            bbox.width = bbox.height
        }
        else if (bbox.width > bbox.height) {
            bbox.y -= (bbox.width - bbox.height) / 2
            bbox.height = bbox.width
        }
        bbox.x -= 0.025 * bbox.width
        bbox.y -= 0.025 * bbox.height
        bbox.height *= 1.05
        bbox.width *= 1.05
        let box = draw.rect(bbox.width, bbox.height).attr({
            fill: "transparent",
            stroke: "gray",
            "stroke-width": "1px"
        })
        box.x(bbox.x)
        box.y(bbox.y)

        draw.viewbox(bbox)

        let scaleFactor = box.rbox(draw).width / bbox.width
        path.attr("stroke-width", `${strokeWidth * scaleFactor}px`)

 
        i++
    }

}

document.getElementById("gen-svgs").addEventListener("click", generateSVGs, false)


