
export class Point2d {
    
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    scale(xyScale: number, origin: Point2d): Point2d {
        return new Point2d(
            origin.x + xyScale * (this.x - origin.x),
            origin.y + xyScale * (this.y - origin.y));
    }

}
