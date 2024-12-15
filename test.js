let acorn = require("acorn");

let code = 
`if (asd) { true; }{ sd }`;

console.log(JSON.stringify(acorn.parse(code, {ecmaVersion: 2020}).body, null, 3));

console.log()