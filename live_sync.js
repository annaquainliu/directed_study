/**
 * 
 * 
 * This can be done with deep copying, since after a change all the code will be re-ran.
 * 
 * function hello () {
 *   let x = 2;
 *   function bye() {
 *      let y = x + 3;
 *      return y;
 *   }
 *   Add(Square(x, ...))
 *   Add(Square(bye()))
 * }
 * 
 * 
 * This is an example of why getting the value of an expression trace needs the
 * context of the variable environment. Additionally, it shows why visual objects
 * that use the same variable 
 * 
function AddSquare (text) {
    let sq = Rect(100, 100, text, 50, 70);
    Add(sq);
}
AddSquare("sds");
AddSquare("I Love you");
 * 
 * 
 *  RECT
 * 
 * Any syntactic token that can be updated from the visual output must be tagged with a location
 * 
 * ----------------------------------------------------
 * Parameters of the same name
 * 
 * AddSquare's closure is extended to have the variables {text -> "asdsa"}
 * makeText's closure is extended to have {text -> VAR(text, "asdsa")}
 * 
 * This shows that the variable expression trace should hold a reference to the environemnt
 * it was created in
 * 
function makeText(text) {
    return text;
}
  
function AddSquare (text, y) {
    let sq = Rect(100, 100, makeText(text), 50, y);
    Add(sq);
}
   
AddSquare("asdsa", 50);
AddSquare("bingo", 100);
 *
 * 
 * 
 * 
 * 
*/

/**
 * - Check out sketch n sketch
 * - Formalize what im doing (Latex) (Robby's formalism)
 * - Seperate this file into modules
 * 
 *
function hello (diff) {
    let diff1 = diff;
    return diff1;
}
let sq = Rect(100, 100, hello("sadss"), 50, 50);
let sq2 = Rect(100, 100, hello("bongo"), 200, 200);
Add(sq);
Add(sq2);

-------------------------------------------------------------
let text2 = "asdsad"
let text = text2
let sq = Rect(100, 100, text, 50, 50);

At this point, text will be set to a value that has a notated location.
Every value has a location. (location |--> value)

This model only changes *values*.
------------------------------------------------------------
let x = y + z

 */
/**
 * 
 * Example of why all instances of a function call should share the same
 * expression traces:
 * 
 * function hi() {
 *      return 3 + 4;
 * }
 * 
 * Add(Rect(hi(), ....))
 * Add(Rect(hi(), ....))
 */
let acorn = require("acorn");

// The list of Definitions and Exps
let program = [];

// The visual output is stored as a map of shape ids to shape instances
let visualOutput = {};

// Map of variable names to locations
let varToLoc = {};

// Map of locations to (Equation, Value) tuples
let locToValue = {};

/**
 * Given a variable environment, copies the key and value to a new environment 
 * but does not deep copy the values.
 *  
 * @param {JSON} env 
 */
function shallowCopy(env) {
    let newEnv = {};
    for (let name in env) {
        newEnv[name] = env[name];
    }
    return newEnv;
}


class Equation {

    constructor() {}

    /**
     * Given a value, find all possible sigmas to make the equation to equal that value
     * 
     * @param {Value} value to be changed to
     * @param {Value} ogVal : The original value of the equation
     * 
     * @returns {List<JSON>} possible outputs
     */
    change(val, ogVal) {
        throw new Error("Called abstract change() function!");
    };
}

class None extends Equation {

    constructor() {
        super();
    }

    change(val) {
        return [{}];
    }
}

class SingleLoc extends Equation {

    constructor(loc) {
        super();
        this.loc = loc;
    }

    change(val) {
        let trace = locToValue[this.loc];
        let outputs = trace[0].change(val);
        for (let output of outputs) {
            output[this.loc] = [trace[0], val];
        }
        return outputs;
    }

    getValue() {
        return locToValue[this.loc][1].getValue();
    }

    getValueObj() {
        return locToValue[this.loc][1];
    }
}

class AddEq extends Equation {

