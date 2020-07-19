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
    }

    checkErrors(): Array<[string, string, string, Array<string>]> {
        let errors = []
        for (const symbol of this.axiom) {
            if (this.alphabet.indexOf(symbol) == -1) {
                errors.push(["The axiom must use only symbols from the alphabet", symbol, this.axiom, this.alphabet])
            }
        }
        for (let [pred, succ] of this.rules) {
            if (this.alphabet.indexOf(pred) == -1) {
                errors.push(["The rules must use only symbols from the alphabet", pred, `${pred}>${succ.join(",")}`, this.alphabet])
            }
            for (let i = 0; i < succ.length; i++) {
                if (this.alphabet.indexOf(succ[i]) == -1) {
                    errors.push(["The rules must use only symbols from the alphabet", succ[i], `${pred}>${succ.join(",")}`, this.alphabet])
                }
            }
        }
        console.log(errors)
        return errors
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