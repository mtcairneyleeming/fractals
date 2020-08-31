
import { annotate, annotationGroup } from 'rough-notation';
import { getSpan } from "./helpers"
import rough from "roughjs/bin/rough"
import { RoughSVG } from 'roughjs/bin/svg';



let lsys: RoughSVG = null
let svg: SVGSVGElement = null
export function lsysSetup() {
    svg = document.getElementById("lsys-explanation-svg") as unknown as SVGSVGElement
    lsys = rough.svg(svg)
    draw()
    connectAll()
    window.addEventListener("resize", () => {
        svg.setAttribute("height", "0")
        svg.setAttribute("width", "0")
        connectAll()
    })
}


function draw() {
    let highlights = [
        //    ["0A", "red"],
        ["0B", "lightblue"],

        //  ["1A", "red"],
        ["1D", "lightblue"],
        ["1C", "lightblue"],

        //  ["2A", "red"]
    ]
    let boxes = [
        ["1D", "violet"],

        ["2E", "violet"],

        ["2F", "violet"]
    ]
    let annotations = []
    for (let highlight of highlights) {
        annotations.push(annotate(getSpan(highlight[0]), { type: "highlight", color: highlight[1], animate: false }))
    }
    for (let box of boxes) {
        annotations.push(annotate(getSpan(box[0]), { type: "box", color: box[1], animate: false }))
    }
    let group = annotationGroup(annotations)
    group.show()

}


// code originally from https://gist.github.com/alojzije/11127839


//helper functions, it turned out chrome doesn't support Math.sgn()
function signum(x: number) {
    return (x < 0) ? -1 : 1;
}
function absolute(x: number) {
    return (x < 0) ? -x : x;
}

function drawPath(startX: number, startY: number, endX: number, endY: number, colour: string) {

    let stroke = 4;


    // get the path's stroke width (if one wanted to be  really precize, one could use half the stroke size)
    let box = svg.getBBox()
    // check if the svg is big enough to draw the path, if not, set heigh/width
    //@ts-ignore
    if (svg.getAttribute("height") < endY) svg.setAttribute("height", endY);
    //@ts-ignore
    if (svg.getAttribute("width") < (startX + stroke)) svg.setAttribute("width", (startX + stroke));
    //@ts-ignore
    if (svg.getAttribute("width") < (endX + stroke)) svg.setAttribute("width", (endX + stroke));

    var deltaX = (endX - startX) * 0.15;
    var deltaY = (endY - startY) * 0.15;
    // for further calculations which ever is the shortest distance
    var delta = deltaY < absolute(deltaX) ? deltaY : absolute(deltaX);

    // set sweep-flag (counter/clock-wise)
    // if start element is closer to the left edge,
    // draw the first arc counter-clockwise, and the second one clock-wise
    var arc1 = 0; var arc2 = 1;
    if (startX > endX) {
        arc1 = 1;
        arc2 = 0;
    }
    // draw tha pipe-like path
    // 1. move a bit down, 2. arch,  3. move a bit to the right, 4.arch, 5. move down to the end 
    let p = lsys.path("M" + startX + " " + startY +
        " V" + (startY + delta) +
        " A" + delta + " " + delta + " 0 0 " + arc1 + " " + (startX + delta * signum(deltaX)) + " " + (startY + 2 * delta) +
        " H" + (endX - delta * signum(deltaX)) +
        " A" + delta + " " + delta + " 0 0 " + arc2 + " " + endX + " " + (startY + 3 * delta) +
        " V" + endY, {
        strokeWidth: 2,
        stroke: colour,
        roughness: 0.5
    });

    svg.appendChild(p)
}
function getOffset(element: HTMLElement) {
    if (!element.getClientRects().length) {
        return { top: 0, left: 0 };
    }

    let rect = element.getBoundingClientRect();
    let win = element.ownerDocument.defaultView;
    return (
        {
            top: rect.top + win.pageYOffset,
            left: rect.left + win.pageXOffset
        });
}


function connectElements(startElem: HTMLElement, endElem: HTMLElement, colour: string) {
    let svgContainer = document.getElementById("lsys-svg-container")
    // if first element is lower than the second, swap!
    if (getOffset(startElem).top > getOffset(endElem).top) {
        var temp = startElem;
        startElem = endElem;
        endElem = temp;
    }
    let bcr = svgContainer.getBoundingClientRect()

    // get (top, left) corner coordinates of the svg container   
    var svgTop = getOffset(svgContainer).top;
    var svgLeft = getOffset(svgContainer).left;

    // get (top, left) coordinates for the two elements
    var startCoord = getOffset(startElem);
    var endCoord = getOffset(endElem);

    // calculate path's start (x,y)  coords
    // we want the x coordinate to visually result in the element's mid point
    var startX = startCoord.left + 0.5 * startElem.offsetWidth - svgLeft;    // x = left offset + 0.5*width - svg's left offset
    var startY = startCoord.top + startElem.offsetHeight - svgTop;        // y = top offset + height - svg's top offset

    // calculate path's end (x,y) coords
    var endX = endCoord.left + 0.5 * endElem.offsetWidth - svgLeft;
    var endY = endCoord.top - svgTop;

    // call function for drawing the path
    drawPath(startX, startY, endX, endY, colour);

}



function connectAll() {
    let pairs = [
        ["0A", "1A", "gray"],
        ["1A", "2A", "gray"],
        ["0B", "1D", "lightblue"],
        ["0B", "1C", "lightblue"],
        ["1D", "2E", "violet"],
        ["1D", "2F", "violet"],
        ["1C", "2C", "gray"]
    ]
    for (const pair of pairs) {
        connectElements(getSpan(pair[0]), getSpan(pair[1]), pair[2])
    }
}

