import { getDrawingCommands, addRow } from "./commands-table"
import { setDrawingType } from "./form-interaction"
function getInput(id: string): HTMLInputElement {
    return document.getElementById(id) as unknown as HTMLInputElement
}

function getLabel(id: string): HTMLLabelElement {
    return document.getElementById(id) as unknown as HTMLLabelElement
}


let simple_inputs = [
    "axiom",
    "num_layers",
    "layer_dist",
    "rules"
]



export function parseSettings(): Object {
    let settings = {}
    for (let input of simple_inputs) {
        settings[input] = getInput(input).value;
    }

    let rules = getInput("rules").value;
    let rulesMap = new Map();
    for (let line of rules.split("\n")) {
        let parts = line.split(">")
        if (parts.length > 1)
            rulesMap.set(parts[0], parts[1].split(""))
    }
    settings["rules"] = rulesMap

    let drawing_check = (document.querySelector('input[name="drawingRadio"]:checked') as HTMLInputElement).value;
    switch (drawing_check) {
        case "Standard":
            let angle = parseFloat(getInput("drawing_standard_degrees").value)
            let map = new Map();
            map.set("F", (state) => state.draw())
            map.set("G", (state) => state.draw())
            map.set("+", (state) => state.right(angle))
            map.set("-", (state) => state.left(angle))
            map.set("[", (state) => state.save())
            map.set("]", (state) => state.restore())
            settings["commands"] = map;

            break;
        case "Advanced":
            let [commands, orig] = getDrawingCommands()
            settings["commands"] = commands


    }
    let scale_radio = (document.querySelector('input[name="scale_radio"]:checked') as HTMLInputElement).value;
    switch (scale_radio) {
        case "half":
            settings["scale_factor"] = 1 / 2.0
            break;
        case "sqrt2":
            settings["scale_factor"] = Math.SQRT1_2
            break;
        case "sqrt3":
            settings["scale_factor"] = 1.0 / Math.sqrt(3)
            break;
        case "other":
            settings["scale_factor"] = parseFloat(getInput("scaling_factor_other").value)
            break;
        default:
            throw new Error("Invalid scale radio setting, " + scale_radio)
    }

    let thicken_check = getInput("thicken_check").checked
    settings["thicken"] = thicken_check
    if (thicken_check) {

        settings["thickness"] = parseFloat(getInput("thicken_width").value)
    }

    let curve_check = getInput("curve_check").checked
    settings["curve"] = curve_check
    if (curve_check) {
        settings["curve_frac"] = parseFloat(getInput("curve_frac").value)
    }

    let hole_radio = (document.querySelector('input[name="hole_radio"]:checked') as HTMLInputElement).value;
    switch (hole_radio) {
        case "None":
            settings["hole"] = "None"
            break;
        case "ParallelOnly":
            settings["hole"] = {
                "ParallelOnly": {
                    "frame_factor": parseFloat(getInput("frame_factor").value)
                }
            }
            break;
        case "Everywhere":
            let num_holes = parseInt(getInput("ev_hole_number").value);

            let ratio = parseFloat(getInput("ev_ratio").value);
            let pair = 1 + ratio
            let pair_frac = 1.0 / (num_holes * (1 + ratio))

            settings["hole"] = {
                "Everywhere": {
                    "hole_frac": 1 / pair * pair_frac,
                    "spacing_frac": ratio / pair * pair_frac,
                    "scaling_factor": settings["scale_factor"],
                    "frame_factor": 0.01 * parseFloat(getInput("ev_frame_percent").value)
                }
            }
            break;

    }
    return settings
}

let all_inputs = [
    "drawing_standard_degrees",
    "axiom",
    "rules",
    "scaling_factor_other",
    "num_layers",
    "layer_dist",
    "thicken_width",
    "curve_frac",
    "ev_hole_number",
    "ev_ratio",
    "ev_frame_percent",
    "frame_factor"
]
let all_checks = [
    "draw_axiom_check",
    "thicken_check",
    "curve_check"
]

let all_radios = [
    "drawingRadio",
    "scale_radio",
    "hole_radio"
]

export function exportAllSettings() {
    let settings = {};
    for (let input of all_inputs) {
        settings[input] = getInput(input).value
    }
    for (let input of all_checks) {
        settings[input] = getInput(input).checked
    }
    for (let radio of all_radios) {
        settings[radio] = (document.querySelector(`input[name="${radio}"]:checked`) as HTMLInputElement).value
    }

    let [_, advanced] = getDrawingCommands()
    settings["advancedCommands"] = advanced

    return settings
}

export function importAllSettings(settings: Object) {

    for (let input of all_inputs) {
        getInput(input).value = settings[input]
    }
    for (let input of all_checks) {
        getInput(input).checked = settings[input]
    }
    for (let radio of all_radios) {
        document.querySelectorAll(`input[name="${radio}"]`).forEach((el: HTMLInputElement) => {
            if (el.value == settings[radio]) {
                el.checked = true;
            }
        })

    }
    if (Array.isArray(settings["advancedCommands"])) {
        for (let pair of settings["advancedCommands"]) {
            addRow(pair[0], pair[1])
        }
    }

}
