import { SVG } from '@svgdotjs/svg.js'

type Command = (state: State) => void


export class State {
    constructor(iteration: number) {
        this.iteration = iteration;
    }

    // Internal state:
    public commands: Array<string> = ["M 0 0"]
    // using an array as a stack, as it has push, pop
    private stateStack: Array<Object> = []
    public state: Object = {
        step: 100,
        angle: 0,
        currentPosition: [0, 0]

    }
    public iteration: number;


    draw() { this.lineA(this.step(), this.angle()) }

    move() { this.moveA(this.step(), this.angle()) }

    setStep(factor: number) {
        this.state["step"] = factor * this.state["step"]
    }

    changePosition(dx: number, dy: number) {
        let p = [this.state["currentPosition"][0], this.state["currentPosition"][1]]
        this.state["currentPosition"] = [p[0] + dx, p[1] + dy]

    }

    right(angle: number) {

        this.state["angle"] = angle + this.state["angle"]
    }
    left(angle: number) {
        this.right(-1 * angle)
    }

    save() {

        let stackV = {
            step: this.state["step"],
            angle: this.state["angle"],
            currentPosition: [this.state["currentPosition"][0], this.state["currentPosition"][1]]
        };


        this.stateStack.push(stackV)

    }
    restore() {

        let prevP = [this.state["currentPosition"][0], this.state["currentPosition"][1]];

        this.state = this.stateStack.pop()
        let currP = this.state["currentPosition"]
        this.commands.push(`m ${currP[0] - prevP[0]} ${currP[1] - prevP[1]}`)

    }



    angle(): number { return this.state["angle"] as number }

    step(): number { return this.state["step"] as number }



    lineA(length: number, angle: number) {
        this.l(length * Math.cos(angle * Math.PI / 180), length * Math.sin(angle * Math.PI / 180))
    }

    moveA(length: number, angle: number) {
        this.m(length * Math.cos(angle * Math.PI / 180), length * Math.sin(angle * Math.PI / 180))
    }

    m(dx: number, dy: number) {
        this.commands.push(`m ${dx} ${dy}`)
        this.changePosition(dx, dy)
    }


    l(dx: number, dy: number) {
        this.commands.push(`l ${dx} ${dy}`)
        this.changePosition(dx, dy)
    }



    h(length: number) {
        this.commands.push(`h ${length}`)
        this.changePosition(length, 0)
    }

    v(length: number) {
        this.commands.push(`v ${length}`)
        this.changePosition(0, length)
    }

    c(dx1: number, dy1: number, dx2: number, dy2: number, dx: number, dy: number) {
        this.commands.push(`c ${dx1} ${dy1} ${dx2} ${dy2} ${dx} ${dy}`)
        this.changePosition(dx, dy)
    }

    s(dx2: number, dy2: number, dx: number, dy: number) {
        this.commands.push(`s ${dx2} ${dy2} ${dx} ${dy}`)
        this.changePosition(dx, dy)
    }

    q(dx1: number, dy1: number, dx: number, dy: number) {
        this.commands.push(`q ${dx1} ${dy1} ${dx} ${dy}`)
        this.changePosition(dx, dy)
    }

    t(dx: number, dy: number) {
        this.commands.push(`t ${dx} ${dy}`)
        this.changePosition(dx, dy)
    }

    a(rx: number, ry: number, angle: number, large: number, sweep: number, dx: number, dy: number) {
        this.commands.push(`c ${rx} ${ry} ${angle} ${large} ${sweep} ${dx} ${dy}`)
        this.changePosition(dx, dy)
    }

    // close is not allowed as paths must produce a line not a shape


}
export function toSVGCommands(str: Array<string>, drawingCommands: Map<string, string>, iteration: number): Array<string> | string {
    var state = new State(iteration)
    for (const symbol of str) {
        if (drawingCommands.has(symbol)) {
            try {
                (new Function("state", drawingCommands.get(symbol)))(state)


            } catch (err) {
                return err.name + ": " + err.message
            }

        }
    }
    return state.commands
}

export function toDataUrl(svg: string): string {
    return `data:image/svg+xml;utf8,` + svg
}

export function toSVG(commands: Array<string>, addTo: HTMLElement, iteration: number): number {
    let draw = SVG().addTo(addTo).size(200, 200)

    let strokeWidth = 2

    let path = draw.path(commands.join("\n")).attr({
        fill: "transparent",
        stroke: "black",
        "stroke-width": `${strokeWidth}px`
    })
    //     .transform({
    //     flip: "y"
    // })

    let bbox = path.bbox()
    if (bbox.width < bbox.height) {
        bbox.x -= (bbox.height - bbox.width) / 2
        bbox.width = bbox.height
    }
    else if (bbox.width > bbox.height) {
        bbox.y -= (bbox.width - bbox.height) / 2
        bbox.height = bbox.width
    }
    bbox.x -= 0.025 * bbox.width
    bbox.y -= 0.025 * bbox.height
    bbox.height *= 1.05
    bbox.width *= 1.05

    draw.viewbox(bbox)

    let scaleFactor = bbox.width / draw.width()
    path.attr("stroke-width", `${strokeWidth * scaleFactor}px`)
    let text = draw.text(`#${iteration}`)
    text.move(bbox.x + 5, bbox.y + 5)
    text.font("size", `${scaleFactor}rem`)
    return scaleFactor

}