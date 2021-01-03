import rough from "roughjs/bin/rough"
import { RoughCanvas } from "roughjs/bin/canvas";
import { getInput } from "./helpers"
import { parseScaleFactor } from "../settings";
import { round } from "mathjs"

let layers: RoughCanvas = null
let layersCanvas: HTMLCanvasElement = null

export function layersSetup() {

    layersCanvas = document.getElementById("layer-diagram") as HTMLCanvasElement
    // layersCanvas.style.width = "100%"
    // layersCanvas.width = layersCanvas.offsetWidth;
    layers = rough.canvas(layersCanvas, { options: { roughness: 0.5, strokeWidth: 2 } })
    function updateSize() {
        let oldDisplay = layersCanvas.style.display;
        layersCanvas.style.display = "none"
        layersCanvas.width = 2 * layersCanvas.parentElement.clientWidth;
        layersCanvas.height = 2 * layersCanvas.parentElement.clientHeight;
        layersCanvas.style.display = oldDisplay;
        let context = layersCanvas.getContext("2d")
        context.setTransform(2, 0, 0, 2, 0, 0)
        draw()

    }
    window.addEventListener("resize", updateSize)

    getInput("line_length").addEventListener("input", draw)
    getInput("num_layers").addEventListener("input", draw)
    getInput("centre_check").addEventListener("input", draw)
    getInput("layer_dist").addEventListener("input", draw)
    getInput("extrude_check").addEventListener("input", draw)
    getInput("extrude_dist").addEventListener("input", draw)

    getInput("scaling_factor").addEventListener("input", draw)


    updateSize() // includes draw
}

