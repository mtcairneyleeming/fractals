import { Point3d } from "./Point3d";
import { Line3d } from "./Line3d";


// note: if a Segment has a symbol that doesn't draw anything, then it is a point.
export class Segment {
    symbol: string;
    lines: Array<Line3d>;
    _start: Point3d;

    constructor(symbol: string, lines: Line3d[], start: Point3d) {
        this.symbol = symbol;
        this.lines = lines;
        this._start = start;
    }


    get start(): Point3d {
        return this._start;
    }

    end(): Point3d {
        if (this.lines.length > 0)
            return this.lines[this.lines.length - 1].end;
        else
            return this._start;
    }

    length(): number {
        let sum = 0;
        for (let line of this.lines) {
            sum += line.length;
        }
        return sum;
    }

    /**
     *
     * @param start fraction of length to start
     * @param end fraction of length to end
     */
    getSection(start: number, end: number): Array<Line3d> {
        if (this.lines.length == 0) {
            return [new Line3d(this._start, this._start)];
        }
        else {
            let out = [];
            let currFrac = 0;
            let ovLength = this.length();
            for (let line of this.lines) {
                let lineFrac = line.length / ovLength;
                const lineStart = currFrac;
                const lineEnd = currFrac + lineFrac;

                out.push(new Line3d(
                    line.point((start - lineStart) / lineFrac),
                    line.point((end - lineStart) / lineFrac)));

            }
            return out;
        }
    }
}
