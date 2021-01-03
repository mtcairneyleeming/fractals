import { parseSettings } from "../settings"
import { toSVG } from "../../../lsystems/tosvg"



let worker: Worker = null
let slowTimeout = null;
function showWarning() {
    let msg = 'Generating preview...<br/><small>This takes a while for complicated L-systems</small>'
    let svgOut = document.getElementById("2d-preview-box")
    document.getElementById("lsys-preview").innerHTML = msg
    svgOut.innerHTML = msg

}

function showFailure(err) {
    let msg = `Generating preview failed, with error:<br/><small>e.toString()</small>`
    let svgOut = document.getElementById("2d-preview-box")
    document.getElementById("lsys-preview").innerHTML = msg
    svgOut.innerHTML = msg
}

export function showPreview() {
    if (worker != null) {
        worker.terminate()
        clearTimeout(slowTimeout)

    }
    worker = new Worker("worker.js")


    worker.postMessage(parseSettings(true))
    slowTimeout = setTimeout(showWarning,
        1200)
    worker.onmessage = function (e) {
        clearTimeout(slowTimeout)
        document.getElementById("lsys-preview").innerText = e.data["outText"]
        let svgOut = document.getElementById("2d-preview-box")
        svgOut.innerHTML = ''
        // show drawn form

        let wholeScaleFactors = []

        let i = 0
        for (let commands of e.data["iterations"]) {

            // TODO: subtle error message
            if (typeof commands == "string") {
                console.error(commands)
                showFailure(commands)
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

}