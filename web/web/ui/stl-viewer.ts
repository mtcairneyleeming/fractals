import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { STLExporter } from "three/examples/jsm/exporters/STLExporter"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader"


let triScene: THREE.Scene = null;
let triMaterial = new THREE.MeshPhongMaterial({ color: 0xdddddd, specular: 0x999999, shininess: 30, flatShading: true, side: THREE.DoubleSide })
let trisMesh: THREE.Mesh = null;
export function setupScene() {
    triScene = new THREE.Scene();
    // set up cameras
    let vWidth = 200
    let camera = new THREE.OrthographicCamera(vWidth / -2, vWidth / 2, vWidth / 2, vWidth / -2, -2000, 2000)


    let triRenderer = new THREE.WebGLRenderer({ antialias: true });
    triRenderer.setPixelRatio(window.devicePixelRatio);
    triRenderer.setSize(window.innerWidth, window.innerHeight);
    triRenderer.setClearColor(0xEEEEEE);
    document.getElementById("viewer").appendChild(triRenderer.domElement);

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
export function removeDisplay() {
    if (trisMesh != null) {
        triScene.remove(trisMesh)
        trisMesh.geometry.dispose()
        trisMesh = null;
    }

}

export async function displaySTL(stl: Blob) {

    let loader = new STLLoader();

    let geom = null
    try { geom = loader.parse(await stl.arrayBuffer()) }
    catch (e) {
        throw new Error("The STL returned by the server wasn't valid.")
    }
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