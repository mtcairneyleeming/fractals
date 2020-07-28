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


    let triRenderer = new THREE.WebGLRenderer({ antialias: true });
    triRenderer.setPixelRatio(window.devicePixelRatio);
    triRenderer.setSize(window.innerWidth, window.innerHeight);
    triRenderer.setClearColor(0xEEEEEE);
    document.getElementById("triangles").appendChild(triRenderer.domElement);

    // materials
    let triMaterial = new THREE.MeshPhongMaterial({ color: 0xdddddd, specular: 0x999999, shininess: 30, flatShading: true, side: THREE.DoubleSide })

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

    triScene.add(new THREE.AmbientLight(0x111111));

    let pointLight = new THREE.PointLight(0xffffff, 1);
    triScene.add(pointLight);

    // add controls
    let controls = new OrbitControls(camera, triRenderer.domElement);

    camera.position.y = 0
    camera.position.x = 0
    camera.position.z = -5
    camera.lookAt(0, 0, 0)
    controls.update();
    camera.zoom = 3.5
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