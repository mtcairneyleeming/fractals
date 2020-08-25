import rough from "roughjs/bin/rough"
import { RoughCanvas } from "roughjs/bin/canvas";
// @ts-ignore
let Offset = require("polygon-offset")
import { off } from "@svgdotjs/svg.js";
import { parseScaleFactor } from "./settings";
function getInput(id: string): HTMLInputElement {
    return document.getElementById(id) as unknown as HTMLInputElement
}


let everywhere: RoughCanvas = null
let everywhereCanvas: HTMLCanvasElement = null
let curve: RoughCanvas = null
let curveCanvas = null

let parallel: RoughCanvas = null
let parallelCanvas = null

let layers: RoughCanvas = null
let layersCanvas = null
export function setupDiagrams() {
    everywhereCanvas = document.getElementById("everywhere-diagram") as HTMLCanvasElement;
    everywhere = rough.canvas(everywhereCanvas);
    curveCanvas = document.getElementById("curve-diagram") as HTMLCanvasElement
    // curveCanvas.style.width = "100%"
    // curveCanvas.width = curveCanvas.offsetWidth;
    curve = rough.canvas(curveCanvas, { options: { roughness: 0.5 } })

    parallelCanvas = document.getElementById("parallel-diagram") as HTMLCanvasElement
    // parallelCanvas.style.width = "100%"
    // parallelCanvas.width = parallelCanvas.offsetWidth;
    parallel = rough.canvas(parallelCanvas, { options: { roughness: 0.5 } })

    layersCanvas = document.getElementById("layer-diagram") as HTMLCanvasElement
    // layersCanvas.style.width = "100%"
    // layersCanvas.width = layersCanvas.offsetWidth;
    layers = rough.canvas(layersCanvas, { options: { roughness: 0.5 } })


    getInput("ev_hole_number").addEventListener("input", updateEverywhere)
    getInput("ev_ratio").addEventListener("input", updateEverywhere)
    getInput("ev_frame_percent").addEventListener("input", updateEverywhere)
    getInput("curve_frac").addEventListener("input", drawCurve)
    getInput("frame_factor").addEventListener("input", drawParallel)
    getInput("num_layers").addEventListener("input", drawLayers)
    getInput("draw_axiom_check").addEventListener("input", drawLayers)
    getInput("layer_dist").addEventListener("input", drawLayers)

    document.querySelectorAll("#scale_radio_container>label").forEach(el => el.addEventListener("click", drawLayers))
    getInput("scaling_factor_other").addEventListener("input", drawLayers)
    drawCurve()
    updateEverywhere()
    drawParallel()
    drawLayers()
}

