let acorn = require("acorn");

let code = 
`2 + 3`;

console.log(JSON.stringify(acorn.parse(code, {ecmaVersion: 2020}).body, null, 3));

