/**
 * Starting features to support
 * 
 * - Declarations
 *  - let
 * - Expressions
 *    - Literals
 * - Keywords:
 *    - Box
 *    - Circle
 *    - Add
 * 
 * Define operations that can be done on the output:
 *  - Creating a box
 *  - Changing the text of a box
 *  - Moving a box
 * 
 * 
 * From input change -> output : Easy, just re run it
 * From output change -> input : Propogation changes
 * 
 * 
 * Code Input
 * Code will be parsed by acorn, and translated into a list of definitions
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
 * This is an example of why blocks need to create a new expression trace object
 * for every instance
 * 
 *  function AddSquare (text) {
       let sq = Rect(100, 100, text, 50, 70);
       Add(sq);
    }
    AddSquare("sds");
    AddSquare("I Love you");
 * 
*/
/**
 * - Check out sketch n sketch
 * - Formalize what im doing (Latex) (Robby's formalism)
 * - Seperate this file into modules
 * 
function hello (diff) {
    let diff1 = diff;
    return diff1;
}
let sq = Rect(100, 100, hello("sadss"), 50, 50);
let sq2 = Rect(100, 100, hello("bongo"), 200, 200);
Add(sq);
Add(sq2);

 */
let acorn = require("acorn");

// The list of Definitions and ExpTraces
let program = [];

// The visual output is stored as a map of shape ids to shape instances
let visualOutput = {};

// Map of variable names to references of their assigned expression traces
let varToExp = {};


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
/**
 * ExpTrace is a class that records an expression's value, along with
 * the full parsed expression 
 * 
 */
class ExpTrace {

    /**
     * 
     * @param {Value} value 
     * @param {List<ExpTrace>} inputs 
     */
    constructor(inputs) {
        this.value = null;
        this.inputs = inputs;
        this.topLevel = false;
    }

    setTopLevel(topLevel) {
        this.topLevel = topLevel;
    }
    /**
     * changeValue() executes changes to expressions from visual changes from 
     * the output.
     * 
     * @param {String | Integer} newValue 
     * @param {JSON} : env of variable names to their expression traces
     */
    changeValue(newValue, env) {
        throw new Error("Abstract changeValue() method called!")
    }

    toJS() {
        throw new Error("Abstract toJS() method called!")
    }

    addNewLineIfGlobal(str) {
        return str + (this.topLevel ? ";\n" : "");
    }

    /**
     * 
     * @param {Value} value 
     */
    setValue(value) {
        this.value = value;
    }

    /**
     * Populates the value field and returns it
     * 
     * @returns {Value}
     */
    eval(env) {
        throw new Error("Abstract eval() method called!")
    }

}

/**
 * A Lambda expression can exist in two forms:
* - A class only containing the parsed lambda expression JSON object from Acorn
* - An expression trace
* 
* A lambda expression may be constructed with only the parsed data
* because every instance of a call to a lambda expression has to contain
* a copied version of the lambda expression trace. Storing the parsed data,
* and then parsing it into expression trace makes copying a lambda expression 
* trace much easier than implementing a copy() function for each expression trace.
 * 
 */

class ParsedLambda extends ExpTrace {

    /**
     * 
     * @param {JSON} parsedData : The parsed expression information from acorn
     * @param {*} jsCode : The javascript code the user wrote to make this lambda expression
     */
    constructor(parsedData, jsCode) {
        super([]);
        this.parsedData = parsedData;
        this.jsCode = jsCode;
        this.value = null;
    }

    eval(env) {
        this.value = new Closure(this.parsedData, shallowCopy(env));
    }

    toJS() {
        return this.jsCode;
    }

}


class Lambda extends ExpTrace {

    /**
     * This class can only be created by a FunctionCall expression trace.
     * 
     * @param {List<String>} params 
     * @param {List<Definition | ExpTrace>} body 
     * @param {ExpTrace} returnExp
     * @param {String} type : Either arrow or function declaration
     */
    constructor(params, body, returnExp, type) {
        super(body);
        this.params = params;
        this.returnExp = returnExp;
        this.type = type;
        this.value = null;
    }