function length(a) {
    return Math.sqrt(a.x * a.x + a.y * a.y)
}
function drawCurve() {
    let context = curveCanvas.getContext("2d")
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, curveCanvas.width, curveCanvas.height);

    let max_curve_frac = getInput("curve_frac").value as unknown as number * 0.01


    let h = curveCanvas.height; let w = curveCanvas.width;
    let a = { x: w * 0.3, y: h * 0.25 };
    let b = { x: w * 0.5, y: h * 0.15 }; // = next.start
    let c = { x: w * 0.75, y: h * 0.95 };
    // direction vectors
    let pv = { x: -b.x + a.x, y: -b.y + a.y }; // b to a
    let nv = { x: -b.x + c.x, y: -b.y + c.y }; // b to c
    let pl = length(pv);
    let nl = length(nv);
    let npv = { x: pv.x / pl, y: pv.y / pl }
    let nnv = { x: nv.x / nl, y: nv.y / nl }


    if (max_curve_frac < Number.EPSILON * 100) {
        // draw just straight lines
        curve.line(a.x, a.y, b.x, b.y, { stroke: "blue", strokeWidth: 2 })
        curve.line(b.x, b.y, c.x, c.y, { stroke: "blue", strokeWidth: 2 })
    } else {

        if (max_curve_frac > 0.5) {
            max_curve_frac = 0.5
        }
        // angle between AB & BC
        let angle_between_lines = Math.acos(-npv.x * -nnv.x + -npv.y * -nnv.y)
        let bisect_tangent_angle = (Math.PI - angle_between_lines) / 2.0;
        let smaller_side_length = Math.min(pl, nl) * max_curve_frac;

        // calculate the radius of a circle tangent to AB & BC that touches each
        // smaller_side_length away from B.
        let radius = smaller_side_length / Math.tan(bisect_tangent_angle);




        // the distance from B to the centre of the circle
        let bisector_length = smaller_side_length / Math.sin(bisect_tangent_angle);
        let added = { x: (npv.x + nnv.x), y: (npv.y + nnv.y) }
        let norm_added = { x: added.x / length(added), y: added.y / length(added) }
        let centre = {
            x: norm_added.x * bisector_length + b.x,
            y: norm_added.y * bisector_length + b.y
        }

        let scale_factor = 1; // TODO find better scaling factor
        context.translate(centre.x, 0)
        context.scale(scale_factor, scale_factor)
        context.translate(-centre.x, 0)

        let ab_tangent_point = { x: b.x + smaller_side_length / pl * pv.x, y: b.y + smaller_side_length / pl * pv.y }

        let bc_tangent_point = { x: b.x + smaller_side_length / nl * nv.x, y: b.y + smaller_side_length / nl * nv.y }



        // draw full lines for final curve, dotted/dashed for construction lines


        let start_angle = Math.atan2(ab_tangent_point.y - centre.y, ab_tangent_point.x - centre.x)
        let end_angle = Math.atan2(bc_tangent_point.y - centre.y, bc_tangent_point.x - centre.x)

        curve.arc(centre.x, centre.y, radius * 2, radius * 2, start_angle, end_angle, false, { stroke: "blue", strokeWidth: 2 });
        curve.circle(centre.x, centre.y, radius * 2, { strokeLineDash: [1, 2] });
        curve.line(a.x, a.y, ab_tangent_point.x, ab_tangent_point.y, { stroke: "blue", strokeWidth: 2 })
        curve.line(ab_tangent_point.x, ab_tangent_point.y, b.x, b.y, { strokeLineDash: [1, 2] })

        curve.line(b.x, b.y, bc_tangent_point.x, bc_tangent_point.y, { strokeLineDash: [1, 2] })
        curve.line(bc_tangent_point.x, bc_tangent_point.y, c.x, c.y, { stroke: "blue", strokeWidth: 2 })

        curve.circle(centre.x, centre.y, 4, { fill: "black" })

        curve.line(centre.x, centre.y, bc_tangent_point.x, bc_tangent_point.y, { strokeLineDash: [1, 2] })

        curve.line(centre.x, centre.y, ab_tangent_point.x, ab_tangent_point.y, { strokeLineDash: [1, 2] })

        let abt_to_centre = { x: centre.x - ab_tangent_point.x, y: centre.y - ab_tangent_point.y }
        let norm_abtc = { x: abt_to_centre.x / length(abt_to_centre), y: abt_to_centre.y / length(abt_to_centre) }
        let size = 11

        // @ts-ignore
        curve.linearPath([
            [ab_tangent_point.x + size * npv.x,
            ab_tangent_point.y + size * npv.y],
            [ab_tangent_point.x + size * (npv.x + norm_abtc.x),
            ab_tangent_point.y + size * (npv.y + norm_abtc.y)],
            [ab_tangent_point.x + size * norm_abtc.x, ab_tangent_point.y + size * norm_abtc.y]
        ])

        let bct_to_centre = { x: centre.x - bc_tangent_point.x, y: centre.y - bc_tangent_point.y }
        let norm_bctc = { x: bct_to_centre.x / length(bct_to_centre), y: bct_to_centre.y / length(bct_to_centre) }


        // @ts-ignore
        curve.linearPath([
            [bc_tangent_point.x + size * nnv.x,
            bc_tangent_point.y + size * nnv.y],
            [bc_tangent_point.x + size * (nnv.x + norm_bctc.x),
            bc_tangent_point.y + size * (nnv.y + norm_bctc.y)],
            [bc_tangent_point.x + size * norm_bctc.x,
            bc_tangent_point.y + size * norm_bctc.y]
        ])

        let [path0, x0, y0] = makeCurlyBrace(b.x, b.y, b.x + max_curve_frac * pv.x, b.y + max_curve_frac * pv.y, 15, 0.6)
        curve.path(path0)

        context.font = `${1 / scale_factor}rem sans-serif`
        context.textAlign = "right"
        context.textBaseline = "middle"
        let nice_percentage = getInput("curve_frac").value // (max_curve_frac * 100).toFixed(0)
        if (parseFloat(nice_percentage) > 50) {
            nice_percentage = "50"
        }
        context.fillText(`${nice_percentage}% of this line`, x0 - 5, y0)
        let [path1, x1, y1] = makeCurlyBrace(b.x + max_curve_frac * nv.x, b.y + max_curve_frac * nv.y, b.x, b.y, 15, 0.6)
        curve.path(path1)
        context.textAlign = "left"
        context.textBaseline = "middle"
        context.fillText(`${nice_percentage}% of this line`, x1 + 5, y1)

    }
}

function drawLayers() {
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

function drawParallel() {
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

function updateEverywhere() {
    drawEverywhere(parseInt(getInput("ev_hole_number").value),
        parseFloat(getInput("ev_ratio").value),
        parseFloat(getInput("ev_frame_percent").value))
}

function drawEverywhere(num_holes: number, ratio: number, frame: number) {
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


// from http://bl.ocks.org/alexhornbake/6005176
function makeCurlyBrace(x1, y1, x2, y2, w, q): [string, number, number] {
    //Calculate unit vector
    var dx = x1 - x2;
    var dy = y1 - y2;
    var len = Math.sqrt(dx * dx + dy * dy);
    dx = dx / len;
    dy = dy / len;

    //Calculate Control Points of path,
    var qx1 = x1 + q * w * dy;
    var qy1 = y1 - q * w * dx;
    var qx2 = (x1 - .25 * len * dx) + (1 - q) * w * dy;
    var qy2 = (y1 - .25 * len * dy) - (1 - q) * w * dx;
    var tx1 = (x1 - .5 * len * dx) + w * dy;
    var ty1 = (y1 - .5 * len * dy) - w * dx;
    var qx3 = x2 + q * w * dy;
    var qy3 = y2 - q * w * dx;
    var qx4 = (x1 - .75 * len * dx) + (1 - q) * w * dy;
    var qy4 = (y1 - .75 * len * dy) - (1 - q) * w * dx;

    return [("M " + x1 + " " + y1 +
        " Q " + qx1 + " " + qy1 + " " + qx2 + " " + qy2 +
        " T " + tx1 + " " + ty1 +
        " M " + x2 + " " + y2 +
        " Q " + qx3 + " " + qy3 + " " + qx4 + " " + qy4 +
        " T " + tx1 + " " + ty1), tx1, ty1];
}
