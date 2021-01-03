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


import { encode } from "@msgpack/msgpack"

// to fix parcel
import 'regenerator-runtime/runtime'


async function preview() {
    await run(false)
}
async function download() {
    await run(true)
}
async function run(download: boolean) {
    document.getElementById("gen-error").style.display = "none"
    try {
        await runE(download)
    } catch (e) {
        console.warn("Error thrown", e)
        document.getElementById("gen-error").style.display = "block"
        document.getElementById("gen-error-body").textContent = e.message
    }
}

async function runE(download: boolean) {
    removeDisplay();
    document.getElementById("url-alert-box").style.display = "none"
    let settings = parseSettings();
    let fractalGenerator = new SimpleDevFract(settings["axiom"], settings["rules"], settings["commands"])
    let layers = fractalGenerator.runN(settings["scale_factor"], settings["layer_dist"] * settings["line_length"], settings["line_length"], settings["num_layers"], settings["centre_check"])
    let query = new URLSearchParams("");
    query.set("thicken", settings["thicken"])
    if (settings["thicken"]) {
        query.set("top_thickness", settings["top_thickness"].toString())
        query.set("bottom_thickness", settings["bottom_thickness"].toString())
    }

    query.set("curve", settings["curve"].toString())
    if (settings["curve"]) {
        query.set("max_curve_frac", (0.01 * settings["curve_frac"]).toString())
        query.set("curve_steps_mult", "7.0") // TODO add presets
    }

    query.set("extrude", settings["extrude"].toString())
    if (settings["extrude"]) {
        query.set("extrude_dist", settings["extrude_dist"].toString())

    }

    query.set("init_steps", "12")
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
    if (download) {
        let a = document.createElement("a")
        a.href = window.URL.createObjectURL(stl);
        a.download = "fractal.stl"
        document.body.appendChild(a)
        a.click()
        a.remove()
    }
    else {
        await displaySTL(stl)
    }

}



(() => {
    fromQueryString();
    setupScene();
    setupTables();
    document.getElementById("preview").addEventListener("click", preview);
    document.getElementById("download_btn").addEventListener("click", download);
    setupInteractions();
    setupDiagrams();

})();