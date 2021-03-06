import { showPreview } from "./previews/controller"
import { evaluate, round } from "mathjs"
import { parseScaleFactor } from "./settings"
function getInput(id: string): HTMLInputElement {
    return document.getElementById(id) as unknown as HTMLInputElement
}
function getOutput(id: string): HTMLOutputElement {
    return document.getElementById(id) as unknown as HTMLOutputElement
}

function getDiv(id: string): HTMLDivElement {
    return document.getElementById(id) as unknown as HTMLDivElement
}



export function setDrawingType(standard: boolean) {

    getInput("drawingRadioStandard").checked = standard
    getInput("drawingRadioAdvanced").checked = !standard
    getDiv("standard_drawing_commands").style.display = standard ? "block" : "none"

    getDiv("custom_drawing_commands").style.display = !standard ? "block" : "none"


}

function updateDrawingOptions() {
    let curr = (document.querySelector('input[name="drawingRadio"]:checked') as HTMLInputElement).value
    let standard = curr == "Standard"
    setDrawingType(standard)
}



export enum HoleType {
    None = 1,
    ParallelOnly,
    Everywhere
}

export function setHoles(type: HoleType, use_curr: boolean = false) {
    for (let i = 1; i <= 3; i++) {
        let input = getInput("hole_radio" + i).checked;
        if (use_curr && input) {
            type = i
        } else {
            input = i == type
        }
    }
    switch (type) {
        case HoleType.None:
            getDiv("parallel_hole_options").style.display = "none"
            getDiv("ev_hole_options").style.display = "none"
            break;
        case HoleType.ParallelOnly:
            getDiv("parallel_hole_options").style.display = "flex"
            getDiv("ev_hole_options").style.display = "none"
            break;
        case HoleType.Everywhere:
            getDiv("parallel_hole_options").style.display = "none"
            getDiv("ev_hole_options").style.display = "flex"
            break;
    }
}

function updateThickenAndCurve() {
    let curve = getInput("curve_check").checked
    getInput("curve_frac").disabled = !curve;

    document.getElementById("curve-diagram").style.display = curve ? "block" : "none"
    document.getElementById("curve-diagram-help").style.display = curve ? "block" : "none"

    let thicken = getInput("thicken_check").checked
    getInput("top_thicken_width").disabled = !thicken;

    getInput("bottom_thicken_width").disabled = !thicken;
}

export function setupInteractions() {
    // Initial setup

    updateDrawingOptions()

    setHoles(-1, true)

    // Add event handlers
    document.querySelectorAll("input[type=radio][name=drawingRadio]").forEach((rad: HTMLInputElement) => {
        rad.addEventListener("change", (ev) => {
            if ((ev.target as HTMLInputElement).checked) {
                updateDrawingOptions()
                showPreview()
            }
        })
    })

    getInput("curve_check").addEventListener("click", updateThickenAndCurve)

    getInput("thicken_check").addEventListener("click", updateThickenAndCurve)

    updateThickenAndCurve();

    document.querySelectorAll("input[type=radio][name=hole_radio]").forEach((rad: HTMLInputElement) => {
        rad.addEventListener("change", (ev) => {
            setHoles(parseInt(rad.id.replace("hole_radio", "")));
        });
    })

    updateLiveOutputs();

    getInput("axiom").addEventListener("input", showPreview)

    getInput("rules").addEventListener("input", showPreview)

    getInput("drawing_standard_degrees").addEventListener("input", showPreview)
    showPreview()

}

function updateLiveOutputs() {
    function stepLength() {
        getOutput("slider_val").value = round(parseFloat(getInput("layer_dist").value), 1) + '% of the step length on each layer'
    }
    stepLength()
    document.getElementById("step_length_form").addEventListener("input", stepLength)

    function evHoleScale() {
        let num = parseInt(getInput("ev_hole_number").value)
        let fac = parseInt(getInput("ev_hole_scale").value)
        getOutput("hole_scale_help_num").value = num.toString()

        getOutput("hole_scale_help_mult").value = `${fac}x${num}=${fac * num}`
    }
    evHoleScale()
    document.getElementById("ev_hole_number").addEventListener("input", evHoleScale)

    document.getElementById("ev_hole_scale").addEventListener("input", evHoleScale)
    function scaleFactor() {
        let val = "";
        try { val = round(evaluate(getInput("scaling_factor").value), 5) }
        catch (e) {
            val = "invalid expression"
        }
        getOutput("scaling_factor_out").value = val
    }
    getInput("scaling_factor").addEventListener("input", scaleFactor);
    scaleFactor()


    function layerLengths() {
        let len = round(parseFloat(getInput("line_length").value), 2);
        let sf = parseScaleFactor()

        getOutput("first_layer_line_length").value = len.toString() + "mm";
        getOutput("first_layer_line_length2").value = len.toString() + "mm";
        getOutput("second_layer_line_length").value = round(len * sf, 2).toString() + "mm";

    }
    layerLengths()
    getInput("line_length").addEventListener("input", layerLengths)

    getInput("scaling_factor").addEventListener("input", layerLengths)

    function extrudeDist() {
        getOutput("extrude_dist_out").value = parseInt(getInput("extrude_dist").value) + 'mm'
    }
    extrudeDist()
    document.getElementById("extrude_dist").addEventListener("input", extrudeDist)

    function modelHeight() {
        let num_layers = Math.max(parseInt(getInput("num_layers").value), 1)
        let line_length = parseFloat(getInput("line_length").value)
        let extrude = getInput("extrude_check").checked;
        let extrude_dist = parseFloat(getInput("extrude_dist").value)
        let dist_between = Math.max(0, Math.min(3.0, 0.01 * parseFloat(getInput("layer_dist").value)))
        let scale_factor = parseScaleFactor()


        let totalHeight = 0;
        let sf = 1;

        for (let i = 1; i < num_layers; i++) {
            totalHeight += sf * dist_between * line_length;
            sf *= scale_factor

        }
        if (extrude) {
            totalHeight += 2 * extrude_dist
        }

        getOutput("model_height").value = round(totalHeight, 2).toString() + "mm";
    }
    modelHeight()
    document.getElementById("extrude_dist").addEventListener("input", modelHeight)
    document.getElementById("extrude_check").addEventListener("input", modelHeight)
    document.getElementById("line_length").addEventListener("input", modelHeight)

    document.getElementById("layer_dist").addEventListener("input", modelHeight)
    document.getElementById("scaling_factor").addEventListener("input", modelHeight)

}

export function updateEstimatesFromPreviews(sf: number, x: number, y: number) {
    let len = parseFloat(getInput("line_length").value);
    getOutput("suggested_sf").value = round(sf, 5).toString();
    // note x and y were calculated with step length = 100
    getOutput("XY_dimensions").value = `${Math.round(x * len / 100)}mm x ${Math.round(y * len / 100)}mm`
}