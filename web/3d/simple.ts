// works only on fractals made of straight lines (and no moves). Works by building triangles of each side.

import { State } from "../lsystems/tosvg"
import { svgToLines } from "./checks"
import { Point3d } from "./types/Point3d"
import { Line3d } from "./types/Line3d"
import { Segment } from "./types/Segment"

export class Simple3D {

    private axiom: string[]
    private rules: Map<string, Array<string>>
    private commands: Map<string, (state: State) => void>

    constructor(axiom: string[], rules: Map<string, string[]>, commands: Map<string, (state: State) => void>) {
        this.rules = rules
        this.axiom = axiom
        this.commands = commands
    }


    // vocab: segment = lines from drawing 1 symbol
    runN(zFactor: number, initDeltaZ: number, xyFactor: number, n: number, drawAxiom: boolean = true): Segment[][] {
        // initial layer state
        let z = 0
        let xyScale = 1

        let segments: Segment[][] = []

        // draw axiom wireframe
        segments.push(this.drawSymbols(this.axiom, new State(), z, 1, 0))



        for (let layer = 1; layer <= n; layer++) {
            // update layer state
            z += initDeltaZ * Math.pow(zFactor, layer)
            xyScale *= xyFactor

            let currPos = new Point3d(0, 0, z)

            // create state to run user commands against
            let state = new State()


            // the lines that will make up the next plane of the wireframe
            let newSegments: Segment[] = []

            // draw 'evolution' of each previous segment
            for (let prevIndex = 0; prevIndex < segments[layer - 1].length; prevIndex++) {

                let prevSegment = segments[layer - 1][prevIndex]
                let prevSymbol = prevSegment.symbol

                // get new symbols to draw
                let newSymbols = this.rules.has(prevSymbol) ? this.rules.get(prevSymbol) : [prevSymbol]

                // draw each of the new symbols as a wireframe on the xy plane z = currPos.
                // with the appropriate drawing state, scale, etc.
                for (let symbol of newSymbols) {

                    let newSegment = this.drawSymbol(state, symbol, currPos, xyScale, prevIndex)
                    newSegments.push(newSegment)
                    currPos = newSegment.end()
                }
            }
            segments.push(newSegments)
        }
        return segments
    }

    /**
     * Draws a string of symbols in the plane z=z
     * @param str 
     * @param z 
     * @param xyFactor the scaling factor to apply to the drawing
     * @returns list of segments
     */
    drawSymbols(str: Array<string>, state: State, z: number, xyScale: number, prevIndex): Array<Segment> {
        let out = []
        let pos = new Point3d(0, 0, z)
        for (let symbol of str) {
            let seg = this.drawSymbol(state, symbol, pos, xyScale, prevIndex)
            out.push(seg)
            pos = seg.end()
        }
        return out
    }

    drawSymbol(state: State, symbol: string, currPos: Point3d, xyScale: number, prevIndex: number): Segment {

        if (this.commands.has(symbol)) {
            // get newly added SVG commands
            let prevLength = state.commands.length
            this.commands.get(symbol)(state)
            let commands = state.commands.slice(prevLength - 1)

            try {
                // convert SVG commands to lines
                let lines = svgToLines(commands, currPos.x, currPos.y, xyScale)
                // then to 3d lines
                let lines3d = lines.map(x => Line3d.from2d(x, currPos.z))
                return new Segment(symbol, lines3d, currPos, prevIndex)
            }
            catch (e) {
                // TODO!!
                throw e
            }
        }
        // didn't draw anything, so no new lines and we stay in the same place.
        else return new Segment(symbol, [], currPos, prevIndex)

    }
}
