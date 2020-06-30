type List = Array<string> // should be chars but TS doesn't have them
type Rules = Map<string, List>


export class Parser {
    private alphabet: List
    private axiom: List
    private rules: Rules
    private iterations: Array<List>
    constructor(alphabet: List, axiom: List, rules: Rules) {
        this.alphabet = alphabet
        this.axiom = axiom
        this.rules = rules
        this.iterations = [axiom] // axiom is the 0th iteration
        for (const symbol of axiom) {
            if (this.alphabet.indexOf(symbol) == -1) {
                throw new Error("Axiom must use only symbols from the alphabet");
            }
        }
        for(let [pred,succ] of rules){
            if (this.alphabet.indexOf(pred) == -1) {
                throw new Error("Rules must use only symbols from the alphabet");
            }
            for (let i =0; i < succ.length; i++) {
                if (this.alphabet.indexOf(succ[i]) == -1) {
                    throw new Error("Rules must use only symbols from the alphabet");
                }
            }
        }
    }

    iterate(): List {
        const state = this.iterations[this.iterations.length - 1] // last
        let next: List = []
        for (const symbol of state) {
            //console.log(symbol, state)
            if (this.rules.has(symbol)) {
                next = next.concat(this.rules.get(symbol)) // apply the rule
                
            }
            else {
                next.push(symbol)
            }
        }
        //console.log(next)
        this.iterations.push(next)
        return next
    }


    iterateN(n: Number): Array<List> {
        let i = 0
        while (i < n) {
            this.iterate()
            i++
        }

        return this.iterations
    }

}