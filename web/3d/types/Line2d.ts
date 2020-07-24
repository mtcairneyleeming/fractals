import { Point2d } from "./Point2d";

export class Line2d {

    s: Point2d;
    e: Point2d;

    constructor(s: Point2d, e: Point2d) {
        this.s = s;
        this.e = e;
    }

}
