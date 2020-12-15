
(() => {

    document.getElementById("run").addEventListener("click", run, false);


})();

function run() {
    let input = (document.getElementById("input") as HTMLTextAreaElement).value;
    let ori = []
    let out = []
    let inn = []
    for (const line of input.split("\n")) {
        console.log(line)
        let trimmed = line.trim()
        let regex = /.*: \(([+-]?([0-9]*[.])?[0-9]+), ([+-]?([0-9]*[.])?[0-9]+), ([+-]?([0-9]*[.])?[0-9]+)\)->\(([+-]?([0-9]*[.])?[0-9]+), ([+-]?([0-9]*[.])?[0-9]+), ([+-]?([0-9]*[.])?[0-9]+)\),/g;
        let match = regex.exec(trimmed)
        if (trimmed.startsWith("original:")) {

            ori.push([parseFloat(match[1]), parseFloat(match[3]), parseFloat(match[5]), parseFloat(match[7]), parseFloat(match[9]), parseFloat(match[11])])
        }
        if (trimmed.startsWith("outer:")) {
            out.push([parseFloat(match[1]), parseFloat(match[3]), parseFloat(match[5]), parseFloat(match[7]), parseFloat(match[9]), parseFloat(match[11])])
        }
        if (trimmed.startsWith("inner:")) {
            inn.push([parseFloat(match[1]), parseFloat(match[3]), parseFloat(match[5]), parseFloat(match[7]), parseFloat(match[9]), parseFloat(match[11])])
        }
    }
    console.log("Help!")
    var elt = document.getElementById('calculator');
    // @ts-expect-error
    var calculator = Desmos.GraphingCalculator(elt);
    function drawLine(line, colour) {
        calculator.setExpression({ type: 'expression', latex: `(${line[0]}, ${line[1]}), (${line[3]}, ${line[4]})`, lines: true, points: false, color: colour })
    }
    for (const line of ori) {
        drawLine(line, "red")

    }
    for (const line of inn) {
        drawLine(line, "green")

    }
    for (const line of out) {
        drawLine(line, "blue")

    }




    // let max = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY]

    // let min = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]

    // for (const line of ori.concat(inn).concat(out)) {
    //     console.log(line, max, min)
    //     if (line[0] > max[0]) max[0] = line[0]
    //     if (line[3] > max[0]) max[0] = line[3]
    //     if (line[0] < min[0]) min[0] = line[0]
    //     if (line[3] < min[0]) min[0] = line[3]

    //     if (line[1] > max[1]) max[1] = line[1]
    //     if (line[4] > max[1]) max[1] = line[4]
    //     if (line[1] < min[1]) min[1] = line[1]
    //     if (line[4] < min[1]) min[1] = line[4]
    // }

    // const canvas = document.getElementById("output") as HTMLCanvasElement
    // const context = canvas.getContext('2d')

    // const width = canvas.width;
    // const height = canvas.height;

    // // get a scale to best fit the canvas
    // const scale = Math.min(width / (max[0] - min[0]), height / (max[1] - min[1]));

    // // get a origin so that the drawing is centered on the canvas
    // const top = (height - (max[1] - min[1])) / 2;
    // const left = (width - (max[1] - min[0])) / 2;
    // console.log(max, min, scale, 0, 0, scale, left, top)
    // // set the transform so that you can draw to the canvas
    // context.setTransform(scale, 0, 0, scale, -min[0], height - max[1]);
    // //context.fillStyle = "black";
    // //context.fillRect(min[0], max[1], max[0] - min[0], max[0] - min[1]);
    // console.log(min[0], max[1], max[0] - min[0], max[0] - min[1])
    // context.strokeStyle = 'navy'; // set the strokeStyle color to 'navy' (for the stroke() call below)
    // context.lineWidth = 3.0;      // set the line width to 3 pixels

    // for (const line of ori) {
    //     context.beginPath();          // start a new path
    //     context.moveTo(line[0], line[1]);
    //     context.lineTo(line[3], line[4]);
    //     context.stroke();

    // }
    // context.strokeStyle = 'green'; // set the strokeStyle color to 'navy' (for the stroke() call below)

    // for (const line of inn) {
    //     context.beginPath();          // start a new path
    //     context.moveTo(line[0], line[1]);
    //     context.lineTo(line[3], line[4]);
    //     context.stroke();

    // }
    // context.strokeStyle = 'red'; // set the strokeStyle color to 'navy' (for the stroke() call below)

    // for (const line of out) {
    //     context.beginPath();          // start a new path
    //     context.moveTo(line[0], line[1]);
    //     context.lineTo(line[3], line[4]);
    //     context.stroke();

    // }
}