    eval(env) {
        throw new Error("eval() called on a copied lambda expression!")
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

    /**
     * Note: the list of inputs have already been evaluated
     * 
     * @param {List<ExpTrace>} inputs 
     * @returns {Value} return value
     */
    callFunction(inputs) {
        // Extend the environment
        let extendedEnv = shallowCopy(this.value.env);
       
        for (let i = 0; i < this.params.length; i++) {
            extendedEnv[this.params[i]] = inputs[i];
        } 
        
        // Run every statement in the body
        for (let statement of this.inputs) {
            statement.eval(extendedEnv);
        }

        if (this.returnExp == null) {
            return new Null();
        }

        return this.returnExp.eval(extendedEnv);
    }

    // The lambda will choose the return statement to propogate the change to
    changeReturnValue(newValue, env) {
        // Execute each statement to declare potential variables in env
        for (let statement of this.inputs) {
            statement.eval(env);
        }
        this.returnExp.changeValue(newValue, env);
    }
}

class Literal extends ExpTrace {

     /**
     * 
     * @param {String | Integer} value 
     * @param {List<ExpTrace>} inputs 
     */
     constructor() {
        super([]);
    }

    changeValue(newValue, env) {
        this.value = newValue;
    }

    toJS() {
        return `${this.value.getValue()}`;
    }

    eval(env) {
        return this.value;
    }
}

class Num extends Literal {

    constructor(value) {
        if (typeof value !== "number") {
            throw new TypeError("Tried to construct a Num literal with a non-integer value.");
        }
        super();
        this.value = new NumValue(value);
    }

    toJS() {
        return this.addNewLineIfGlobal(`${this.value.getValue()}`);
    }
}

class Str extends Literal {

    constructor(value) {
        if (typeof value !== "string") {
            throw new TypeError("Tried to construct a Str literal with a non-string value.");
        }
        super();
        this.value = new StrValue(value);
    }

    toJS() {
        return this.addNewLineIfGlobal('"' + super.toJS() + '"');
    }
}

class Variable extends ExpTrace {

    /**
    * 
    * @param {String} name
    * @param {List<ExpTrace>} inputs 
    */
    constructor(name) {
        super([]);
        this.name = name;
   }

   /*
    * @param {Value} newValue : The new value
    */
    changeValue(newValue, env) {
        this.value = newValue;
        if (env[this.name] == null) {
            throw new Error(`Unbound variable ${this.name}`);
        }
        env[this.name].changeValue(newValue, env);
    }

    toJS() {
        return this.addNewLineIfGlobal(this.name);
    }

    eval(env) {
        this.value = env[this.name].value;
        return env[this.name].value;
    }
}

/**
 * @param {String} keyword
 * @param {JSON} env 
 */
function evalKeyword(keyword, env, inputs) {
    if (inputs.length != visualKeywords[keyword].length) {
        throw new SyntaxError(`${keyword} is supposed to take in ${visualKeywords[keyword].length} arguments!`);
    }
    for (let i = 0; i < inputs.length; i++) {
        if (!(inputs[i].value instanceof visualKeywords[keyword][i])) {
            let argType = inputs[i].value.constructor.name;
            let expectedType = visualKeywords[keyword][i].name;
            throw new TypeError(`#${i + 1} argument call to function ${keyword} has incorrect type ${argType} when expected type is ${expectedType}!`);
        }
    }

    if (keyword == "Add") {
        let shape = inputs[0].value;
        if (shape != null) {
            visualOutput[shape.id] = shape;
        }
        return new Null();
    }
    else if (keyword == "Rect") {
        return new RectDiv(inputs[0], inputs[1], 
                           inputs[2], inputs[3], 
                           inputs[4], shallowCopy(env));
    }
}
class FunctionCall extends ExpTrace {

    /**
    * Note: currently, expressions that return functions cannot be called, functions
    * can only be called with their name.
    * 
    * @param {String} Function name
    * @param {Value} value
    * @param {List<ExpTrace>} args 
    */
    constructor(name, args) {
        super(args);
        this.name = name;
        this.lambdaCopy = null;
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
        // Evaluate the arguments
        for (let arg of this.inputs) {
            arg.eval(env);
        }

        // User defined Functions
        if (visualKeywords[this.name] == null) {
            let lambda = env[this.name];
            if (lambda == null) {
                throw new Error(`${this.name} is not defined.`);
            }
            if (!(lambda instanceof Lambda)) {
                throw new Error(`${this.name} is not a function.`);
            }
            if (lambda.params.length != this.inputs.length) {
                throw new SyntaxError(`${this.name} expects ${this.params.length} parameters but received ${this.inputs.length} arguments!`);
            }
            // For every function call, the function body is copied to have their own instances of expression traces.
            // Two function calls cannot share the same expression traces in the same function body.
            // this.lambdaCopy = structuredClone(lambda);
        }
        // Keywords
        else {
            this.value = evalKeyword(this.name, env, this.inputs);
        }
        return this.value;
    }

