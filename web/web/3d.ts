import * as THREE from "three"
import "./tests.css"
import { Simple3D as SimpleDevFract } from "../3d/simple"
import { State } from "../lsystems/tosvg"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { STLExporter } from "three/examples/jsm/exporters/STLExporter"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader"

import "../main.ts"
// settings import
// Global variables ==========
let axiom: Array<string>, alphabet: Array<string>, num: number = null
let rules: Map<string, Array<string>> = new Map()
let initZSep: number = null
let zSepMult: number = null
let xyFactor: number = null
let numLayers: number = null
let drawAxiom: boolean = null
let thicken: boolean = null
let thickness: number = null
let curve: boolean = null
let maxCurveFrac: number = null
let curveSteps: number = null
let commands = new Map<string, (state: State) => void>()
// Examples for testing: koch curve & sierpinski dragon:

// curved sierpinski:
// http://localhost:8000/3d.html?settingsIn=http%3A%2F%2Flocalhost%3A8000%2F2d.html%3Faxiom%3DX%252CA%26alphabet%3DX%253BY%253BA%253BB%253B%252B%253B-%26rules%3DA%253EB%252C-%252CA%252C-%252CB%253BB%253EA%252C%252B%252CB%252C%252B%252CA%253BX%253EY%253BY%253EX%26n%3D5%26symbol%253A0%3DA%26function%253A0%3Dstate.draw%2528%2529%253B%26symbol%253A1%3DB%26function%253A1%3Dstate.draw%2528%2529%253B%26symbol%253A2%3D-%26function%253A2%3Dstate.right%2528state.state%255B%2522a%2522%255D%2529%26symbol%253A3%3D%252B%26function%253A3%3Dstate.left%2528state.state%255B%2522a%2522%255D%2529%26symbol%253A4%3DX%26function%253A4%3Dstate.state%255B%2522a%2522%255D%2B%253D%2B-60%26symbol%253A5%3DY%26function%253A5%3D%2B%2B%2Bstate.right%252860%2529%253B%250A%2B%2B%2B%2Bstate.state%255B%2522a%2522%255D%2B%253D%2B-60&init_z_sep=25&z_sep_mult=0.5&num_layers=3&axiomCheck=false&xy_scale_factor=0.5&curveCheck=true&thickness=0.1&max_curve_frac=0.5&steps_multiplier=4

// curved koch curve
// 2d work:
// http://localhost:8000/2d.html?axiom=F&alphabet=F%3B%2B%3B-&rules=F%3EF%2C%2B%2CF%2C-%2CF%2C-%2CF%2C%2B%2CF&n=5&symbol%3A0=F&function%3A0=state.draw%28%29%3B&symbol%3A1=-&function%3A1=state.left%2890%29&symbol%3A2=%2B&function%3A2=state.right%2890%29

// in 3d:
// http://localhost:8000/3d.html?settingsIn=http%3A%2F%2Flocalhost%3A8000%2F2d.html%3Faxiom%3DF%26alphabet%3DF%253B%252B%253B-%26rules%3DF%253EF%252C%252B%252CF%252C-%252CF%252C-%252CF%252C%252B%252CF%26n%3D5%26symbol%253A0%3DF%26function%253A0%3Dstate.draw%2528%2529%253B%26symbol%253A1%3D-%26function%253A1%3Dstate.left%252890%2529%26symbol%253A2%3D%252B%26function%253A2%3Dstate.right%252890%2529&init_z_sep=25&z_sep_mult=0.33333333&num_layers=3&axiomCheck=false&xy_scale_factor=0.33333333&curveCheck=true&thickness=0.1&max_curve_frac=0.5&steps_multiplier=4

