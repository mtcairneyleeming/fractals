// works only on fractals made of straight lines (and no moves). Works by building triangles of each side.

import { State } from "../lsystems/tosvg"
import { svgToLines } from "./checks"
import { Point3d } from "./types/Point3d"
import { Line3d } from "./types/Line3d"

export class Simple3D {

    private axiom: string
    private rules: Map<string, Array<string>>
    private commands: Map<string, (state: State) => void>

    constructor(axiom: string, rules: Map<string, string[]>, commands: Map<string, (state: State) => void>) {
        this.rules = rules
        this.axiom = axiom
        this.commands = commands
    }


    runN(zFactor: number, initDeltaZ: number, xyFactor: number, n: number, drawAxiom: boolean = true): Line3d[][] {
        // initial layer state
        let z = 0
        let xyScale = 1

        let layers: Line3d[][] = []

        // draw axiom wireframe
        layers.push(this.drawLayer(this.axiom, new State(0), z, 1, 0))

        let layerString = this.axiom

        for (let layerIndex = 1; layerIndex <= n; layerIndex++) {
            // update layer state
            z += initDeltaZ * Math.pow(zFactor, layerIndex)
            xyScale *= xyFactor

            let currPos = new Point3d(0, 0, z)

            // create state to run user commands against
            let state = new State(layerIndex)
            let newString = ""


            // the lines that will make up the next plane of the wireframe
            let layer: Line3d[] = []

            // draw 'evolution' of each previous symbol
            for (let prevIndex = 0; prevIndex < layerString.length; prevIndex++) {

                let prevSymbol = layerString[prevIndex]

                // get new symbols to draw
                let newSymbols = this.rules.has(prevSymbol) ? this.rules.get(prevSymbol) : [prevSymbol]
                newString += newSymbols.join("")
                // draw each of the new symbols as a wireframe on the xy plane z = currPos.
                // with the appropriate drawing state, scale, etc.
                for (let symbol of newSymbols) {

                    let newLines = this.drawSymbol(state, symbol, currPos, xyScale, prevIndex)
                    layer.push(...newLines)
                    if (newLines.length > 0) {
                        currPos = newLines[newLines.length - 1].end
                    }
                }
            }
            layers.push(layer)
            layerString = newString
        }
        if (!drawAxiom) {
            layers.splice(0, 1)
        }
        return layers

    }

    /**
     * Draws a string of symbols in the plane z=z
     * @param str 
     * @param z 
     * @param xyFactor the scaling factor to apply to the drawing
     * @returns list of lines
     */
    drawLayer(str: Array<string>, state: State, z: number, xyScale: number, prevIndex): Line3d[] {
        let out = []
        let pos = new Point3d(0, 0, z)
        for (let symbol of str) {
            let lines = this.drawSymbol(state, symbol, pos, xyScale, prevIndex)
            out.push(...lines)
            if (lines.length > 0) {
                pos = lines[lines.length - 1].end
            }
        }
        return out
    }

    drawSymbol(state: State, symbol: string, currPos: Point3d, xyScale: number, prevIndex: number): Line3d[] {

        if (this.commands.has(symbol)) {
            // get newly added SVG commands
            let prevLength = state.commands.length
            try {
                this.commands.get(symbol)(state)
            }
            catch (e) {
                throw new Error("There was a problem with your drawing commands:\n" + e.message)
            }
            let commands = state.commands.length > prevLength ? state.commands.slice(prevLength - 1) : [];

            if (commands.length == 0) {
                return []
            }

            // convert SVG commands to lines
            // note throws error on curved lines/ move/etc,
            let lines = svgToLines(commands, currPos.x, currPos.y, xyScale)
            // then to 3d lines
            let lines3d = lines.map(x => Line3d.from2d(x, currPos.z))
            return lines3d

        }
        // didn't draw anything, so no new lines and we stay in the same place.
        else return []

    }
}
