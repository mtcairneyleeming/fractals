
(() => {

    document.getElementById("run").addEventListener("click", run, false);


})();

function run() {
    let input = (document.getElementById("input") as HTMLTextAreaElement).value;
    let ori = []
    let out = []
    let inn = []
    for (const line of input.split("\n")) {
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

}