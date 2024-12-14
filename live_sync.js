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

function AddSquare (text, y) {
    let sq = Rect(100, 100, text, 50, y);
    Add(sq);
}
let y = 100;
AddSquare("sds", y);
AddSquare("I Love you", y + 150);
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
        console.log("changing ", this.getValue(), "to be", val.getValue());
        // No need to change this location if it is already equivalent to val
        if (this.getValueObj().equals(val)) {
            return [];
        }
        let trace = locToValue[this.loc];
        // Change the location's dependencies
        let outputs = trace[0].change(val);
        // After changing the location's dependencies, update the value of the location
        // in sigma.
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
        console.log("output1", output1);
        console.log("output2", output2);
        let union = output1.concat(output2);
        return union;
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
        let value = locToValue[this.loc][1].getValue();
        return value;
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
        return this.addNewLineIfGlobal(super.toJS());
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
 * 
 * 
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

            // Extend rho to have the parameters
            for (let i = 0; i < closure.params.length; i++) {
                extendedRho[closure.params[i]] = locs[i];
            }
            for (let s of closure.body) {
                s.eval(extendedRho);
            }
            // If the function does not return anything
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
 * 
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

    equals(val) {
        throw new TypeError("Called completely abstract equals(val) function!");
    }
};

class Null extends Value {

    constructor() {
        super();
    }

    equals(val) {
        return val instanceof Null;
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

    equals(val) {
        return (val instanceof StrValue) && val.getValue() == this.getValue();
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

    equals(val) {
        return (val instanceof NumValue) && val.getValue() == this.getValue();
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

    equals(val) {
        return false;
    }
}

/**
 * ShapeDiv is a class that represents the objects in the visual output
 */
class ShapeDiv extends Value {

    static idCounter = 0;

    /**
     * 
     * @param {SingleLoc} text 
     * @param {SingleLoc} x 
     * @param {SingleLoc} y 
     */
    constructor(text, x, y) {
        super();
        ShapeDiv.idCounter++;
        this.id = ShapeDiv.idCounter;
        this.text = text;
        this.x = x;
        this.y = y;
    }

    toHTML() {
        throw new Error("Abstract Shape method toString() called!");
    };



    /**
     * Changes the text of the div to be the new text
     * 
     * @param {Value} newText 
     */
    changeText(newText) {
        let outputs = this.text.change(newText);
        return makeChangeToCode(outputs);
    }

    /**
     * 
     * @param {NumValue} x 
     * @returns {JSON}
     */
    moveX(x) {
        let outputs = this.x.change(x);
        return makeChangeToCode(outputs);
    }

    /**
     * 
     * @param {NumValue} x 
     * @returns {JSON}
     */
    moveY(y) {
        let outputs = this.y.change(y);
        return makeChangeToCode(outputs);
    }
}

class RectDiv extends ShapeDiv {

    /**
     * 
     * @param {List<SingleLoc>} locations
     */
    constructor(inputs) {
        super(inputs[2], inputs[3], inputs[4]);
        this.width = inputs[0];
        this.height = inputs[1];
    }

    toHTML() {
        // TODO: change options to be a JSON
        let width = this.width.getValue();
        let height = this.height.getValue();
        let x = this.x.getValue();
        let y = this.y.getValue();
        let text = this.text.getValue();
        let str = `<div class="shape" id = "${this.id}"
                    style="width: ${width}px; height: ${height}px; position: absolute; left: ${x}px; top: ${y}px; border: 1px solid black; background-color: blue; text-align: center; line-height: ${height}px;">
                    ${text}
                </div>`;
        return str;
            
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

function makeChangeToCode(outputs) {

    let results = [];
    let possibleSigmas = [];
    // For every single possible output, create a new sigma that includes the output
    for (let output of outputs) {
        let possible = shallowCopy(locToValue);
        for (let l in output) {
            possible[l] = output[l];
        }
        possibleSigmas.push(possible);
    }

    // Then execute the code for every single possible sigma and store the resulting 
    // program code and visual output HTML to show to the user
    for (let i = 0; i < possibleSigmas.length; i++) {
        locToValue = possibleSigmas[i];
        execCode();
        results.push({code : programToString(), 
                       visualOutput: visualOutputToHTML(), 
                       sigma: possibleSigmas[i]});
    }

    // If it is not a deterministic change, then temporarily set sigma to the first result
    if (possibleSigmas.length > 1) {
        locToValue = possibleSigmas[0];
    }
    // If the we tried to do a change that resulted in no changes
    if (results.length == 0) {
        results.push({code : programToString(), 
                      visualOutput: visualOutputToHTML(), 
                      sigma: locToValue})
    }
    return results;
}

/**
 * Note: Changing text will always be a deterministic change
 * 
 * @param {Integer} id 
 * @param {String} newText 
 */
function changeText(id, newText) {
    if (visualOutput[id] == null) {
        throw new Error("Shape element must be selected!");
    }
    return visualOutput[id].changeText(new StrValue(newText));
}

/**
 * 
 * @param {Integer} id 
 * @param {String} axis
 * @param {String} value
 * @returns 
 */
function moveShape(id, axis, value) {

    if (visualOutput[id] == null) {
        throw new Error("Shape element must be selected!");
    }
    if (isNaN(value)) {
        throw new Error(`${axis} coord must be a valid integer value!`)
    }

    if (axis == "x") {
        return visualOutput[id].moveX(new NumValue(parseInt(value)));
    }
    else {
        return visualOutput[id].moveY(new NumValue(parseInt(value)));
    }
}

function changeSigma(newSigma) {
    locToValue = newSigma;
}

module.exports = {visualOutputToHTML, evalCode, changeText, moveShape, changeSigma};