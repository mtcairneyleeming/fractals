import * as THREE from "three"
import { DirectionalLight, Scene } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { STLExporter } from "three/examples/jsm/exporters/STLExporter"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader"

// TODO: autoresize

let triScene: THREE.Scene = null;
let triMaterial = new THREE.MeshLambertMaterial({ color: 0x909090, wireframe: false, side: THREE.DoubleSide, flatShading: true, vertexColors: false })
let trisMesh: THREE.Mesh = null;
let camera: THREE.OrthographicCamera = null
let ambientLight: THREE.AmbientLight = null
let lights = []
export function setupScene() {
    triScene = new THREE.Scene();
    // set up cameras
    let vWidth = 200
    camera = new THREE.OrthographicCamera(vWidth / -2, vWidth / 2, vWidth / 2, vWidth / -2, -2000, 2000)



    let triRenderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
    //triRenderer.setPixelRatio(window.devicePixelRatio,);
    let div = document.getElementById("viewer-holder") as HTMLDivElement

    triRenderer.setSize(div.offsetWidth, window.innerHeight * 0.8);
    triRenderer.setClearColor(0xffffff, 1);
    document.getElementById("viewer").appendChild(triRenderer.domElement);

    // add controls
    let controls = new OrbitControls(camera, triRenderer.domElement);

    camera.position.y = 0
    camera.position.x = 0
    camera.position.z = 10
    controls.update();
    camera.zoom = 1
    controls.update()
    camera.updateProjectionMatrix()


    ambientLight = new THREE.AmbientLight(0x202020)
    triScene.add(ambientLight);




    let axesHelper = new THREE.AxesHelper(10);
    triScene.add(axesHelper);

    function update() {
        requestAnimationFrame(update);
        controls.update()
        triRenderer.render(triScene, camera)
    }
    update();
    setupSTLExport();

}

// Tris display, STL output
export function removeDisplay() {
    if (trisMesh != null) {
        triScene.remove(trisMesh)
        trisMesh.geometry.dispose()
        trisMesh = null;
        lights.forEach(l => triScene.remove(l))
    }

}

export async function displaySTL(stl: Blob) {

    let loader = new STLLoader();

    let geom: THREE.BufferGeometry = null
    try { geom = loader.parse(await stl.arrayBuffer()) }
    catch (e) {
        throw new Error("The STL returned by the server wasn't valid.")
    }
    geom.rotateX(Math.PI)
    geom.computeVertexNormals()
    geom.computeBoundingBox()
    let box = geom.boundingBox
    console.log(box)

    let midx = (box.min.x + box.max.x) / 2;
    let midy = (box.min.y + box.max.y) / 2;
    let midz = (box.min.z + box.max.z) / 2;

    trisMesh = new THREE.Mesh(geom, triMaterial)
    trisMesh.position.z = -midz
    trisMesh.position.y = -midy
    trisMesh.position.x = -midx



    triScene.add(trisMesh)

    let max_dim = Math.max(box.max.x - box.min.x, box.max.y - box.max.y, box.max.z - box.min.z)

    let rad = max_dim * 0.75
    let z = 0.75 * box.max.z - box.min.z
    for (let j = 0; j < 5; j++) {
        let angle = Math.PI * 2 * j / 5
        let x = Math.cos(angle) * rad
        let y = Math.sin(angle) * rad

        let topLight = new THREE.PointLight(0xffffff, 1, 100)
        topLight.position.set(x, y, z)
        triScene.add(topLight)

        let bottom = new THREE.PointLight(0xffffff, 1, 100)
        bottom.position.set(x, y, -1.0 * z)
        triScene.add(bottom)
        console.log(x, y, z)
        console.log(x, y, -z)
        lights.push(topLight, bottom)
    }



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