import { Parser } from "../lsystems/parser";

function onClick(){
    var axiom = document.getElementById("axiom").value.split(',')
    var variables = document.getElementById("variables").value.split(';')
    var rulesMap = new Map()
    var rules = document.getElementById("rules").value.split(';').forEach((str:string) => {
        var parts = str.split('>')

        rulesMap.set(parts[0], parts[1].split(","))
    })
    
    var n = (document.getElementById("n") as HTMLInputElement).value as unknown as number
    console.log("Axiom", axiom)
    console.log("Alphabet", variables)

    console.log("Rules", rulesMap)
    var parser = new Parser(variables, axiom, rulesMap)
    var res = parser.iterateN(n)
    document.getElementById("output").innerText = res.join("\n")
}

document.getElementById("run").addEventListener("click", onClick, false)