// Main run method ==========
async function run() {
    removeDisplay();
    parseSettings();

    let fractalGenerator = new SimpleDevFract(axiom, rules, commands)

    let segments = fractalGenerator.runN(zSepMult, initZSep, xyFactor, numLayers, drawAxiom)

    let query = new URLSearchParams("");
    query.set("thicken", thicken.toString())
    if (thicken){
        query.set("thickness", thickness.toString())
    }
    query.set("curve", curve.toString())
    if (curve) {
        query.set("max_curve_frac", maxCurveFrac.toString())
        query.set("steps_multiplier", curveSteps.toString())
    }


    let response = await fetch(`/api/stl?${query.toString()}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(segments)
    })
    let stl = await response.blob()
    displaySTL(stl)
}


// Helper ===================

function getElById<T>(id: string): T {
    return document.getElementById(id) as unknown as T
}

// Querystring save/load =====

let inputs = ["settingsIn", "init_z_sep", "z_sep_mult", "num_layers", "axiomCheck", "xy_scale_factor", "curveCheck", "thickness", "curveCheck", "max_curve_frac", "steps_multiplier"]
function toQueryStringInURL() {
    let params = new URLSearchParams("")
    function save(name: string) {
        if (name.indexOf("Check") >= 0) {
            params.set(name, getElById<HTMLInputElement>(name).checked.toString())
        } else {
            params.set(name, getElById<HTMLInputElement>(name).value)
        }
    }

    inputs.forEach(save);
    let str = params.toString()
    return [location.protocol, '//', location.host, location.pathname, "?", str, location.hash].join('');
}

function fromQueryString() {
    let params = new URLSearchParams(window.location.search)
    function load(name: string) {
        if (params.has(name)) {
            if (name.indexOf("Check") >= 0) {
                getElById<HTMLInputElement>(name).checked = params.get(name) as unknown as boolean
            } else {
                getElById<HTMLInputElement>(name).value = params.get(name)
            }
        }
    }
    inputs.forEach(load);

}

// parse settings from user input ====

function parse2dURL(urlstr: string) {
    let url = new URL(urlstr)
    let params = url.searchParams
    if (params.has("axiom")) {
        axiom = params.get("axiom").split(',')
    }
    if (params.has("alphabet")) {
        alphabet = params.get("alphabet").split(';')
    }
    if (params.has("rules")) {
        params.get("rules").split(';').forEach((str: string) => {
            var parts = str.split('>')

            rules.set(parts[0], parts[1].split(","))
        })
    }


    params.forEach((value, key, _) => {
        console.log(key)
        if (key.startsWith("symbol:")) {
            let index = parseInt(key.replace("symbol:", ""))
            if (params.has("function:" + index)) {
                let func = new Function("state", params.get("function:" + index))
                // @ts-ignore - this is to avoid function typing issues
                commands.set(params.get(key), func)
                //addRow(value, params.get("function:" + index))
            } else {
                console.warn("Missing function to go with a symbol!!")
            }
        }
    })
}

function parseSettings() {
    let url = getElById<HTMLInputElement>("settingsIn").value;
    parse2dURL(url);

    initZSep = getElById<HTMLInputElement>("init_z_sep").value as unknown as number;
    zSepMult = getElById<HTMLInputElement>("z_sep_mult").value as unknown as number;
    numLayers = getElById<HTMLInputElement>("num_layers").value as unknown as number;

    drawAxiom = getElById<HTMLInputElement>("axiomCheck").checked as unknown as boolean;

    xyFactor = getElById<HTMLInputElement>("xy_scale_factor").value as unknown as number;

    thicken = getElById<HTMLInputElement>("thickenCheck").checked as unknown as boolean;


    thickness = getElById<HTMLInputElement>("thickness").value as unknown as number;

    curve = getElById<HTMLInputElement>("curveCheck").checked as unknown as boolean;

    maxCurveFrac = getElById<HTMLInputElement>("max_curve_frac").value as unknown as number;

    curveSteps = getElById<HTMLInputElement>("steps_multiplier").value as unknown as number;


}

let triScene: THREE.Scene = null;
let triMaterial = new THREE.MeshPhongMaterial({ color: 0xdddddd, specular: 0x999999, shininess: 30, flatShading: true, side: THREE.DoubleSide })
let trisMesh: THREE.Mesh = null;
function setupScene() {
    triScene = new THREE.Scene();
    // set up cameras
    let vWidth = 200
    let camera = new THREE.OrthographicCamera(vWidth / -2, vWidth / 2, vWidth / 2, vWidth / -2, -2000, 2000)


    let triRenderer = new THREE.WebGLRenderer({ antialias: true });
    triRenderer.setPixelRatio(window.devicePixelRatio);
    triRenderer.setSize(window.innerWidth, window.innerHeight);
    triRenderer.setClearColor(0xEEEEEE);
    document.getElementById("triangles").appendChild(triRenderer.domElement);

    // add controls
    let controls = new OrbitControls(camera, triRenderer.domElement);

    camera.position.y = 0
    camera.position.x = 0
    camera.position.z = -5
    camera.lookAt(0, 0, 0)
    controls.update();
    camera.zoom = 3.5
    controls.update()


    triScene.add(new THREE.AmbientLight(0x111111));

    let pointLight = new THREE.PointLight(0xffffff, 1);
    triScene.add(pointLight);

    function update() {
        requestAnimationFrame(update);
        controls.update()
        triRenderer.render(triScene, camera)
    }
    update();
    setupSTLExport();

}

// Tris display, STL output
function removeDisplay() {
    if (trisMesh != null) {
        triScene.remove(trisMesh)
        trisMesh.geometry.dispose()
        trisMesh = null;
    }

}

async function displaySTL(stl: Blob) {

    let loader = new STLLoader();
    let geom = loader.parse(await stl.arrayBuffer())
    trisMesh = new THREE.Mesh(geom, triMaterial)

    triScene.add(trisMesh)



}
// STL exporting
function setupSTLExport() {
    var saveLink = document.createElement('a')
    saveLink.style.display = 'none'
    document.body.appendChild(saveLink)

    function exportSTL() {
        var exporter = new STLExporter()
        if (trisMesh != null) {
            var res = exporter.parse(trisMesh)

            saveLink.href = URL.createObjectURL(new Blob([res], { type: 'text/plain' }))
            saveLink.download = "fractal.stl"
            saveLink.click()
        }
    }

    document.getElementById("meshSave").addEventListener("click", exportSTL)

}

function saveToLink() {
    // generate new url
    let newURL = toQueryStringInURL()

    // update current w/o reloading
    if (history.pushState) {
        window.history.pushState({ path: newURL }, '', newURL)
    }
    // add to clipboard??
    copyToClipboard(newURL)
    document.getElementById("saveNotif").style.display = "inline"
    setTimeout(() => {
        document.getElementById("saveNotif").style.display = "none"
    }, 20 * 1000);
}

function copyToClipboard(text: string) {
    // from https://stackoverflow.com/questions/33855641/copy-output-of-a-javascript-variable-to-the-clipboard
    var dummy = document.createElement("textarea");
    // to avoid breaking orgain page when copying more words
    // cant copy when adding below this code
    // dummy.style.display = 'none'
    document.body.appendChild(dummy);
    //Be careful if you use texarea. setAttribute('value', value), which works with "input" does not work with "textarea". – Eduard
    dummy.value = text;
    dummy.select();
    document.execCommand("copy");
    document.body.removeChild(dummy);
}


document.getElementById("run").addEventListener("click", run, false)

document.getElementById("saveToLinkButton").addEventListener("click", saveToLink, false);

(() => {
    setupScene();
    fromQueryString();
})();