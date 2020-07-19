import { Point2d } from "./Point2d";

export class Point3d {

    x: number;
    y: number;
    z: number;

    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    static from2d(start: Point2d, z: number): Point3d {
        return new Point3d(start.x, start.y, z);
    }

}
