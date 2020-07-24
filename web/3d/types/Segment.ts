import { Point3d } from "./Point3d";
import { Line3d } from "./Line3d";


// note: if a Segment has a symbol that doesn't draw anything, then it is a point.
export class Segment {
    symbol: string;
    lines: Array<Line3d>;
    start: Point3d;
    prevIndex: number

    constructor(symbol: string, lines: Line3d[], start: Point3d, prevIndex: number) {
        this.symbol = symbol;
        this.lines = lines;
        this.start = start;
        this.prevIndex = prevIndex;
    }

    end(): Point3d {
        if (this.lines.length > 0)
            return this.lines[this.lines.length - 1].end;
        else
            return this.start;
    }

}
