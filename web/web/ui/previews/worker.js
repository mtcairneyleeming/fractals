
import { Parser } from "../../../lsystems/parser"
import { toSVGCommands } from "../../../lsystems/tosvg"


function run(e) {

    let settings = e.data
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

    let i = 0
    let coms = []
    for (let iteration of iterations) {
        let commands = toSVGCommands(iteration, settings["commands"], i)
        coms.push(commands)

    }

    return { "outText": outText, "iterations": coms }
}
onmessage = function (e) {
    postMessage(run(e))
}

