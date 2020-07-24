import * as THREE from "three"
import "./tests.css"
import { Simple3D as SimpleDevFract } from "../3d/simple"
import { State } from "../lsystems/tosvg"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { STLExporter } from "three/examples/jsm/exporters/STLExporter"
import { Tri3d } from "../3d/types/Tri3d"

// settings import

let axiom: Array<string>, alphabet: Array<string>, num: number = null
let rules: Map<string, Array<string>> = new Map()

// Examples for testing: koch curve & sierpinski dragon:


// axiom = ["F"]
// alphabet = ["F", "+", "-"]
// rules.set("F", ["F", "+", "F", "-", "F", "-", "F", "+", "F"])
// rules.set("+", ["+"])
// rules.set("-", ["-"])
axiom = ["X", "A"]
alphabet = ["X", "Y", "A", "B", "+", "-"]
rules.set("A", ["B", "-", "A", "-", "B"])
rules.set("B", ["A", "+", "B", "+", "A"])
rules.set("+", ["+"])
rules.set("-", ["-"])
rules.set("X", ["Y"])
rules.set("Y", ["X"])
num = 5

let commands = new Map<string, (state: State) => void>()
// commands.set("F", (state) => { state.draw() })
// commands.set("+", (state) => { state.right(90) })
// commands.set("-", (state) => { state.left(90) })
commands.set("A", (state) => { state.draw() })
commands.set("B", (state) => { state.draw() })
commands.set("-", (state) => { state.right(state.state["a"]) })
commands.set("+", (state) => { state.left(state.state["a"]) })
commands.set("X", (state) => {
    state.state["a"] = -60
})
commands.set("Y", (state) => {
    state.right(60)
    state.state["a"] = -60
})

// run simple developing fractal generation

async function run() {

    let simple = new SimpleDevFract(axiom, rules, commands)

    let segments = simple.runN(1.0 / 2, 20, 1 / 2, num, false)

    console.log(segments)

    let response = await fetch(`/api/thick/${num}/false/0.5`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(segments)
    })
    let tris = await response.json()
    drawTris(tris)
}

(async function () {
    await run();
})();

function drawTris(tris: Tri3d[]) {
    let triScene = new THREE.Scene();

    // set up cameras
    let vWidth = 200
    let camera = new THREE.OrthographicCamera(vWidth / -2, vWidth / 2, vWidth / 2, vWidth / -2, -2000, 2000)


    let triRenderer = new THREE.WebGLRenderer();
    triRenderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById("triangles").appendChild(triRenderer.domElement);

    // materials

    let triMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide
    })
    let blackLineMaterial = new THREE.LineBasicMaterial({
        color: 0xeeeeee,
        transparent: true
    })



    // tris geometry
    let triGeometry = new THREE.BufferGeometry()

    let triVerts = []
    for (let tri of tris) {
        triVerts.push(
            tri.a.x, tri.a.y, tri.a.z,
            tri.b.x, tri.b.y, tri.b.z,
            tri.c.x, tri.c.y, tri.c.z
        )
    }

    triGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(triVerts), 3))
    let tri = new THREE.Mesh(triGeometry, triMaterial)

    let edges = new THREE.LineSegments(new THREE.EdgesGeometry(triGeometry), blackLineMaterial)

    // add to scenes
    triScene.add(tri)
    triScene.add(edges)

    // add controls
    let controls = new OrbitControls(camera, triRenderer.domElement);

    camera.position.y = 100
    camera.position.x = 100
    camera.position.z = 100
    camera.lookAt(0, 0, 0)
    controls.update()


    // run update

    function update() {
        requestAnimationFrame(update);
        controls.update()
        triRenderer.render(triScene, camera)
    }
    update();


    // STL exporting

    var saveLink = document.createElement('a')
    saveLink.style.display = 'none'
    document.body.appendChild(saveLink)

    function exportSTL() {
        var exporter = new STLExporter()
        var res = exporter.parse(tri)

        saveLink.href = URL.createObjectURL(new Blob([res], { type: 'text/plain' }))
        saveLink.download = "fractal.stl"
        saveLink.click()
    }

    document.getElementById("meshSave").addEventListener("click", exportSTL)

}