function draw() {
    let context: CanvasRenderingContext2D = layersCanvas.getContext("2d")
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, layersCanvas.width, layersCanvas.height);

    context.font = `2rem sans-serif`
    context.textAlign = "left"
    context.textBaseline = "middle"

    let num_layers = Math.max(parseInt(getInput("num_layers").value), 1)
    let centre = getInput("centre_check").checked;
    let line_length = parseFloat(getInput("line_length").value)
    let extrude = getInput("extrude_check").checked;
    let extrude_dist = parseFloat(getInput("extrude_dist").value)
    let dist_between = Math.max(0, Math.min(3.0, 0.01 * parseFloat(getInput("layer_dist").value)))
    let scale_factor = parseScaleFactor()


    let totalFrac = 0
    let totalHeight = 0;
    let sf = 1;

    for (let i = 1; i < num_layers; i++) {
        totalHeight += sf * dist_between * line_length;
        totalFrac += sf;
        sf *= scale_factor

    }
    if (extrude) {
        totalHeight += 2 * extrude_dist
    }

    let offsetY = 0.08 * layersCanvas.height;
    let safeY = 0.84 * layersCanvas.height;


    let currentDepth = offsetY + safeY;
    let oldDepth = Number.POSITIVE_INFINITY
    let currentScale = 1; // relative to first layer, so in (0,1]
    let globalScale = dist_between / 1.50;


    let widthForText = 0.3 * layersCanvas.width
    for (let i = 1; i <= num_layers; i++) {
        // represents fact that canvas coords start in top right

        let layerWidth = currentScale * 0.5 * layersCanvas.width;
        // keeps layers in right half of canvas, whilst optionally centering them (leaving some extra room for text on the rights)
        let layerStart = centre ? widthForText + (0.5 * layersCanvas.width - layerWidth) / 2 : widthForText


        context.font = `2.0rem sans-serif`
        let layerText = i <= 3 ? `Layer #${i}:` : `#${i}:`
        let metrics = context.measureText(layerText);

        let textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent

        // draw layer label
        if (oldDepth - currentDepth > textHeight + 5) {
            context.fillText(layerText, 0.05 * layersCanvas.width, currentDepth)
        }
        // draw a line representing the layer itself
        layers.line(layerStart, currentDepth, layerStart + layerWidth, currentDepth, { strokeWidth: extrude && (i == 1 || i == num_layers) ? 5 : 2 })

        context.font = `1.6rem sans-serif`
        let lengthText = `${round(line_length * currentScale, 1)}mm`
        metrics = context.measureText(lengthText);
        let smallerTextHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent

        // draw layer length
        if (oldDepth - currentDepth > smallerTextHeight + 10) {
            let textOffset = 5 //px

            layers.line(layerStart,
                currentDepth + textOffset,
                layerStart,
                currentDepth + textOffset + smallerTextHeight,
                { stroke: "gray" })
            layers.line(layerStart + layerWidth,
                currentDepth + textOffset,
                layerStart + layerWidth,
                currentDepth + textOffset + smallerTextHeight, { stroke: "gray" })

            if (metrics.width + 6 > layerWidth) {
                // stick text off to the right

                layers.line(layerStart,
                    currentDepth + textOffset + 0.5 * smallerTextHeight,
                    layerStart + layerWidth,
                    currentDepth + textOffset + 0.5 * smallerTextHeight,
                    { stroke: "gray" })

                context.fillText(lengthText,
                    layerStart + layerWidth + 5,
                    currentDepth + textOffset + metrics.actualBoundingBoxAscent)

            } else {
                // stick text within measuring stick
                let textWidth = metrics.width;
                layers.line(layerStart,
                    currentDepth + textOffset + 0.5 * smallerTextHeight,
                    layerStart + 0.5 * (layerWidth - textWidth - 6),
                    currentDepth + textOffset + 0.5 * smallerTextHeight,
                    { stroke: "gray" })

                context.fillText(lengthText,
                    layerStart + 0.5 * (layerWidth - textWidth),
                    currentDepth + textOffset + metrics.actualBoundingBoxAscent)

                layers.line(layerStart + layerWidth - 0.5 * (layerWidth - textWidth - 6),
                    currentDepth + textOffset + 0.5 * smallerTextHeight,
                    layerStart + layerWidth,
                    currentDepth + textOffset + 0.5 * smallerTextHeight,
                    { stroke: "gray" })
            }
        }

        if (i > 1 && i < 8) {
            layers.line(layerStart - 5,
                currentDepth,
                layerStart - 15,
                currentDepth,
                { stroke: "blue" })
            layers.line(layerStart - 5,
                oldDepth,
                layerStart - 15,
                oldDepth,
                { stroke: "blue" })

            layers.line(layerStart - 10,
                currentDepth,
                layerStart - 10,
                oldDepth,
                { stroke: "blue" })

            if (oldDepth - currentDepth > smallerTextHeight + 10) {
                context.textAlign = "right"
                context.fillText(`${round(line_length * currentScale / scale_factor * dist_between, 1)}mm = `, layerStart - 15, 0.5 * (oldDepth + currentDepth))
                context.textAlign = "left"
            }
        }

        oldDepth = currentDepth
        currentDepth -= globalScale * currentScale / totalFrac * safeY


        currentScale *= scale_factor
    }
    let totalXpos = 0.85 * layersCanvas.width;
    let topHeight = offsetY + (1 - globalScale) * safeY;
    // draw total marker
    layers.line(totalXpos, layersCanvas.height - offsetY, totalXpos, topHeight, { stroke: "purple" })
    layers.line(totalXpos - 5, layersCanvas.height - offsetY, totalXpos + 5, layersCanvas.height - offsetY, { stroke: "purple" })
    layers.line(totalXpos - 5, topHeight, totalXpos + 5, topHeight, { stroke: "purple" })
    context.textAlign = "right"
    context.font = "2rem sans-serif"

    let totalText = `total = ${round(totalHeight, 1)}mm = `
    context.fillText(totalText, totalXpos - 5, offsetY + safeY - 0.5 / totalFrac * globalScale * safeY);
}
