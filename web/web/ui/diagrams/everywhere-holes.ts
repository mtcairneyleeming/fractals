import rough from "roughjs/bin/rough"
import { RoughCanvas } from "roughjs/bin/canvas";
import { getInput, makeCurlyBrace } from "./helpers"
let everywhere: RoughCanvas = null
let everywhereCanvas: HTMLCanvasElement = null

export function everywhereSetup() {
    everywhereCanvas = document.getElementById("everywhere-diagram") as HTMLCanvasElement;
    everywhere = rough.canvas(everywhereCanvas);



    getInput("ev_hole_number").addEventListener("input", draw)
    getInput("ev_ratio").addEventListener("input", draw)
    getInput("ev_frame_percent").addEventListener("input", draw)

    draw()
}



function draw() {
    let num_holes = parseInt(getInput("ev_hole_number").value)
    let ratio = parseFloat(getInput("ev_ratio").value)
    let frame = parseFloat(getInput("ev_frame_percent").value)

    let context = everywhereCanvas.getContext("2d")
    context.clearRect(0, 0, everywhereCanvas.width, everywhereCanvas.height);
    let totWidth = everywhereCanvas.width * 0.9
    let totHeight = totWidth * 0.5
    let offsetX = everywhereCanvas.width * 0.025
    let offsetY = 10 //0.5 * (everywhereCanvas.height - totHeight)
    let outer = everywhere.rectangle(offsetX, offsetY, totWidth, totHeight, { fill: 'gray' });


    let pair = 1 + ratio
    let pair_frac = 1.0 / num_holes

    let holeWidth = 1 / pair * pair_frac * totWidth
    let solidWidth = ratio / pair * pair_frac * totWidth
    let pairWidth = holeWidth + solidWidth

    let frameFrac = 0.01 * frame
    let frameHeight = frameFrac * totHeight;
    let holeHeight = totHeight - 2 * frameHeight

    let holeBottom = totHeight - frameHeight + offsetY;
    let holeLeft = offsetX + 0.5 * solidWidth
    for (let i = 0; i < num_holes; i++) {
        let start = [
            offsetX + 0.5 * solidWidth + i * pairWidth,
            offsetY + frameHeight
        ]


        everywhere.rectangle(start[0], start[1], holeWidth, holeHeight, { fill: "white", fillStyle: "solid" })

    }

    // draw labels
    // context.textBaseline = "middle"
    // context.font = `${Math.round(frameHeight)}px sans-serif`
    // context.fillText("}", offsetX + 0.5 * pairWidth, offsetY + 0.5 * frameHeight)
    let [path0, x0, y0] = makeCurlyBrace(holeLeft, offsetY + frameHeight, holeLeft, offsetY, 45, 0.6)
    everywhere.path(path0)
    context.font = `1rem sans-serif`
    context.textAlign = "left"
    context.textBaseline = "middle"
    context.fillText("frame size", x0 + 5, y0)

    // add braces

    context.font = `1rem sans-serif`
    let [path, x, y] = makeCurlyBrace(holeLeft, holeBottom, holeLeft + holeWidth, holeBottom, 60, 0.6)

    everywhere.path(path)

    let [path2, x2, y2] = makeCurlyBrace(holeLeft + holeWidth, holeBottom, holeLeft + pairWidth, holeBottom, 60, 0.6)
    everywhere.path(path2)
    context.textAlign = "left"
    context.textBaseline = "top"
    context.fillText("1:", x - 5, y + 5)
    context.textAlign = "center"
    context.fillText(ratio.toString(), x2, y2 + 5)
}

