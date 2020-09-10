import { getDrawingCommands, addRow } from "./commands-table"
import { setDrawingType } from "./form-interaction"
function getInput(id: string): HTMLInputElement {
    return document.getElementById(id) as unknown as HTMLInputElement
}

export function parseSettings(ignore3d = false): Object {
    let settings = {}

    settings["axiom"] = getInput("axiom").value


    let rules = getInput("rules").value;
    let rulesMap = new Map();
    for (let line of rules.split("\n")) {
        let parts = line.split("=>")
        if (parts.length > 1)
            rulesMap.set(parts[0], parts[1].split(""))
    }
    settings["rules"] = rulesMap

    let drawing_check = (document.querySelector('input[name="drawingRadio"]:checked') as HTMLInputElement).value;
    switch (drawing_check) {
        case "Standard":
            let angle = parseFloat(getInput("drawing_standard_degrees").value)
            if (isNaN(angle) || !isFinite(angle)) {
                throw new Error(`There was a problem with the angle you specified - "${getInput("drawing_standard_degrees").value}" is not a valid, finite number.`)
            }
            let map = new Map();
            map.set("F", (state) => state.draw())
            map.set("G", (state) => state.draw())
            map.set("+", (state) => state.right(angle))
            map.set("-", (state) => state.left(angle))
            map.set("X", (state) => state.right(angle))
            map.set("Y", (state) => state.left(angle))
            map.set("[", (state) => state.save())
            map.set("]", (state) => state.restore())
            settings["commands"] = map;

            break;
        case "Advanced":
            let [commands, orig] = getDrawingCommands()
            settings["commands"] = commands


    }


    if (!ignore3d) {

        let nlStr = getInput("num_layers").value
        let nlInt = parseInt(nlStr, 10)
        if (isNaN(nlInt) || !isFinite(nlInt) || nlInt < 1) {
            throw new Error(`The thickness you gave, "${nlStr}" was not a valid, finite integer above 0.`)
        }
        settings["num_layers"] = nlInt

        settings["draw_axiom_check"] = getInput("draw_axiom_check").checked

        let ldStr = getInput("layer_dist").value
        let ldFloat = parseFloat(ldStr)
        if (isNaN(ldFloat) || !isFinite(ldFloat) || nlInt < 0) {
            throw new Error(`The thickness you gave, "${ldStr}" was not a valid, finite number above 0.`)
        }
        settings["layer_dist"] = ldFloat




        settings["scale_factor"] = parseScaleFactor()

        let thicken_check = getInput("thicken_check").checked
        settings["thicken"] = thicken_check
        if (thicken_check) {
            let str = getInput("thicken_width").value
            let val = parseFloat(str)
            settings["thickness"] = val
            if (isNaN(val) || !isFinite(val)) {
                throw new Error(`The thickness you gave, "${str}" was not a valid, finite number.`)
            }
        }

        let curve_check = getInput("curve_check").checked
        settings["curve"] = curve_check
        if (curve_check) {
            let str = getInput("curve_frac").value
            let val = parseFloat(str)
            settings["curve_frac"] = val
            if (isNaN(val) || !isFinite(val) || val < 0 || val > 50) {
                throw new Error(`The curve fraction you gave, "${str}" was not a valid, finite number between 0 and 50%.`)
            }
        }

        let hole_radio = (document.querySelector('input[name="hole_radio"]:checked') as HTMLInputElement).value;
        // Note arrays are because rust msgpack serialises oddly - the arrays are in the same format as the rust enum HoleOptions
        switch (hole_radio) {
            case "None":
                settings["hole"] = [1, []]
                break;
            case "ParallelOnly":
                let str = getInput("frame_factor").value
                let val = parseFloat(str)
                if (isNaN(val) || !isFinite(val) || val < 0 || val > 50) {
                    throw new Error(`The frame size you input, "${str}" was not a valid, finite number between 0 and 50%.`)
                }
                settings["hole"] = [1, [val * 0.01]]
                break;
            case "Everywhere":
                let holeStr = getInput("ev_hole_number").value
                let num_holes = parseInt(holeStr, 10)
                if (isNaN(num_holes) || !isFinite(num_holes) || val < 1) {
                    throw new Error(`The number of holes you asked for, "${str}" was not a valid, finite integer above 0`)
                }

                let ratioStr = getInput("ev_ratio").value
                let ratio = parseFloat(ratioStr)
                if (isNaN(ratio) || !isFinite(ratio) || ratio < 0) {
                    throw new Error(`Your hole:solid ratio, "${str}" was not a valid, postive, finite number.`)
                }

                let fstr = getInput("ev_frame_percent").value
                let fval = parseFloat(fstr)
                if (isNaN(fval) || !isFinite(fval) || fval < 0 || fval > 50) {
                    throw new Error(`The frame size you input, "${str}" was not a valid, finite number between 0 and 50%.`)
                }
                let pair = 1 + ratio
                let pair_frac = 1.0 / (num_holes * (1 + ratio))

                settings["hole"] = [2,
                    [
                        1 / pair * pair_frac,
                        ratio / pair * pair_frac,
                        settings["scale_factor"],
                        0.01 * fval
                    ]
                ]
                break;

        }
    }
    return settings
}

export function parseScaleFactor() {
    let sf = null
    let scale_radio = (document.querySelector('input[name="scale_radio"]:checked') as HTMLInputElement).value;
    switch (scale_radio) {
        case "half":
            sf = 1 / 2.0
            break;
        case "sqrt2":
            sf = Math.SQRT1_2
            break;
        case "sqrt3":
            sf = 1.0 / Math.sqrt(3)
            break;
        case "other":
            let str = getInput("scaling_factor_other").value
            let val = parseFloat(str)
            sf = val
            if (isNaN(val) || !isFinite(val)) {
                throw new Error(`The scaling factor you input, "${str}" was not a valid, finite number.`)
            }
            break;
        default:
            throw new Error(`An error occured - the scale was set to an invalid value, "${scale_radio}"`)
    }
    return sf
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

    let [_, advanced] = getDrawingCommands(true)
    settings["advancedCommands"] = advanced

    return settings
}

export function importAllSettings(settings: Object) {

    // worst this can do is set values to be undefined, which isn't too bad
    for (let input of all_inputs) {
        getInput(input).value = settings[input]
    }
    for (let input of all_checks) {
        getInput(input).checked = settings[input]
    }
    for (let radio of all_radios) {
        document.querySelectorAll(`input[name="${radio}"]`).forEach((el: HTMLInputElement) => {
            if (el.value === settings[radio]) {
                el.checked = true;
            }
        })

    }
    if (Array.isArray(settings["advancedCommands"])) {
        for (let pair of settings["advancedCommands"]) {
            addRow(pair[0], pair[1])
        }
    }
    else {
        setDefaultAdvancedCommands()
    }


}

export function setDefaultAdvancedCommands() {
    let standardCommands = [
        ["F", "state.draw();"],
        ["G", "state.draw(); "],
        ["+", "state.right(60);"],
        ["-", "state.left(60);"],
        ["X", "state.right(60);"],
        ["Y", "state.left(60);"],
        ["[", "state.save();"],
        ["]", "state.restore();"],
    ]

    for (let pair of standardCommands) {
        addRow(pair[0], pair[1])
    }
}
