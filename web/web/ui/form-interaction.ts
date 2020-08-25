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
    document.getElementById("curve-diagram-help").style.display = curve ? "block" : "none"

    let thicken = getInput("thicken_check").checked
    getInput("thicken_width").disabled = !thicken;
}

export function setupInteractions() {
    document.querySelectorAll("input[type=radio][name=drawingRadio]").forEach((rad: HTMLInputElement) => {
        rad.addEventListener("change", (ev) => {
            if ((ev.target as HTMLInputElement).checked) {
                updateDrawingOptions()
            }
        })
    })
    getDiv("custom_drawing_commands").style.display = "none"
    if (getInput("drawingRadioAdvanced").checked) {
        updateDrawingOptions()
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
    updateLiveOutputs();


    document.querySelectorAll("#scale_radio_container>label").forEach(element => {
        element.addEventListener("click", () => {
            document.querySelectorAll("#scale_radio_container>label").forEach(element => element.classList.remove("active"));
            element.classList.add("active")

        })
    });
    getInput("scaling_factor_other").addEventListener("change", () => {
        document.querySelectorAll("#scale_radio_container>label").forEach(element => element.classList.remove("active"));
        let label = getInput("scale_other");
        label.classList.add("active");
        label.firstElementChild.checked = true;
    })
}

function updateLiveOutputs() {
    function stepLength() {
        getOutput("slider_val").value = parseInt(getInput("layer_dist").value) + '% of the step length on each layer'
    }
    stepLength()
    document.getElementById("step_length_form").addEventListener("input", stepLength)

    function thickenWidth() {

        getOutput("thicken_output").value = getInput("thicken_width").value
    }
    thickenWidth()
    document.getElementById("thicken_form").addEventListener("input", thickenWidth)
}