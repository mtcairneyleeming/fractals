
import { Point2d } from "./types/Point2d"
import { Line2d } from "./types/Line2d"

export function isLinear(svgCommands: Array<string>) {
    // needs only to check for m's since every other command draws from the current position.
    return svgCommands.every((line) =>
        line.length == 0 || line[0] != "m"
    )
}

// Given three colinear points p, q, r, the function checks if 
// point q lies on line segment 'pr' 
function onSegment(p: Point2d, q: Point2d, r: Point2d): boolean {
    return (q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
        q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y))

}

// To find orientation of ordered triplet (p, q, r). 
// The function returns following values 
// 0 --> p, q and r are colinear 
// 1 --> Clockwise 
// 2 --> Counterclockwise 
function orientation(p: Point2d, q: Point2d, r: Point2d) {
    // See https://www.geeksforgeeks.org/orientation-3-ordered-points/ 
    // for details of below formula. 
    let val = (q.y - p.y) * (r.x - q.x) -
        (q.x - p.x) * (r.y - q.y);

    if (val == 0) return 0; // colinear 

    return (val > 0) ? 1 : 2; // clock or counterclock wise 
}

// The main function that returns true if line segment 'p1q1' 
// and 'p2q2' intersect. 
function doIntersect(a: Line2d, b: Line2d) {
    const p1 = a.s
    const q1 = a.e
    const p2 = b.s
    const q2 = b.e
    // Find the four orientations needed for general and 
    // special cases 
    let o1 = orientation(p1, q1, p2);
    let o2 = orientation(p1, q1, q2);
    let o3 = orientation(p2, q2, p1);
    let o4 = orientation(p2, q2, q1);

    // General case 
    if (o1 != o2 && o3 != o4)
        return true;

    // Special Cases 
    // p1, q1 and p2 are colinear and p2 lies on segment p1q1 
    if (o1 == 0 && onSegment(p1, p2, q1)) return true;

    // p1, q1 and q2 are colinear and q2 lies on segment p1q1 
    if (o2 == 0 && onSegment(p1, q2, q1)) return true;

    // p2, q2 and p1 are colinear and p1 lies on segment p2q2 
    if (o3 == 0 && onSegment(p2, p1, q2)) return true;

    // p2, q2 and q1 are colinear and q1 lies on segment p2q2 
    if (o4 == 0 && onSegment(p2, q1, q2)) return true;

    return false; // Doesn't fall in any of the above cases 
}

// expects only straight lines
export function svgToLines(svgCommands: Array<string>, offsetX: number = 0, offsetY: number = 0, scale: number = 1.0): Array<Line2d> {
    let currPos = new Point2d(offsetX, offsetY)

    let out = []
    for (let line of svgCommands.slice(1)) {
        let parts = line.split(" ")
        let newP = null
        switch (parts[0]) {
            case "l":
                newP = new Point2d(currPos.x + scale * parseFloat(parts[1]), currPos.y + scale * parseFloat(parts[2]))
                out.push(new Line2d(currPos, newP))
                currPos = newP
                break;
            case "h":
                newP = new Point2d(currPos.x + scale * parseFloat(parts[1]), currPos.y)
                out.push(new Line2d(currPos, newP))
                currPos = newP
                break;
            case "v":
                newP = new Point2d(currPos.x, currPos.y + scale * parseFloat(parts[2]))
                out.push(new Line2d(currPos, newP))
                currPos = newP
                break;
            case "m":
                currPos = new Point2d(currPos.x + parseFloat(parts[1]), currPos.y + parseFloat(parts[2]));
                break;
            default:
                throw new Error(`Unexpected SVG command ${parts[0]} when only expected straight lines`)

        }


    }
    return out
}


export function isWellFormed(svgCommands: Array<string>) {
    let basicChecks = svgCommands.every((line) => {
        // sensible checks:
        // lines non-zero, all relative commands, no explicitly closed paths
        line.length > 0 && (line[0].toLowerCase() == line[0]) && line[0].toLowerCase() != "z"
    })
    if (basicChecks) {
        let selfIntersect = false
        // check self-intersection
        let lines = svgToLines(svgCommands)
        for (let i = 0; i < lines.length; i++) {
            for (let j = 0; j < lines.length; j++) {
                if (i != j && !selfIntersect) {
                    if (doIntersect(lines[i], lines[j])) {
                        selfIntersect = true

                    }
                }
            }
        }
        if (selfIntersect) return false
    }
    return false
}