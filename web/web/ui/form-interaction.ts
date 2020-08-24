function getInput(id: string): HTMLInputElement {
    return document.getElementById(id) as unknown as HTMLInputElement
}

function getDiv(id: string): HTMLDivElement {
    return document.getElementById(id) as unknown as HTMLDivElement
}



export function toggleDrawing() {
    let curr = (document.querySelector('input[name="drawingRadio"]:checked') as HTMLInputElement).value
    let standard = curr != "Standard"
    getInput("drawingRadioStandard").checked = standard
    getInput("drawingRadioAdvanced").checked = !standard


}

function toggleDrawingOptions() {
    let curr = (document.querySelector('input[name="drawingRadio"]:checked') as HTMLInputElement).value
    let standard = curr == "Standard"
    getDiv("standard_drawing_commands").style.display = standard ? "block" : "none"

    getDiv("custom_drawing_commands").style.display = !standard ? "block" : "none"
}

export enum HoleType {
    None = 1,
    ParallelOnly,
    Everywhere
}

export function setHoles(type: HoleType) {
    let curr = (document.querySelector('input[name="drawingRadio"]:checked') as HTMLInputElement).value
    let standard = curr != "Standard"

    for (let i = 1; i <= 3; i++) {
        getInput("hole_radio" + i).checked = i == type
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

    let thicken = getInput("thicken_check").checked
    getInput("thicken_width").disabled = !thicken;
}

export function setupInteractions() {
    document.querySelectorAll("input[type=radio][name=drawingRadio]").forEach((rad: HTMLInputElement) => {
        rad.addEventListener("change", (ev) => {
            if ((ev.target as HTMLInputElement).checked) {
                toggleDrawingOptions()
            }
        })
    })
    getDiv("custom_drawing_commands").style.display = "none"
    if (getInput("drawingRadioAdvanced").checked) {
        toggleDrawingOptions()
    }
    setHoles(HoleType.Everywhere)
    document.querySelectorAll("input[type=radio][name=hole_radio]").forEach((rad: HTMLInputElement) => {
        rad.addEventListener("change", (ev) => {
            setHoles(parseInt(rad.id.replace("hole_radio", "")));
        });

    })

    getInput("curve_check").addEventListener("click", updateThickenAndCurve)

    getInput("thicken_check").addEventListener("click", updateThickenAndCurve)

    updateThickenAndCurve();
}