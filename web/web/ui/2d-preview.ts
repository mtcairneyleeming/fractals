import { parseSettings } from "./settings"
import { Parser } from "../../lsystems/parser"
import { toSVGCommands, toSVG } from "../../lsystems/tosvg"


export function showPreview() {
    let settings = parseSettings(true)
    var parser = new Parser(settings["axiom"].split(""), settings["rules"])
    let num = 5
    // show text form
    let iterations = parser.iterateN(num)
    let outText = ""
    for (let j = 0; j < num; j++) {

        outText += `#${j}: `
        outText += iterations[j].join("")
        outText += "\n"
    }
    document.getElementById("lsys-preview").innerText = outText


    // show drwn form
    let svgOut = document.getElementById("2d-preview-box")
    svgOut.innerHTML = ''
    let wholeScaleFactors = []

    let i = 0
    for (let iteration of iterations) {
        let commands = toSVGCommands(iteration, settings["commands"], i)

        // TODO: subtle error message
        if (typeof commands == "string") {
            console.error(commands)
            return
        }
        let sf = toSVG(commands, svgOut, i)
        wholeScaleFactors.push(sf)

        i++
    }
    let sfs = []
    for (let j = 1; j < wholeScaleFactors.length; j++) {
        sfs.push(wholeScaleFactors[j - 1] / wholeScaleFactors[j])
    }
    let avg = sfs.reduce((x, y) => x + y, 0) / sfs.length
    let desc = document.createElement("p")
    desc.innerText = `Suggested scale factor (see below) based from drawing these previews is ${Math.round(avg * 1e6) / 1e6}`
    svgOut.appendChild(desc)
}

