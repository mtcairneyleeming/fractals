
// custom css
import "./index.css"
// fractal work
import { Simple3D as SimpleDevFract } from "../3d/simple"
// ui components
import { setupTables } from "./ui/commands-table"
import { displaySTL, removeDisplay, setupScene } from "./ui/stl-viewer"
import { parseSettings } from "./ui/settings"
import { fromQueryString } from "./ui/url-save"
import { setupInteractions } from "./ui/form-interaction"
import { setupDiagrams } from "./ui/diagrams"
// styling
import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.css' // Import precompiled Bootstrap css
import '@fortawesome/fontawesome-free/css/all.css'

// to fix parcel
import 'regenerator-runtime/runtime'



// Main run method ==========
async function run() {
    removeDisplay();
    let settings = parseSettings();

    let fractalGenerator = new SimpleDevFract(settings["axiom"], settings["rules"], settings["commands"])

    let segments = fractalGenerator.runN(settings["scale_factor"], settings["layer_dist"], settings["scale_factor"], settings["num_layers"], settings["draw_axiom_check"])

    let query = new URLSearchParams("");
    query.set("thicken", settings["thicken"])
    if (settings["thicken"]) {
        query.set("thickness", settings["thickness"].toString())
    }
    query.set("curve", settings["curve"].toString())
    if (settings["curve"]) {
        query.set("max_curve_frac", (0.01 * settings["curve_frac"]).toString())
        query.set("curve_steps_mult", "7.0") // TODO add presets
    }

    query.set("init_steps", "15")
    query.set("step_scale", "1.0")

    let response = await fetch(`/api/stl?${query.toString()}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ "data": [segments, settings["hole"]] })
    })
    let stl = await response.blob()
    displaySTL(stl)
}



(() => {
    fromQueryString();
    setupScene();
    setupTables();
    document.getElementById("run").addEventListener("click", run, false);
    setupInteractions();
    setupDiagrams()

})();