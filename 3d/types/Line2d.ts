import { Point2d } from "./Point2d";

export class Line2d {
    
    s: Point2d;
    e: Point2d;

    constructor(s: Point2d, e: Point2d) {
        this.s = s;
        this.e = e;
    }

    scale(startScale: number, endScale:number, origin: Point2d): Line2d {
        return new Line2d(this.s.scale(startScale, origin), this.e.scale(endScale, origin));
    }

}