    /**
     * Changes the value of a function call from the change in visual input
     * 
     * @param {Value} newValue 
     */
    changeValue(newValue, env) {
        // If the values are equivalent, no change is needed
        if (newValue.getValue() == this.value.getValue()) {
            return;
        }
        let lambda = env[this.name];
        // Extend the closure
        let extendedEnv = shallowCopy(lambda.value.env);

        // Map each parameter to each argument expression trace
        for (let i = 0; i < this.inputs.length; i++) {
            extendedEnv[lambda.params[i]] = this.inputs[i];
        }
        lambda.changeReturnValue(newValue, extendedEnv);
        this.value = newValue;
    }
}

/**
 * Definition is a class that stores a variable declaration's name, along
 * with its ExpTrace it was assigned
 */
class Definition {

    /**
     * 
     * @param {String} name 
     * @param {ExpTrace} expTrace 
     * @param {String} kind 
     */
    constructor(name, expTrace, kind) {
        this.name = name;
        this.expTrace = expTrace;
        this.kind = kind;
    }

    toJS() {
        if (this.kind == "function") {
            return `function ${this.name} ${this.expTrace.toJS()}\n`;
        }
        
        return `${this.kind} ${this.name} = ${this.expTrace.toJS()};\n`;
    }

    eval(env) {
        let value = this.expTrace.eval(env);
        env[this.name] = this.expTrace;
        return value;
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

    constructor(text, env) {
        super();
        this.env = env;
        ShapeDiv.idCounter++;
        this.text = text;
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
     * @param {ExpTrace} width 
     * @param {ExpTrace} height 
     * @param {ExpTrace} text 
     * @param {ExpTrace} x 
     * @param {ExpTrace} y
     * @param {JSON} env
     */
    constructor(width, height, text, x, y, env) {
        super(text, shallowCopy(env));
        this.width = width;
        this.height = height;
        this.x = x;
        this.y = y;
    }

    toHTML() {
        // TODO: change options to be a JSON
        let width = this.width.value.getValue();
        let height = this.height.value.getValue();
        let x = this.x.value.getValue();
        let y = this.y.value.getValue();
        let text = this.text.value.getValue();
        

        return `<div class="shape" id = "${this.id}"
                    style="width: ${width}px; height: ${height}px; 
                           position: relative; left: ${x}px; top: ${y}px; 
                           border: 1px solid black; background-color: blue; text-align: center;
                           line-height: ${height}px;">
                    ${text}
                </div>`;
            
    }

    /**
     * Changes the text of the div to be the new text
     * 
     * @param {Value} newText 
     */
    changeText(newText) {
        this.text.changeValue(newText, this.env);
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
            let expTrace = parseExp(statement.expression);
            expTrace.setTopLevel(true);
            block.push(expTrace);
        }
    }
    return block;
}


function parseCode(code) {
    let statements = acorn.parse(code, {ecmaVersion: 2020}).body;
    program = parseStatements(statements);
}

function evalCode(code) {
    parseCode(code);
    execCode();
}

function execCode() {
    visualOutput = {};
    varToExp = {};

    for (let statement of program) {
        statement.eval(varToExp);
    }
}

/**
 * 
 * @param {JSON} exp 
 * @returns Lambda
 */
function parseLambda(exp) {
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
    let lambda = new Lambda(null, params, body, returnStatement, exp.type);
    return lambda;
}
/**
 * 
 * @param {JSON} exp 
 * @returns ExpTrace
 */
function parseExp(exp) {
    if (exp.type == "Literal") {
        if (typeof exp.value === "number") {
            return new Num(exp.value);
        }
        else if (typeof exp.value == "string") {
            return new Str(exp.value);
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
        return new Lambda(exp);
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
        console.log(JSON.stringify(shape, null, 2));
        let htmlShape = shape.toHTML();
        console.log(htmlShape);
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