    /**
     * 
     * @param {SingleLoc} fst 
     * @param {SingleLoc} snd 
     */
    constructor(fst, snd) {
        super();
        this.fst = fst;
        this.snd = snd;
    }

    change(val) {
        let output1 = this.fst.change(new NumValue(val.getValue() - this.snd.getValue()));
        let output2 = this.snd.change(new NumValue(val.getValue() - this.fst.getValue()));
        return output1.concat(output2);
    }
}

/**
 * Exp is a class that represents an expression
 * 
 */
class Exp {

    static loc = 0;
    /**
     * 
     * @param {List<Exp>} inputs 
     */
    constructor(inputs) {
        this.inputs = inputs;
        this.topLevel = false;
    }

    setTopLevel(topLevel) {
        this.topLevel = topLevel;
    }

    toJS() {
        throw new Error("Abstract toJS() method called!")
    }

    addNewLineIfGlobal(str) {
        return str + (this.topLevel ? ";\n" : "");
    }

    static newLocation() {
        Exp.loc++;
        return Exp.loc;
    }

    static reParse() {
        ShapeDiv.idCounter = 0;
        varToLoc = {};
        locToValue = {};
        Exp.loc = 0;
    }

    /**
     * 
     * @param {JSON} rho : Mapping of names to locations
     * @returns {Integer} location
     */
    eval(rho) {
        throw new Error("Abstract eval() method called!")
    }

}

class Lambda extends Exp {

    /**
     * 
     * @param {List<String>} params 
     * @param {List<Definition | Exp>} body 
     * @param {Exp} returnExp
     * @param {String} type : Either arrow or function declaration
     */
    constructor(params, body, returnExp, type) {
        super(body);
        this.params = params;
        this.returnExp = returnExp;
        this.type = type;
    }

    eval(rho) {
        let newLoc = Exp.newLocation();
        let value = new Closure({params : this.params, returnExp : this.returnExp, type : this.type, body: this.inputs}, 
                                shallowCopy(rho));
        locToValue[newLoc] = [new None(), value];
        return newLoc;
    }

    toJS() {
        let jsStr = "(";
        for (let param of this.params) {
            jsStr += param + ", ";
        }
        jsStr = jsStr.substring(0, jsStr.length - 2);
        jsStr += ")";

        if (this.type == "ArrowFunctionExpression") {
            jsStr += " => ";
        }
        
        jsStr += "{\n";
        for (let statement of this.inputs) {
            jsStr += statement.toJS();
        }
        if (this.returnExp != null) {
            jsStr += `return ${this.returnExp.toJS()};\n`;
        }
        jsStr += "}";
        return this.addNewLineIfGlobal(jsStr);
    }

}

class Literal extends Exp {

     /**
     * 
     * @param {String | Integer} value 
     * @param {List<Exp>} inputs 
     */
     constructor(loc, value) {
        super([]);
        this.loc = loc;
        this.value = value;
    }

    toJS() {
        return `${locToValue[this.loc][1].getValue()}`;
    }

    eval(env) {
        if (locToValue[this.loc] == null) {
            locToValue[this.loc] = [new None(), this.value];
        }
        return this.loc;
    }
}

class Num extends Literal {

    constructor(loc, value) {
        if (typeof value !== "number") {
            throw new TypeError("Tried to construct a Num literal with a non-integer value.");
        }
        super(loc, new NumValue(value));
    }

    toJS() {
        return this.addNewLineIfGlobal(`${this.value.getValue()}`);
    }
}

class Str extends Literal {

    constructor(loc, value) {
        if (typeof value !== "string") {
            throw new TypeError("Tried to construct a Str literal with a non-string value.");
        }
        super(loc, new StrValue(value));
    }

    toJS() {
        let jsStr = this.addNewLineIfGlobal('"' + super.toJS() + '"');
        console.log(jsStr, "location is ", this.loc);
        return jsStr;
    }
}

class Variable extends Exp {

