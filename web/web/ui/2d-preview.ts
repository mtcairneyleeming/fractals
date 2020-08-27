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


    let i = 0
    for (let iteration of iterations) {
        let commands = toSVGCommands(iteration, settings["commands"], i)

        // TODO: subtle error message
        if (typeof commands == "string") {
            console.error(commands)
            return
        }
        toSVG(commands, svgOut, 1)

        i++
    }

}

