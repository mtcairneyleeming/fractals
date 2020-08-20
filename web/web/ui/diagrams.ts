import rough from "roughjs/bin/rough"
import { RoughCanvas } from "roughjs/bin/canvas";
function getInput(id: string): HTMLInputElement {
    return document.getElementById(id) as unknown as HTMLInputElement
}


let everywhere: RoughCanvas = null
let everywhereCanvas: HTMLCanvasElement = null
let curve: RoughCanvas = null
let curveCanvas = null
export function setupDiagrams() {
    everywhereCanvas = document.getElementById("everywhere-diagram") as HTMLCanvasElement;
    everywhere = rough.canvas(everywhereCanvas);
    curveCanvas = document.getElementById("curve-diagram") as HTMLCanvasElement
    curveCanvas.style.width = "100%"
    curveCanvas.width = curveCanvas.offsetWidth;
    curve = rough.canvas(curveCanvas, { options: { roughness: 0.5 } })


    getInput("ev_hole_number").addEventListener("change", updateEverywhere)
    getInput("ev_ratio").addEventListener("change", updateEverywhere)
    getInput("ev_frame_percent").addEventListener("change", updateEverywhere)
    getInput("curve_frac").addEventListener("change", drawCurve)
    drawCurve()
    updateEverywhere()
}

function length(a) {
    return Math.sqrt(a.x * a.x + a.y * a.y)
}
function drawCurve() {
    // TODO add more construction lines
    let max_curve_frac = getInput("curve_frac").value as unknown as number * 0.01
    let h = curveCanvas.height; let w = curveCanvas.width;
    let a = { x: w * 0.2, y: h * 0.95 };
    let b = { x: w * 0.5, y: h * 0.15 }; // = next.start
    let c = { x: w * 0.75, y: h * 0.95 };
    // direction vectors
    let pv = { x: -b.x + a.x, y: -b.y + a.y }; // b to a
    let nv = { x: -b.x + c.x, y: -b.y + c.y }; // b to c
    let pl = length(pv);
    let nl = length(nv);
    let npv = { x: pv.x / pl, y: pv.y / pl }
    let nnv = { x: nv.x / nl, y: nv.y / nl }

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
    console.log(centre, radius, h, w)
    curve.circle(centre.x, centre.y, radius * 2);
    curve.line(a.x, a.y, b.x, b.y)
    curve.line(b.x, b.y, c.x, c.y)
    curve.circle(centre.x, centre.y, 4, { fill: "black" })


    let [path0, x0, y0] = makeCurlyBrace(b.x, b.y, b.x + max_curve_frac * pv.x, b.y + max_curve_frac * pv.y, 15, 0.6)
    curve.path(path0)
    let context = curveCanvas.getContext("2d")
    context.font = `1rem sans-serif`
    context.textAlign = "right"
    context.textBaseline = "middle"
    context.fillText("max curve frac", x0 - 5, y0)
    let [path1, x1, y1] = makeCurlyBrace(b.x + max_curve_frac * nv.x, b.y + max_curve_frac * nv.y, b.x, b.y, 15, 0.6)
    curve.path(path1)
    context.textAlign = "left"
    context.textBaseline = "middle"
    context.fillText("max curve frac", x1 + 5, y1)
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
    console.log("T", path0, x0, y0)
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
