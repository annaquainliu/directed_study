let acorn = require("acorn");

let code = 
`(sadasd) => {
    let b = sadasd + 1;
    return 3;
}
`;

class Hello {
    constructor() {

    }

    poo() {
        return 5;
    }
}

// console.log(JSON.stringify(acorn.parse(code, {ecmaVersion: 2020}).body, null, 3));
let env = {"sd" : new Hello()};

console.log(copy['sd'].poo());

