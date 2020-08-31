import rough from "roughjs/bin/rough"
import { RoughCanvas } from "roughjs/bin/canvas";
import { getInput } from "./helpers"
// @ts-ignore
let Offset = require("polygon-offset")


let parallel: RoughCanvas = null
let parallelCanvas = null

export function parallelSetup() {
    parallelCanvas = document.getElementById("parallel-diagram") as HTMLCanvasElement
    // parallelCanvas.style.width = "100%"
    // parallelCanvas.width = parallelCanvas.offsetWidth;
    parallel = rough.canvas(parallelCanvas, { options: { roughness: 0.5 } })



    getInput("frame_factor").addEventListener("input", draw)
    draw()
}

function draw() {
    let context = parallelCanvas.getContext("2d")
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, parallelCanvas.width, parallelCanvas.height);
    context.translate(30, 0)
    let frame_size = parseFloat(getInput("frame_factor").value) * 0.01 // convert to 0-0.5 range
    frame_size = Math.max(0, Math.min(0.5, frame_size))

    let origTrapeziums = [
        [
            [0, 0], [100, 0], [120, 100], [-20, 100], [0, 0]
        ],
        [
            [0, 0], [90, 0], [60, 100], [30, 100], [0, 0]
        ],
        [
            [0, 0], [100, 0], [100, 100], [0, 100], [0, 0]
        ]
    ]
    let offsetPer = 120;
    for (let i = 0; i < origTrapeziums.length; i++) {
        parallel.polygon(origTrapeziums[i].map(a => [a[0] + i * offsetPer, a[1]]), { fill: "gray" })
        let min_side_length = Number.POSITIVE_INFINITY
        let was_unique = true
        for (let j = 0; j < 3; j++) {
            let c = origTrapeziums[i][j]
            let n = origTrapeziums[i][j + 1]
            let len = Math.sqrt((c[0] - n[0]) * (c[0] - n[0]) + (c[1] - n[1]) * (c[1] - n[1]))
            if (Math.abs(len - min_side_length) < Number.EPSILON * 10) {

                was_unique = false
            }
            if (len < min_side_length) {

                min_side_length = len
                was_unique = true
            }

        }
        var offset = new Offset();

        var inner = offset.data(origTrapeziums[i]).padding(frame_size * min_side_length)
        if (frame_size < 0.5 || was_unique) {
            parallel.polygon(inner[0].map(a => [a[0] + i * offsetPer, a[1]]), { fill: "white", fillStyle: "solid" })

        }
    }
}