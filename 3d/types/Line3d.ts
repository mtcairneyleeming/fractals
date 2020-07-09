import { Line2d } from "./Line2d";
import { Point3d } from "./Point3d";

const EPS = Number.EPSILON * 10


export class Line3d {

    start: Point3d;
    end: Point3d;
    length: number;
    constructor(start: Point3d, end: Point3d) {
        this.start = start;
        this.end = end;
        let dx = start.x - end.x;
        let dy = start.y - end.y;
        let dz = start.z - end.z;
        this.length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    static from2d(x: Line2d, z: number) {
        return new Line3d(Point3d.from2d(x.s, z), Point3d.from2d(x.e, z));
    }

    point(pos: number) {

        if (pos < EPS) {
            return this.start;
        }
        else if (pos > 1 - EPS) {
            return this.end;
        }
        else {
            return new Point3d(
                this.start.x + pos * (this.end.x - this.start.x),
                this.start.y + pos * (this.end.y - this.start.y),
                this.start.z + pos * (this.end.z - this.start.z)
            );
        }
    }
}
