
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


import { encode, decode } from "@msgpack/msgpack"

// to fix parcel
import 'regenerator-runtime/runtime'



// Main run method ==========
async function run() {
    document.getElementById("gen-error").style.display = "none"
    try {
        await runE()
    } catch (e) {
        console.warn("Error thrown", e)
        document.getElementById("gen-error").style.display = "block"
        document.getElementById("gen-error-body").textContent = e.message
    }
}

async function runE() {
    removeDisplay();
    document.getElementById("url-alert-box").style.display = "none"
    let settings = parseSettings();

    let fractalGenerator = new SimpleDevFract(settings["axiom"], settings["rules"], settings["commands"])

    let layers = fractalGenerator.runN(settings["scale_factor"], settings["layer_dist"], settings["scale_factor"], settings["num_layers"], settings["centre_check"])
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

    let small_layers = layers.map((layer) =>
        layer.map((line) => [line.start.x, line.start.y, line.start.z, line.end.x, line.end.y, line.end.z])
    )
    let data = [small_layers, settings["hole"]]

    let msgpack = encode(data)

    let response = await fetch(`/api/stl?${query.toString()}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/msgpack"
        },
        body: msgpack
    })
    if (!response.ok) {
        throw new Error(`The server returned an error: code ${response.status}, body: ${response.body}`)
    }
    let stl = await response.blob()
    await displaySTL(stl)
}



(() => {
    fromQueryString();
    setupScene();
    setupTables();
    document.getElementById("run").addEventListener("click", run, false);
    setupInteractions();
    setupDiagrams()

})();