    /**
    * 
    * @param {String} name
    * @param {List<Exp>} inputs 
    */
    constructor(name) {
        super([]);
        this.name = name;
   }

    toJS() {
        return this.addNewLineIfGlobal(this.name);
    }

    eval(env) {
        if (env[this.name] == null) {
            throw new Error(`Unbound variable ${this.name}`);
        }
        return env[this.name];
    }

}

class Add extends Exp {

    /**
     * 
     * @param {Exp} fst 
     * @param {Exp} snd 
     */
    constructor(fst, snd) {
        super([fst, snd]);
    }

    toJS() {
        return `${this.inputs[0].toJS()} + ${this.inputs[1].toJS()}`;
    }

    eval(env) {
        let newLoc = Exp.newLocation();
        let fstLoc = new SingleLoc(this.inputs[0].eval(env));
        let sndLoc = new SingleLoc(this.inputs[1].eval(env));

        let sum = new NumValue(fstLoc.getValue() + sndLoc.getValue());
        locToValue[newLoc] = [new AddEq(fstLoc, sndLoc), sum];
        return newLoc;
    }
}

/**
 * @param {String} keyword
 * @param {JSON} env 
 */
function evalKeyword(keyword, locations) {
    if (locations.length != visualKeywords[keyword].length) {
        throw new SyntaxError(`${keyword} is supposed to take in ${visualKeywords[keyword].length} arguments!`);
    }
    let newLoc = Exp.newLocation();
    for (let i = 0; i < locations.length; i++) {
        let valueAtLoc = locToValue[locations[i]][1];
        if (!(valueAtLoc instanceof visualKeywords[keyword][i])) {
            let argType = valueAtLoc.constructor.name;
            let expectedType = visualKeywords[keyword][i].name;
            throw new TypeError(`#${i + 1} argument call to function ${keyword} has incorrect type ${argType} when expected type is ${expectedType}!`);
        }
    }
    let value;
    if (keyword == "Add") {
        let shape = locToValue[locations[0]][1];
        if (shape != null) {
            visualOutput[shape.id] = shape;
        }
        value = new Null();
    }
    else if (keyword == "Rect") {
        let locationEqs = [];
        for (let l of locations) {
            locationEqs.push(new SingleLoc(l));
        }
        value = new RectDiv(locationEqs);
    }
    
    locToValue[newLoc] = [new None(), value];
    return newLoc;
}

class FunctionCall extends Exp {

    /**
    * Note: currently, expressions that return functions cannot be called, functions
    * can only be called with their name.
    * 
    * @param {String} Function name
    * @param {Value} value
    * @param {List<Exp>} args 
    */
    constructor(name, args) {
        super(args);
        this.name = name;
    }

    toJS() {
        let js = `${this.name}(`;
        for (let arg of this.inputs) {
            js += arg.toJS() + ", ";
        }
        js = js.substring(0, js.length - 2);
        js += ")";
        return this.addNewLineIfGlobal(js);
    }

    eval(env) {
        let locs = []
        // Evaluate the arguments
        for (let arg of this.inputs) {
            let argLoc = arg.eval(env);
            locs.push(argLoc);
        }

        let loc;
        // User defined Functions
        if (visualKeywords[this.name] == null) {
            let lambdaLoc = env[this.name];
            if (lambdaLoc == null) {
                throw new Error(`${this.name} is not defined.`);
            }
            let closure = locToValue[lambdaLoc][1];
            if (!(closure instanceof Closure)) {
                throw new Error(`${this.name} is not a function.`);
            }
            if (closure.params.length != locs.length) {
                throw new SyntaxError(`${this.name} expects ${this.params.length} parameters but received ${this.inputs.length} arguments!`);
            }
            let extendedRho = shallowCopy(env);

            for (let i = 0; i < closure.params.length; i++) {
                extendedRho[closure.params[i]] = locs[i];
            }
            for (let s of closure.body) {
                s.eval(extendedRho);
            }
            if (closure.returnExp == null) {
                loc = Exp.newLocation();
                locToValue[loc] = [new None(), new Null()];
            }
            else {
                loc = closure.returnExp.eval(extendedRho);
            }
        }
        // Keywords
        else {
            loc = evalKeyword(this.name, locs);
        }
        return loc;
    }
}

