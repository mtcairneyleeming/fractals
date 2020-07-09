import { Point3d } from "./Point3d";

export class Tri3d {
    a: Point3d;
    b: Point3d;
    c: Point3d;

    constructor(a: Point3d, b: Point3d, c: Point3d) {
        this.a = a;
        this.b = b;
        this.c = c;
    }
}
