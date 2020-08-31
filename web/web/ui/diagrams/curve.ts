import rough from "roughjs/bin/rough"
import { RoughCanvas } from "roughjs/bin/canvas";
import { getInput, makeCurlyBrace } from "./helpers"

let curve: RoughCanvas = null
let curveCanvas = null


export function curveSetup() {
    curveCanvas = document.getElementById("curve-diagram") as HTMLCanvasElement
    // curveCanvas.style.width = "100%"
    // curveCanvas.width = curveCanvas.offsetWidth;
    curve = rough.canvas(curveCanvas, { options: { roughness: 0.5 } })


    getInput("curve_frac").addEventListener("input", draw)
    draw()
}

function length(a) {
    return Math.sqrt(a.x * a.x + a.y * a.y)
}
function draw() {
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