/**
 * Definition is a class that stores a variable declaration's name, along
 * with its Exp it was assigned
 */
class Definition {

    /**
     * 
     * @param {String} name 
     * @param {Exp} Exp 
     * @param {String} kind 
     */
    constructor(name, exp, kind) {
        this.name = name;
        this.exp = exp;
        this.kind = kind;
    }

    toJS() {
        if (this.kind == "function") {
            // Without the equal sign!
            return `${this.kind} ${this.name} ${this.exp.toJS()};\n`;
        }
        return `${this.kind} ${this.name} = ${this.exp.toJS()};\n`;
    }

    eval(env) {
        let loc = this.exp.eval(env);
        env[this.name] = loc;
        return loc;
    }
}

/**
 * A class that represents a value of expressions
 */
class Value {

    getValue() {
        throw new TypeError("Called completely abstract getValue() function!");
    }
};

class Null extends Value {

    constructor() {
        super();
    }
}

class StrValue extends Value {

    /**
     * @param {String} value 
     */
    constructor(value) {
        super();
        this.value = value;
    }

    /**
     * @returns {String}
     */
    getValue() {
        return this.value;
    }
}

class NumValue extends Value {

    /**
     * @param {Integer} value 
     */
    constructor(value) {
        super();
        this.value = value;
    }

    /**
     * @returns {Integer}
     */
    getValue() {
        return this.value;
    }
}

/**
 * Closure is the value of functions
 * 
 */
class Closure extends Value {

    constructor(lambda, env) {
        super();
        this.env = env;
        this.params = lambda.params;
        this.body = lambda.body;
        this.returnExp = lambda.returnExp;
    }

}

/**
 * ShapeDiv is a class that represents the objects in the visual output
 */
class ShapeDiv extends Value {

    static idCounter = 0;

    constructor() {
        super();
        ShapeDiv.idCounter++;
        this.id = ShapeDiv.idCounter;
    }

    toHTML() {
        throw new Error("Abstract Shape method toString() called!");
    };

    changeText(changed) {
        throw new Error("Abstract Shape method changeText() called!");
    }

    drag(newX, newY) {
        throw new Error("Abstract Shape method drag() called!");
    }
}

class RectDiv extends ShapeDiv {

    /**
     * 
     * @param {List<SingleLoc>} locations
     */
    constructor(inputs) {
        super();
        this.width = inputs[0];
        this.height = inputs[1];
        this.text = inputs[2];
        this.x = inputs[3];
        this.y = inputs[4];
    }

    toHTML() {
        // TODO: change options to be a JSON
        let width = this.width.getValue();
        let height = this.height.getValue();
        let x = this.x.getValue();
        let y = this.y.getValue();
        let text = this.text.getValue();
        let str = `<div class="shape" id = "${this.id}"
                    style="width: ${width}px; height: ${height}px; 
                           position: relative; left: ${x}px; top: ${y}px; 
                           border: 1px solid black; background-color: blue; text-align: center;
                           line-height: ${height}px;">
                    ${text}
                </div>`;
        return str;
            
    }

    /**
     * Changes the text of the div to be the new text
     * 
     * @param {Value} newText 
     */
    changeText(newText) {
        let outputs = this.text.change(newText, this.text.getValueObj());
        // Deterministic output
        if (outputs.length == 1) {
            for (let key in outputs[0]) {
                locToValue[key] = outputs[0][key];
            }
        }
        // Nondeterministic output
        else {
            throw new Error("Non deterministic output not implemented");
        }
    }
}

// Map of keywords that create visual output to the amount of arguments
                                   // width, height,    text,     x,        y
const visualKeywords = {"Rect" : [NumValue, NumValue, StrValue, NumValue, NumValue], 
                        "Add"    : [ShapeDiv]}

