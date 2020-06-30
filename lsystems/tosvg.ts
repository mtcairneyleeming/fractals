type Command = (state: State) => void
export class State {
    // Internal state:
    public commands: Array<string> = ["M 0 0"]
    // using an array as a stack, as it has push, pop
    private stateStack: Array<Object> = []


    public currentPosition: [number, number] = [0, 0]
    public state: Object = {
        step: 50,
        angle: 0
    }


    draw() { this.lineA(this.step(), this.angle()) }

    move() { this.moveA(this.step(), this.angle()) }

    setStep(factor: number) {
        this.state["step"] = factor * this.state["step"]
    }

    right(angle: number) {
        this.state["angle"] = angle + this.state["angle"]
    }
    left(angle: number) {
        this.right(-1 * angle)
    }

    save() {
        this.stateStack.push(this.state)
    }
    restore() {
        this.state = this.stateStack.pop()
    }

    angle(): number { return this.state["angle"] as number }

    step(): number { return this.state["step"] as number }



    lineA(length: number, angle: number) {
        console.log(length, angle)
        this.l(length * Math.cos(angle*Math.PI/180), length * Math.sin(angle*Math.PI/180))
    }

    moveA(length: number, angle: number) {
        this.m(length * Math.cos(angle*Math.PI/180), length * Math.sin(angle*Math.PI/180))
    }

    m(dx: number, dy: number) {
        this.commands.push(`m ${dx} ${dy}`)
    }

    l(dx: number, dy: number) {
        this.commands.push(`l ${dx} ${dy}`)
    }



    h(length: number) {
        this.commands.push(`h ${length}`)
    }

    v(length: number) {
        this.commands.push(`v ${length}`)
    }

    c(dx1: number, dy1: number, dx2: number, dy2: number, dx: number, dy: number) {
        this.commands.push(`c ${dx1} ${dy1} ${dx2} ${dy2} ${dx} ${dy}`)
    }

    s(dx2: number, dy2: number, dx: number, dy: number) {
        this.commands.push(`s ${dx2} ${dy2} ${dx} ${dy}`)
    }

    q(dx1: number, dy1: number, dx: number, dy: number) {
        this.commands.push(`q ${dx1} ${dy1} ${dx} ${dy}`)
    }

    t(dx: number, dy: number) {
        this.commands.push(`t ${dx} ${dy}`)
    }

    a(rx: number, ry: number, angle: number, large: number, sweep: number, dx: number, dy: number) {
        this.commands.push(`c ${rx} ${ry} ${angle} ${large} ${sweep} ${dx} ${dy}`)
    }

    // close is not allowed as paths must produce a line not a shape


}
export function toSVGCommands(str: Array<string>, drawingCommands: Map<string, Command>): Array<string> {
    var state = new State()

    for (const symbol of str) {
        console.log(state.state)
        if (drawingCommands.has(symbol)) {
            drawingCommands.get(symbol)(state)
        }
    }
    return state.commands
}

export function toDataUrl(svg: string): string {
    return `data:image/svg+xml;utf8,` + svg
}