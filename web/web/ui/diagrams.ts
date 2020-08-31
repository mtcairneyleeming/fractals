import { curveSetup } from "./diagrams/curve"
import { everywhereSetup } from "./diagrams/everywhere-holes"
import { layersSetup } from "./diagrams/layers"
import { parallelSetup } from "./diagrams/parallel-holes"

// TODO: fix widths
export function setupDiagrams() {
    curveSetup()
    everywhereSetup()
    layersSetup()
    parallelSetup()
}