function parseStatements(statements) {
    let block = [];
    // Map every single variable name to their declaration information, 
    // along with every top level expression to their expression trace
    for (let statement of statements) {
        if (statement.type == "VariableDeclaration") {
            let declarations = statement.declarations;
            for (let dec of declarations) {
                let exp = parseExp(dec.init);
                let def = new Definition(dec.id.name, exp, statement.kind);
                block.push(def);
            }
        }
        else if (statement.type == "FunctionDeclaration") {
            let funName = statement.id.name;
            let exp = parseExp(statement);
            let def = new Definition(funName, exp, "function");
            block.push(def);
        }
        else if (statement.type == "ExpressionStatement") {
            let Exp = parseExp(statement.expression);
            Exp.setTopLevel(true);
            block.push(Exp);
        }
    }
    return block;
}


function parseCode(code) {
    let statements = acorn.parse(code, {ecmaVersion: 2020}).body;
    program = parseStatements(statements);
}

function evalCode(code) {
    Exp.reParse();
    parseCode(code);
    execCode();
}

function execCode() {
    visualOutput = {};

    for (let statement of program) {
        statement.eval(varToLoc);
    }
}

/**
 * 
 * @param {JSON} exp 
 * @returns Exp
 */
function parseBinaryOp(exp) {
    let leftExp = parseExp(exp.left);
    let rightExp = parseExp(exp.right);

    if (exp.operator == "+") {
        return new Add(leftExp, rightExp);
    }
    else {
        throw new SyntaxError(exp.operator + " is currently not supported!");
    }
}

/**
 * 
 * @param {JSON} exp 
 * @returns Exp
 */
function parseExp(exp) {
    if (exp.type == "Literal") {
        let newloc = Exp.newLocation();
        if (typeof exp.value === "number") {
            return new Num(newloc, exp.value);
        }
        else if (typeof exp.value == "string") {
            return new Str(newloc, exp.value);
        }
        throw new SyntaxError("Unsupported literal");
    }
    // Function call or keyword
    else if (exp.type == "CallExpression") {
        let functionName = exp.callee.name;
        let args = [];
        for (let arg of exp.arguments) {
            let argTrace = parseExp(arg);
            args.push(argTrace);
        }
        return new FunctionCall(functionName, args);
    }
    // Variable reference
    else if (exp.type == "Identifier") {
        return new Variable(exp.name);
    }
    else if (exp.type == "ArrowFunctionExpression" || exp.type == "FunctionDeclaration") {
        let params = [];
        for (let param of exp.params) {
            if (param.type != "Identifier") {
                throw new SyntaxError("Unsupported parameter type!");
            }
            params.push(param.name);
        }
        let lastExp = exp.body.body[exp.body.body.length - 1];
        let returnStatement = null;
        if (lastExp.type == "ReturnStatement") {
            returnStatement = parseExp(lastExp.argument);
            // Remove the return statement
            exp.body.body.pop(); 
        }
        let body = parseStatements(exp.body.body);
        let lambda = new Lambda(params, body, returnStatement, exp.type);
        return lambda;
    }
    else if (exp.type == "BinaryExpression") {
        return parseBinaryOp(exp);
    }
    throw new SyntaxError(exp.type + " is currently not supported!");
}


function programToString() {
    let fullProgram = "";
    for (let trace of program) {
        fullProgram += trace.toJS();
    }
    return fullProgram;
}

function visualOutputToHTML() {
    let html = "";

    for (let id in visualOutput) {
        let shape = visualOutput[id];
        if (shape == null) {
            continue;
        }
        let htmlShape = shape.toHTML();
        html += htmlShape;
    }
    return html;
}

/**
 * 
 * @param {Integer} id 
 * @param {String} newText 
 */
function changeText(id, newText) {
    if (visualOutput[id] == null) {
        return;
    }
    visualOutput[id].changeText(new StrValue(newText));
}

module.exports = {visualOutputToHTML, evalCode, changeText, programToString, execCode};