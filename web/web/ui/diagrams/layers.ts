import rough from "roughjs/bin/rough"
import { RoughCanvas } from "roughjs/bin/canvas";
import { getInput } from "./helpers"
import { parseScaleFactor } from "../settings";


let layers: RoughCanvas = null
let layersCanvas = null

export function layersSetup() {

    layersCanvas = document.getElementById("layer-diagram") as HTMLCanvasElement
    // layersCanvas.style.width = "100%"
    // layersCanvas.width = layersCanvas.offsetWidth;
    layers = rough.canvas(layersCanvas, { options: { roughness: 0.5 } })



    getInput("num_layers").addEventListener("input", draw)
    getInput("draw_axiom_check").addEventListener("input", draw)
    getInput("layer_dist").addEventListener("input", draw)

    document.querySelectorAll("#scale_radio_container>label").forEach(el => el.addEventListener("click", draw))
    getInput("scaling_factor_other").addEventListener("input", draw)
    draw()
}

function draw() {
    let context = layersCanvas.getContext("2d")
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, layersCanvas.width, layersCanvas.height);
    //context.translate(30, layersCanvas.height)
    //context.scale(1, -1)

    let num_layers = Math.max(parseInt(getInput("num_layers").value), 1)
    let draw_axiom = getInput("draw_axiom_check").checked;
    let dist_between = Math.max(0, Math.min(1.0, 0.01 * parseFloat(getInput("layer_dist").value)))
    let scale_factor = parseScaleFactor()
    let tot_height = 0
    let step = 1;
    for (let i = 0; i < num_layers; i++) {
        if (i != 0 || draw_axiom) {
            tot_height += dist_between * step;
        }
        step *= scale_factor

    }
    let offsetY = 0.1 * layersCanvas.height;
    let currPos = 0;
    let yScale = 0.88 * layersCanvas.height / tot_height
    step = 1
    context.font = `1rem sans-serif`
    context.textAlign = "left"
    context.textBaseline = "top"
    let oldHeight = Number.POSITIVE_INFINITY
    for (let i = 0; i <= num_layers; i++) {
        if (i != 0 || draw_axiom) {
            let currHeight = layersCanvas.height - (yScale * currPos + offsetY)
            layers.line(0.05 * layersCanvas.width, currHeight, (0.05 + step * 0.45) * layersCanvas.width, currHeight)

            if (i == 0 && draw_axiom) {
                context.fillText("Axiom (Layer #0)", 0.55 * layersCanvas.width, currHeight)
            }
            else {
                context.fillText(`Layer #${i}`, 0.55 * layersCanvas.width, currHeight)
                layers.line((0.05 + step * 0.45) * layersCanvas.width, currHeight, (0.05 + step * 0.45) * layersCanvas.width, oldHeight, { stroke: "blue" })
            }
            oldHeight = currHeight
            currPos += dist_between * step
        }
        step *= scale_factor
    }
}
