type List = Array<string> // should be chars but TS doesn't have them
type Rules = Map<string, List>


export class Parser {
    private rules: Rules
    private iterations: Array<List>
    constructor(axiom: List, rules: Rules) {
        this.rules = rules
        this.iterations = [axiom] // axiom is the 0th iteration
    }


    iterate(): List {
        const state = this.iterations[this.iterations.length - 1] // last
        let next: List = []
        for (const symbol of state) {
            if (this.rules.has(symbol)) {
                next = next.concat(this.rules.get(symbol)) // apply the rule
            }
            else {
                next.push(symbol)
            }
        }
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