// works only on fractals made of straight lines (and no moves). Works by building triangles of each side.

import { State } from "../lsystems/tosvg"
import { svgToLines } from "./checks"
import { Tri3d } from "./types/Tri3d"
import { Point3d } from "./types/Point3d"
import { Line3d } from "./types/Line3d"
import { Segment } from "./types/Segment"

export class Simple3D {

    private layerLines: Line3d[] = []
    private joinLines: Line3d[] = []
    private tris: Tri3d[] = []

    private axiom: string[]
    private rules: Map<string, Array<string>>
    private commands: Map<string, (state: State) => void>

    constructor(axiom: string[], rules: Map<string, string[]>, commands: Map<string, (state: State) => void>) {
        this.rules = rules
        this.axiom = axiom
        this.commands = commands
    }


    // vocab: segment = lines from drawing 1 symbol
    runN(zFactor: number, initDeltaZ: number, xyFactor: number, n: number, drawAxiom: boolean = true): [Tri3d[], Line3d[], Line3d[]] {
        // initial layer state
        let z = 0
        let xyScale = 1

        // draw axiom wireframe
        let prevSegments = this.drawSymbols(this.axiom, new State(), z, 1)

        for (let i = 0; i < n; i++) {
            // update layer state
            z += initDeltaZ * Math.pow(zFactor, i)
            xyScale *= xyFactor

            let currPos = new Point3d(0, 0, z)

            // create state to run user commands against
            let state = new State()


            // the lines that will make up the next plane of the wireframe
            let newSegments: Segment[] = []




            // draw 'evolution' of each previous segment
            for (let prevSegment of prevSegments) {

                let prevSymbol = prevSegment.symbol

                // get new symbols to draw
                let newSymbols = this.rules.has(prevSymbol) ? this.rules.get(prevSymbol) : [prevSymbol]

                let segments: Segment[] = []

                // draw each of the new symbols as a wireframe on the xy plane z = currPos.
                // with the appropriate drawing state, scale, etc.
                for (let symbol of newSymbols) {

                    let newSegment = this.drawSymbol(state, symbol, currPos, xyScale)

                    segments.push(newSegment)
                    currPos = newSegment.end()
                }
                // tot up the lengths
                let totalLength = 0
                for (let newSegment of segments) {
                    totalLength += newSegment.length()
                }

                // Draw tris and joining lines in wireframe
                let segStart = 0
                for (let newSegment of segments) {
                    if (newSegment.length() > 0 && (i > 0 || drawAxiom)) {
                        //throw new Error(n.toString())
                        let s = segStart
                        // add tris, lines for each of the new lines
                        for (let line of newSegment.lines) {
                            // find section of segment on prev level to join to this line
                            let startFrac = s / totalLength
                            let endFrac = (s + line.length) / totalLength
                            let prevLines = prevSegment.getSection(startFrac, endFrac)
                            

                            for (const prevLine of prevLines) {
                                this.addTriangle(prevLine, line.start)
                            }
                            // use end of line(s) just found to make tri 
                            // there's guaranteed to be at least one line in prevLines
                            this.addTriangle(line, prevLines[prevLines.length - 1].end)
                            
                            // draw line linking end of this one to the end of the section found.
                            this.drawLine(prevLines[prevLines.length - 1].end, line.end, true)
                            s = s + line.length
                        }
                        segStart = s

                    }
                    newSegments.push(newSegment)
                }

            }

            // join the start of this iteration with the start of the previous one
            this.drawLine(prevSegments[0].start, newSegments[0].start, true)

            prevSegments = newSegments
        }

        return [this.tris, this.layerLines, this.joinLines]
    }

    /**
     * Draws a string of symbols in the plane z=z
     * @param str 
     * @param z 
     * @param xyFactor the scaling factor to apply to the drawing
     * @returns list of segments
     */
    drawSymbols(str: Array<string>, state: State, z: number, xyScale: number): Array<Segment> {
        let out = []
        let pos = new Point3d(0, 0, z)
        for (let symbol of str) {
            let seg = this.drawSymbol(state, symbol, pos, xyScale)
            out.push(seg)
            pos = seg.end()
        }
        return out
    }

    drawSymbol(state: State, symbol: string, currPos: Point3d, xyScale: number): Segment {

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
                this.layerLines.push(...lines3d)
                return new Segment(symbol, lines3d, currPos)
            }
            catch (e) {
                // TODO!!
                throw e
            }
        }
        // didn't draw anything, so no new lines and we stay in the same place.
        else return new Segment(symbol, [], currPos)


    }

    /* Both of these methods should only be called on points that are already scaled */
    drawLine(a: Point3d, b: Point3d, join: boolean) {
        if (join) {
            this.joinLines.push(new Line3d(a, b))
        }
        else {
            this.layerLines.push(new Line3d(a, b))
        }
    }

    addTriangle(line: Line3d, p: Point3d) {
        this.tris.push(new Tri3d(line.start, line.end, p))
    }
}
