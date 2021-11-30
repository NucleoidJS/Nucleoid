const assert = require("assert");
const nucleoid = require("../../index");
const state = require("../state").state;
const graph = require("../graph");

function validate(error, expectedError, expectedMessage) {
  return error instanceof expectedError && error.message === expectedMessage;
}

nucleoid.start({ cacheOnly: true });

describe("Nucleoid", function () {
  const details = { details: true };

  beforeEach(function () {
    for (let property in state) delete state[property];
    for (let property in graph) delete graph[property];

    state["Classes"] = [];
    graph["Classes"] = { name: "Classes" };
  });

  it("runs statements in the state", function () {
    nucleoid.run("var i = 1 ;");
    assert.equal(nucleoid.run("i == 1"), true);
  });

  it("runs expression statement", function () {
    nucleoid.run("var j = 1 ;");
    assert.equal(nucleoid.run("j + 2"), 3);
  });

  it("rejects variable declaration without definition", function () {
    assert.throws(
      function () {
        nucleoid.run("var a");
      },
      (error) => validate(error, SyntaxError, "Missing definition")
    );

    assert.throws(
      function () {
        nucleoid.run("var a ;");
      },
      (error) => validate(error, SyntaxError, "Missing definition")
    );
  });

  it("allows variable declaration without var keyword", function () {
    nucleoid.run("pi = 3.14 ;");
    assert.equal(nucleoid.run("pi == 3.14"), true);
  });

  it("allows statements without semicolon at the end", function () {
    nucleoid.run("au = 149597870700");
    assert.equal(nucleoid.run("au == 149597870700"), true);
  });

  it("creates dependency based on length of identifier", function () {
    nucleoid.run("str1 = 'ABC'");
    nucleoid.run("i1 = str1.length + 1");
    assert.equal(nucleoid.run("i1"), 4);

    nucleoid.run("str1 = 'ABCD'");
    assert.equal(nucleoid.run("i1"), 5);

    nucleoid.run("if ( str1.length > 5 ) { i2 = i1 }");
    nucleoid.run("str1 = 'ABCDEF'");
    assert.equal(nucleoid.run("i2"), 7);
  });

  it("validates syntax of class", function () {
    assert.throws(
      function () {
        nucleoid.run("class Ratio ( }");
      },
      (error) => validate(error, SyntaxError, "Unexpected token (")
    );

    assert.throws(
      function () {
        nucleoid.run(
          "class Ratio { constructor ( count ) { this.count = count } calculate ( ) }"
        );
      },
      (error) => validate(error, SyntaxError, "Methods are not supported.")
    );

    assert.throws(
      function () {
        nucleoid.run("class Ratio { calculate() }");
      },
      (error) => validate(error, SyntaxError, "Methods are not supported.")
    );

    assert.throws(
      function () {
        nucleoid.run("class Ratio {");
      },
      (error) => validate(error, SyntaxError, "Missing parenthesis")
    );

    assert.throws(
      function () {
        nucleoid.run("class Ratio");
      },
      (error) => validate(error, SyntaxError, "Missing parentheses")
    );

    assert.throws(
      function () {
        nucleoid.run("class Ratio { calculate() )");
      },
      (error) => validate(error, SyntaxError, "Missing parenthesis")
    );
  });

  it("creates class with constructor", function () {
    nucleoid.run("class Device { constructor ( name ) { this.name = name } }");
    nucleoid.run("Device.active = false");
    nucleoid.run("if ( Device.name ) { Device.active = true }");

    nucleoid.run("device1 = new Device ( 'Entrance' )");
    assert.equal(nucleoid.run("device1.name"), "Entrance");
    assert.equal(nucleoid.run("device1.active"), true);

    let device2 = nucleoid.run("new Device ( 'Hall' )");
    nucleoid.run(`${device2.id}.name`, "Hall");
    nucleoid.run(`${device2.id}.active`, true);

    nucleoid.run("device3 = new Device ( )");
    assert.equal(nucleoid.run("device3.name"), undefined);
    assert.equal(nucleoid.run("device3.active"), false);

    let device4 = nucleoid.run("new Device ( )");
    assert.equal(nucleoid.run(`${device4.id}.name`), undefined);
    assert.equal(nucleoid.run(`${device4.id}.active`), false);
  });

  it("adds created class in class list", function () {
    assert.equal(nucleoid.run("Classes.length"), 0);

    nucleoid.run("class Student { }");
    assert.equal(nucleoid.run("Classes.length"), 1);

    nucleoid.run("class User { }");
    assert.equal(nucleoid.run("Classes.length"), 2);
  });

  it("updates class definition", function () {
    nucleoid.run("class Message { }");
    nucleoid.run("Message.read = false");
    nucleoid.run("message1 = new Message ( )");
    nucleoid.run(
      "class Message { constructor ( payload ) { this.payload = payload } }"
    );
    assert.equal(nucleoid.run("message1.read"), false);
    assert.equal(nucleoid.run("message1.payload"), undefined);

    nucleoid.run("message2 = new Message('MESSAGE')");
    assert.equal(nucleoid.run("message2.read"), false);
    assert.equal(nucleoid.run("message2.payload"), "MESSAGE");
  });

  it("validates syntax of instance creation", function () {
    nucleoid.run("class Board { }");
    nucleoid.run("class Card { }");
    assert.throws(
      function () {
        nucleoid.run("board1 = new Board { )");
      },
      (error) => validate(error, SyntaxError, "Unexpected token {")
    );

    assert.throws(
      function () {
        nucleoid.run("board1 = new Board ( }");
      },
      (error) => validate(error, SyntaxError, "Unexpected token }")
    );

    assert.throws(
      function () {
        nucleoid.run("board1 = new Board (");
      },
      (error) => validate(error, SyntaxError, "Missing parenthesis")
    );

    assert.throws(
      function () {
        nucleoid.run("board1 = new Board");
      },
      (error) => validate(error, SyntaxError, "Missing parentheses")
    );

    nucleoid.run("board1 = new Board ( )");
    assert.throws(
      function () {
        nucleoid.run("board1.card = new Card { )");
      },
      (error) => validate(error, SyntaxError, "Unexpected token {")
    );

    assert.throws(
      function () {
        nucleoid.run("board1.card = new Card ( }");
      },
      (error) => validate(error, SyntaxError, "Unexpected token }")
    );

    assert.throws(
      function () {
        nucleoid.run("board1.card = new Card (");
      },
      (error) => validate(error, SyntaxError, "Missing parenthesis")
    );

    assert.throws(
      function () {
        nucleoid.run("board1.card = new Card");
      },
      (error) => validate(error, SyntaxError, "Missing parentheses")
    );

    nucleoid.run("board1 instanceof Board");
    nucleoid.run("board1.card = new Card ( )");
    nucleoid.run("board1.card instanceof Card");
  });

  it("supports new line as replacing with space", function () {
    nucleoid.run("a = 1 ; \n b = 2");
    assert.equal(nucleoid.run("a"), 1);
    assert.equal(nucleoid.run("b"), 2);

    nucleoid.run("a = 3 ; \r b = 4");
    assert.equal(nucleoid.run("a"), 3);
    assert.equal(nucleoid.run("b"), 4);

    nucleoid.run("a = 5 ; \r\n b = 6");
    assert.equal(nucleoid.run("a"), 5);
    assert.equal(nucleoid.run("b"), 6);
  });

  it("supports string in expression", function () {
    assert.equal(nucleoid.run("'New String'"), "New String");
    assert.equal(nucleoid.run('"New String"'), "New String");
    assert.throws(
      function () {
        nucleoid.run(`'New String"`);
      },
      (error) => validate(error, SyntaxError, "Invalid or unexpected token")
    );
    assert.throws(
      function () {
        nucleoid.run(`"New String'`);
      },
      (error) => validate(error, SyntaxError, "Invalid or unexpected token")
    );
    assert.throws(
      function () {
        nucleoid.run("`New ${a} String`");
      },
      (error) => validate(error, SyntaxError, "Backtick is not supported.")
    );
  });

  it("supports standard built-in functions", function () {
    nucleoid.run("max = Number.MAX_SAFE_INTEGER");
    nucleoid.run("now = Date.now ( )");
  });

  it("supports creating standard built-in objects", function () {
    nucleoid.run("date = new Date ( '2019-7-24' )");
    assert.equal(nucleoid.run("date.getYear()"), 119);
  });

  it("supports value function of standard built-in objects", function () {
    const result = nucleoid.run("date1 = Date.now ( )", details);
    nucleoid.run(result.string.replace("date1", "date2"));
    assert.equal(nucleoid.run("date1 == date2"), true);

    nucleoid.run("date3 = Date.parse ( '04 Dec 1995 00:12:00 GMT' )");
    assert.equal(nucleoid.run("date3"), 818035920000);

    assert.throws(
      function () {
        nucleoid.run("date4 = Date.wrong ( )");
      },
      (error) => validate(error, TypeError, "Date.wrong is not a function")
    );
  });

  it.skip("supports value function", function () {
    nucleoid.run(
      "function generateInt ( ) { return 65 + Math.round ( Math.random ( ) * 24 ) }"
    );
    nucleoid.run("generateInt.value = true");

    let details = nucleoid.run("number1 = generateInt ( )", details);
    nucleoid.run(details.string.replace("number1", "number2"));
    assert.equal(nucleoid.run("number1 == number2"), true);

    nucleoid.run(
      "function generateString ( ) { let number = 65 + Math.round ( Math.random ( ) * 24 ) ; return String.fromCharCode ( number ) ; }"
    );
    nucleoid.run("generateString.value = true");

    details = nucleoid.run("string1 = generateString ( )", details);
    nucleoid.run(details.string.replace("string1", "string2"));
    assert.equal(nucleoid.run("string1 == string2"), true);
  });

  it.skip("supports multiple inline value functions", function () {
    nucleoid.run(
      "function generateInt ( ) { return Math.round ( Math.random ( ) * 100 ) }"
    );
    nucleoid.run("generateInt.value = true");

    let details = nucleoid.run(
      "number1 = generateInt ( ) ; number2 = generateInt ( )",
      details
    );
    nucleoid.run(
      details.string.replace("number1", "number3").replace("number2", "number4")
    );
    assert.equal(nucleoid.run("number1 == number3"), true);
    assert.equal(nucleoid.run("number2 == number4"), true);
  });

  it("calls function with no return", () => {
    nucleoid.run("a = 1");
    nucleoid.run("function copy ( val ) { b = val }");
    const result = nucleoid.run("copy ( a )");
    assert.equal(result, undefined);
  });

  it("calls function with returning variable", () => {
    nucleoid.run("a = 1");
    nucleoid.run("function copy ( val ) { b = val; return b; }");
    const result = nucleoid.run("copy ( a )");
    assert.equal(result, 1);
  });

  it("calls function with returning value", () => {
    nucleoid.run("a = 1");
    nucleoid.run("function copy ( val ) { b = val; return val; }");
    const result = nucleoid.run("copy ( a )");
    assert.equal(result, 1);
  });

  it("supports function in expression", function () {
    nucleoid.run("list = [1, 2, 3]");
    assert.equal(
      nucleoid.run(
        "list.find ( function ( element ) { return element == 3 } )"
      ),
      3
    );

    assert.equal(
      nucleoid.run("list.find ( element => { return element == 2 } )"),
      2
    );

    assert.equal(nucleoid.run("list.find ( element => element == 1 )"), 1);
    assert.equal(nucleoid.run("list.find ( element => ( element == 1 ) )"), 1);
  });

  it("supports function with parameter in expression", function () {
    nucleoid.run("samples = [ 38.2 , 39.1 , 38.8 , 39 ]");
    nucleoid.run("ratio = 2.1");
    nucleoid.run("element = 38.5");
    assert.equal(
      nucleoid.run(
        "samples.find ( function ( element ) { let result = element * ratio ; return result == 81.48 } )"
      ),
      38.8
    );

    assert.equal(
      nucleoid.run(
        "samples.find ( element => { let result = element * ratio ; return result == 81.48 } )"
      ),
      38.8
    );

    assert.equal(
      nucleoid.run("samples.find ( element => element == 38.8 )"),
      38.8
    );
    assert.equal(
      nucleoid.run("samples.find ( element => ( element == 38.8 ) )"),
      38.8
    );
  });

  it("supports JSON", function () {
    let payload = nucleoid.run('let payload = { "data" : "TEST" } ; payload');
    assert.equal(payload.data, "TEST");

    nucleoid.run('message = { "pid" : 1200 }');
    assert.equal(nucleoid.run("message.pid"), 1200);
  });

  it("assigns block in function as dependency", function () {
    nucleoid.run("class Student { }");
    nucleoid.run("student1 = new Student ( )");
    nucleoid.run("student1.age = 7");
    nucleoid.run("student2 = new Student ( )");
    nucleoid.run("student2.age = 8");
    nucleoid.run("student3 = new Student ( )");
    nucleoid.run("student3.age = 9");

    nucleoid.run("age = 8");
    nucleoid.run("student = Students.find ( s => s.age == age )");
    assert.equal(nucleoid.run("student"), nucleoid.run("student2"));

    nucleoid.run("age = 9");
    assert.equal(nucleoid.run("student"), nucleoid.run("student3"));
  });

  it("supports chained functions with parameter in expression", function () {
    nucleoid.run(
      "class Result { constructor ( score ) { this.score = score } }"
    );
    nucleoid.run("new Result ( 10 ) ; new Result ( 15 ) ; new Result ( 20 )");

    nucleoid.run("upperThreshold = 18");
    nucleoid.run("lowerThreshold = 12");
    nucleoid.run(
      "list = Results.filter ( r => r.score > lowerThreshold ) .filter ( r => r.score < upperThreshold )"
    );
    let list = nucleoid.run("list");
    assert.equal(list[0].score, 15);

    nucleoid.run("lowerThreshold = 7");
    list = nucleoid.run("list");
    assert.equal(list[0].score, 10);
    assert.equal(list[1].score, 15);

    nucleoid.run("upperThreshold = 14");
    list = nucleoid.run("list");
    assert.equal(list[0].score, 10);
  });

  it("supports nested functions as parameter in expression", function () {
    nucleoid.run("name = 'AbCDE'");
    nucleoid.run("pointer = 0");
    nucleoid.run(
      "if ( ! /[A-Z]/.test ( name.charAt ( pointer ) ) ) { throw 'INVALID_FIRST_CHARACTER' }"
    );

    assert.throws(function () {
      nucleoid.run("name = 'bbCDE'");
    }, "INVALID_FIRST_CHARACTER");

    nucleoid.run("name = 'CbCDE'");

    assert.throws(function () {
      nucleoid.run("pointer = 1");
    }, "INVALID_FIRST_CHARACTER");
  });

  it("supports property of chained functions in expression", function () {
    nucleoid.run("class User { }");
    nucleoid.run("class Registration { }");
    nucleoid.run("user1 = new User ( )");

    nucleoid.run("registration1 = new Registration ( )");
    nucleoid.run("registration1.user = user1");

    nucleoid.run("registration2 = new Registration ( )");
    nucleoid.run("registration2.user = user1");

    assert.throws(function () {
      nucleoid.run(
        "if ( Registrations.filter ( r => r.user == User ) .length > 1 ) { throw 'USER_ALREADY_REGISTERED' }"
      );
    }, "USER_ALREADY_REGISTERED");
  });

  it("supports array with brackets", function () {
    nucleoid.run("states = [ 'NY' , 'GA' , 'CT' , 'MI' ]");
    assert.equal(nucleoid.run("states [ 2 ]"), "CT");
  });

  it("retrieves value by variable", function () {
    nucleoid.run("number = -1");
    assert.equal(nucleoid.run("number"), -1);
  });

  it("rejects variable if not declared", function () {
    assert.throws(
      function () {
        nucleoid.run("e == 2.71828");
      },
      (error) => validate(error, ReferenceError, "e is not defined")
    );
  });

  it("runs multiple statements in the state", function () {
    nucleoid.run("k = 1 ; l = k + 1 ; k = 2");
    assert.equal(nucleoid.run("l == 3"), true);
  });

  it("runs dependent statements in the same transaction", function () {
    nucleoid.run("class Vehicle { } ; Vehicle.tag = 'US-' + Vehicle.plate ");
    nucleoid.run("vehicle1 = new Vehicle ( )");
    nucleoid.run("vehicle1.plate = 'XSJ422'");
    assert.equal(nucleoid.run("vehicle1.tag"), "US-XSJ422");
  });

  it("runs dependencies in order as received", function () {
    nucleoid.run("any = 0");
    nucleoid.run("if ( any > 1 ) { result = 1 }");
    nucleoid.run("if ( any > 2 ) { result = 2 }");
    nucleoid.run("if ( any > 3 ) { result = 3 }");
    nucleoid.run("if ( any > 2 ) { result = 4 }");
    nucleoid.run("if ( any > 1 ) { result = 5 }");

    nucleoid.run("any = 4");
    assert.equal(nucleoid.run("result"), 5);
  });

  it("runs let at root scope", function () {
    nucleoid.run("number = 13");
    assert.equal(nucleoid.run("let i = number + 4; i;"), 17);
    nucleoid.run("number = 14");
    assert.throws(
      function () {
        nucleoid.run("i");
      },
      (error) => validate(error, ReferenceError, "i is not defined")
    );
  });

  it("searches variable in scope before state", function () {
    nucleoid.run("e = 2.71828");
    nucleoid.run("{ let e = 3 ; number = e }");
    assert.equal(nucleoid.run("number"), 3);
  });

  it("uses local variable at lowest scope as priority", function () {
    nucleoid.run("pi = 3.14");
    nucleoid.run("number = pi");

    nucleoid.run("{ let pi = 3.141 ; { number = null ; { number = pi } } }");
    assert.equal(nucleoid.run("number"), 3.141);

    nucleoid.run(
      "{ let pi = 3.141 ; { let number = pi ; { let pi = 3.1415 ; number = pi } } }"
    );
    assert.equal(nucleoid.run("number"), 3.1415);

    nucleoid.run(
      "{ let pi = 3.141 ; number = pi ; { let pi = 3.1415 ; let number = pi ; { let pi = 3.14159 ; number = pi } } }"
    );
    assert.equal(nucleoid.run("number"), 3.14159);
  });

  it("creates let statement if its instance is defined", function () {
    nucleoid.run("class Ticket { }");
    assert.throws(
      function () {
        nucleoid.run(
          "{ let ticket = new Ticket ( ) ; ticket.event.group = 'ENTERTAINMENT' }"
        );
      },
      (error) => validate(error, ReferenceError, "ticket.event is not defined")
    );
  });

  it("declares let statement with undefined", function () {
    nucleoid.run("class Device { constructor ( code ) { this.code = code } }");
    nucleoid.run("device1 = new Device ( 'A0' )");
    nucleoid.run("device2 = new Device ( 'B1' )");

    assert.equal(
      nucleoid.run("device1"),
      nucleoid.run(
        "let device = Devices.find ( d => d.code == 'A0' ) ; if ( ! device ) { throw 'INVALID_DEVICE' } ; device"
      )
    );

    assert.throws(function () {
      nucleoid.run(
        "let device = Devices.find ( d => d.code == 'A1' ) ; if ( ! device ) { throw 'INVALID_DEVICE' } ; device"
      );
    }, "INVALID_DEVICE");
  });

  it("creates standard built-in object of let statement as property", function () {
    nucleoid.run("class Shipment { }");
    nucleoid.run(
      "{ let shipment = new Shipment ( ) ; shipment.date = new Date ( '2019-1-3' ) ; shipment1 = shipment }"
    );
    assert.equal(
      nucleoid.run("shipment1.date.toDateString ( )"),
      "Thu Jan 03 2019"
    );
  });

  it("assigns undefined if any dependencies in expression is undefined", function () {
    nucleoid.run("class Person { }");
    nucleoid.run("person1 = new Person ( )");
    nucleoid.run("person1.lastName = 'Brown'");
    nucleoid.run(
      "person1.fullName = person1.firstName + ' ' + person1.lastName"
    );
    assert.equal(nucleoid.run("person1.fullName") === undefined, true);
  });

  it("keeps as null if any dependencies as in local is null", function () {
    nucleoid.run("a = 1");
    nucleoid.run("{ let b = null ; c = b / a }");
    assert.equal(nucleoid.run("c"), 0);
  });

  it("keeps as null if any dependencies in expression is null", function () {
    nucleoid.run("class Schedule { }");
    nucleoid.run("schedule1 = new Schedule ( )");
    nucleoid.run("schedule1.expression = '0 */2 * * *'");
    nucleoid.run("schedule1.script = null");
    nucleoid.run(
      "schedule1.run = schedule1.expression + '\t' + schedule1.script"
    );
    assert.equal(nucleoid.run("schedule1.run"), "0 */2 * * *\tnull");
  });

  it("assigns null if there is null pointer in expression", function () {
    nucleoid.run("class Product { }");
    nucleoid.run("product1 = new Product ( )");
    nucleoid.run("score = product1.quality.score");
    assert.equal(nucleoid.run("score"), null);
  });

  it("places instance in the list of class when created", function () {
    nucleoid.run("class Student { }");
    assert.equal(nucleoid.run("Array.isArray ( Students )"), true);

    nucleoid.run("student1 = new Student ( )");
    assert.equal(nucleoid.run("Students.length"), 1);
  });

  it("assigns unique variable for instance without variable name defined", function () {
    nucleoid.run("class Vehicle { }");
    nucleoid.run("new Vehicle ( )");
    assert.equal(nucleoid.run("Vehicles.length"), 1);
  });

  it("throws error as a string", function () {
    nucleoid.run("k = 99");
    assert.throws(function () {
      nucleoid.run("if ( k >= 99 ) { throw 'INVALID' }");
    }, "INVALID");
  });

  it("throws error as a variable", function () {
    nucleoid.run("length = 0.1");
    assert.throws(
      function () {
        nucleoid.run("if ( length < 1 ) { throw length }");
      },
      (error) => error === 0.1
    );

    assert.throws(function () {
      nucleoid.run("if ( length < 1.1 ) { throw 'length' }");
    }, "length");
  });

  it("assigns function as dependency", function () {
    nucleoid.run("list = [ ]");
    nucleoid.run("count = list.filter ( n => n % 2 )");
    nucleoid.run("list.push ( 1 )");
    assert.equal(nucleoid.run("count.length"), 1);

    nucleoid.run("list.push ( 2 )");
    assert.equal(nucleoid.run("count.length"), 1);

    nucleoid.run("list.push ( 3 )");
    assert.equal(nucleoid.run("count.length"), 2);

    nucleoid.run("list.pop ( )");
    assert.equal(nucleoid.run("count.length"), 1);
  });

  it("assigns parameter in function as dependency", function () {
    nucleoid.run("str1 = 'ABC'");
    nucleoid.run("str2 = str1.toLowerCase ( ) + 'd'");
    nucleoid.run("str3 = str2.concat ( str1 )");
    assert.equal(nucleoid.run("str2"), "abcd");
    assert.equal(nucleoid.run("str3"), "abcdABC");

    nucleoid.run("str1 = 'AAA'");
    assert.equal(nucleoid.run("str2"), "aaad");
    assert.equal(nucleoid.run("str3"), "aaadAAA");
  });

  it("supports regular expression literal", function () {
    nucleoid.run("class User { }");
    nucleoid.run(
      "if ( ! /.{4,8}/.test ( User.password ) ) { throw 'INVALID_PASSWORD' }"
    );
    nucleoid.run("user1 = new User ( )");
    assert.throws(function () {
      nucleoid.run("user1.password = 'PAS'");
    }, "INVALID_PASSWORD");
  });

  it("rejects defining class declaration in non-class declaration block", function () {
    nucleoid.run("class Person { }");
    nucleoid.run("person1 = new Person ( )");
    nucleoid.run("person1.weight = 90");
    nucleoid.run("person1.height = 1.8");
    assert.throws(
      function () {
        nucleoid.run(
          "{ let weight = person1.weight ; let height = person1.height ; Person.bmi = weight / ( height * height ) }"
        );
      },
      (error) =>
        validate(
          error,
          SyntaxError,
          "Cannot define class declaration in non-class block"
        )
    );
  });

  it("detects circular dependency", function () {
    nucleoid.run("number1 = 10");
    nucleoid.run("number2 = number1 * 10");
    assert.throws(
      function () {
        nucleoid.run("number1 = number2 * 10");
      },
      (error) => validate(error, ReferenceError, "Circular Dependency")
    );
  });

  it.skip("creates function in state", function () {
    nucleoid.run("function generate ( number ) { return number * 10 }");
    nucleoid.run("random = 10");
    nucleoid.run("number = generate ( random )");
    assert.equal(nucleoid.run("number"), 100);

    nucleoid.run("random = 20");
    assert.equal(nucleoid.run("number"), 200);
  });

  it("sends message to other Nucleoid instance", function () {
    nucleoid.run(
      "class Task { constructor ( ) { message ( '7c6bca38', 'CHECK' ) } }"
    );

    let details1 = nucleoid.run("task1 = new Task ( )", details);
    assert.equal(details1.messages[0].process, "7c6bca38");
    assert.equal(details1.messages[0].payload, '"CHECK"');
  });

  it("rollbacks variable if exception is thrown", function () {
    nucleoid.run("a = 5");
    nucleoid.run("if ( a > 5 ) { throw 'INVALID_VALUE' }");

    assert.throws(function () {
      nucleoid.run("a = 6");
    }, "INVALID_VALUE");
    assert.equal(nucleoid.run("a"), 5);
  });

  it("rollbacks property if exception is thrown", function () {
    nucleoid.run("class Item { }");
    nucleoid.run("if ( Item.sku == 'A' ) { throw 'INVALID_SKU' }");
    nucleoid.run("item1 = new Item ( )");

    assert.throws(function () {
      nucleoid.run("item1.sku = 'A'");
    }, "INVALID_SKU");
    assert.equal(nucleoid.run("item1.sku"), undefined);
  });

  it("rollbacks instance if exception is thrown", function () {
    nucleoid.run(
      "class User { constructor ( first , last ) { this.first = first ; this.last = last } }"
    );
    nucleoid.run("if ( User.first.length < 3 ) { throw 'INVALID_USER' }");

    assert.throws(function () {
      nucleoid.run("user1 = new User ( 'F' , 'L' )");
    }, "INVALID_USER");
    assert.throws(
      function () {
        nucleoid.run("user1");
      },
      (error) => validate(error, ReferenceError, "user1 is not defined")
    );
  });

  it("creates variable assignment", function () {
    nucleoid.run("x = 1");
    nucleoid.run("y = x + 2");
    nucleoid.run("x = 2");
    assert.equal(nucleoid.run("y == 4"), true);
  });

  it("return assigned value while variable assignment", function () {
    const result = nucleoid.run("x = 1");
    assert.equal(result, 1);
  });

  it("updates variable assignment", function () {
    nucleoid.run("a = 1");
    nucleoid.run("b = 2");
    nucleoid.run("c = a + 3");
    nucleoid.run("c = b + 3");
    assert.equal(nucleoid.run("c"), 5);

    nucleoid.run("b = 4");
    assert.equal(nucleoid.run("c"), 7);
  });

  it("uses its value when self variable used", function () {
    nucleoid.run("radius = 10");
    nucleoid.run("radius = radius + 10");
    assert.equal(nucleoid.run("radius"), 20);
  });

  it("deletes variable assignment", function () {
    nucleoid.run("t = 1");
    nucleoid.run("q = t + 1");
    nucleoid.run("delete q");
    nucleoid.run("t = 2");
    assert.throws(
      function () {
        nucleoid.run("q");
      },
      (error) => validate(error, ReferenceError, "q is not defined")
    );
  });

  it("uses value property to indicate using only value of variable", function () {
    nucleoid.run("goldenRatio = 1.618");
    nucleoid.run("altitude = 10");

    nucleoid.run("width = goldenRatio.value * altitude");
    assert.equal(nucleoid.run("width"), 16.18);

    nucleoid.run("goldenRatio = 1.62");
    assert.equal(nucleoid.run("width"), 16.18);

    nucleoid.run("altitude = 100");
    assert.equal(nucleoid.run("width"), 161.8);
  });

  it("creates if statement of variable", function () {
    nucleoid.run("m = false");
    nucleoid.run("n = false");
    nucleoid.run("if ( m == true ) { n = m && true }");
    assert.equal(nucleoid.run("n == false"), true);

    nucleoid.run("m = true");
    assert.equal(nucleoid.run("n == true"), true);
  });

  it("updates if block of variable", function () {
    nucleoid.run("p = 0.01");
    nucleoid.run("s = 0.02");
    nucleoid.run("if ( p < 1 ) { r = p * 10 }");
    nucleoid.run("if ( p < 1 ) { r = s * 10 }");
    assert.equal(nucleoid.run("r"), 0.2);

    nucleoid.run("s = 0.03");
    assert.equal(nucleoid.run("r"), 0.3);
  });

  it("creates else statement of variable", function () {
    nucleoid.run("compound = 0.0001");
    nucleoid.run("acidic = 'ACIDIC'");
    nucleoid.run("basic = 'BASIC'");
    nucleoid.run(
      "if ( compound > 0.0000001 ) { pH = acidic } else { pH = basic }"
    );
    nucleoid.run("compound = 0.000000001");
    assert.equal(nucleoid.run("pH"), "BASIC");

    nucleoid.run("basic = '+7'");
    assert.equal(nucleoid.run("pH"), "+7");
  });

  it("creates else if statement of variable", function () {
    nucleoid.run("g = 11");
    nucleoid.run("earth = 9.8");
    nucleoid.run("mars = 3.71");
    nucleoid.run("mass = 10");
    nucleoid.run(
      "if ( g > 9 ) { weight = earth * mass } else if ( g > 3 ) { weight = mars * mass }"
    );
    nucleoid.run("g = 5");
    assert.equal(nucleoid.run("weight"), 37.1);

    nucleoid.run("mars = 3.72");
    assert.equal(nucleoid.run("weight"), 37.2);
  });

  it("creates multiple else if statement of variable", function () {
    nucleoid.run("fraction = -0.1");
    nucleoid.run("point = 1");
    nucleoid.run(
      "if ( fraction > 1 ) { score = fraction * point * 3 } else if ( fraction > 0 ) { score = fraction * point * 2 } else { score = fraction * point }"
    );
    assert.equal(nucleoid.run("score"), -0.1);

    nucleoid.run("point = 2");
    assert.equal(nucleoid.run("score"), -0.2);
  });

  it("runs let statement as a variable", function () {
    nucleoid.run("integer = 30");
    nucleoid.run(
      "{ let division = integer / 10 ; equivalency = division * 10}"
    );
    assert.equal(nucleoid.run("equivalency"), 30);

    nucleoid.run("integer = 40");
    assert.equal(nucleoid.run("equivalency"), 40);
  });

  it("runs let statement as standard built-in object", function () {
    nucleoid.run("{ let f = new Boolean ( false ) ; condition = f }");
    assert.equal(nucleoid.run("condition"), false);
  });

  it("creates and assigns instance to let variable inside block", function () {
    nucleoid.run("class Device { }");
    nucleoid.run("Device.renew = Device.created + 604800000");

    nucleoid.run(
      "{ let device = new Device ( ) ; device.created = Date.now ( ) }"
    );

    let id = nucleoid.run("Devices[0].id");
    assert.equal(nucleoid.run(`${id}.renew - ${id}.created`), 604800000);
  });

  it("creates and assigns instance with constructor to let variable inside block", function () {
    nucleoid.run(
      "class Member { constructor ( first , last ) { this.first = first ; this.last = last } } "
    );
    nucleoid.run("Member.display = Member.last + ', ' + Member.first");
    nucleoid.run("{ let member = new Member ( 'First', 'Last' ) }");
    assert.equal(nucleoid.run("Members[0].display"), "Last, First");
  });

  it("runs new instance of let statement of property", function () {
    nucleoid.run("class Room { }");
    nucleoid.run("class Meeting { }");
    nucleoid.run("room1 = new Room ( )");
    nucleoid.run(
      "Meeting.time = Date.now ( ) + ' @ ' + Meeting.date.toDateString()"
    );
    nucleoid.run(
      "{ let meeting = new Meeting ( ) ; meeting.date = new Date ( '2020-1-1' ) ; room1.meeting = meeting }"
    );
    assert.equal(
      nucleoid.run("room1.meeting.date.toDateString()"),
      "Wed Jan 01 2020"
    );
    assert.equal(
      nucleoid.run("room1.meeting.time").substr(-17),
      "@ Wed Jan 01 2020"
    );
  });

  it("runs multiple instance of let statement of property", function () {
    nucleoid.run("class Timesheet { }");
    nucleoid.run("class Task { }");
    nucleoid.run("class Project { }");
    nucleoid.run("Project.code = 'N-' + Project.number");
    nucleoid.run("timesheet1 = new Timesheet ( )");
    nucleoid.run(
      "{ let task = new Task ( ) ; task.project = new Project ( ) ; task.project.number = 3668347 ; timesheet1.task = task }"
    );
    assert.equal(nucleoid.run("timesheet1.task.project.number"), 3668347);
    assert.equal(nucleoid.run("timesheet1.task.project.code"), "N-3668347");
  });

  it("creates new object of let statement of class as value before initialization", function () {
    nucleoid.run("class Member { }");
    nucleoid.run(
      "{ let registration = new Object ( ) ; registration.date = new Date ( '2019-1-2' ) ; Member.registration = registration }"
    );

    nucleoid.run("member1 = new Member ( )");
    assert.equal(
      nucleoid.run("member1.registration.date.toDateString()"),
      "Wed Jan 02 2019"
    );
    assert.equal(nucleoid.run("member1.registration.age"), undefined);
  });

  it("creates new object of let statement of class as value after initialization", function () {
    nucleoid.run("class Distance { }");
    nucleoid.run("distance1 = new Distance ( )");
    nucleoid.run(
      "{ let location = new Object ( ) ; location.coordinates = '40.6976701,-74.2598779' ; Distance.startingPoint = location }"
    );
    assert.equal(
      nucleoid.run("distance1.startingPoint.coordinates"),
      "40.6976701,-74.2598779"
    );
    assert.equal(nucleoid.run("distance1.startingPoint.print"), undefined);
  });

  it("creates multiple object of let statement of class as value before initialization", function () {
    nucleoid.run("class Account { }");
    nucleoid.run("class Balance { }");
    nucleoid.run("class Currency { }");
    nucleoid.run("Currency.description = 'Code:' + Currency.code");
    nucleoid.run(
      "{ let balance = new Object ( ) ; balance.currency = new Object ( ) ; balance.currency.code = 'USD' ; Account.balance = balance }"
    );
    nucleoid.run("account1 = new Account ( )");
    assert.equal(nucleoid.run("account1.balance.currency.code "), "USD");
    assert.equal(
      nucleoid.run("account1.balance.currency.description "),
      undefined
    );
  });

  it("creates multiple object of let statement of class as value after initialization", function () {
    nucleoid.run("class Warehouse { }");
    nucleoid.run("warehouse1 = new Warehouse ( )");
    nucleoid.run(
      "{ let inventory = new Object ( ) ; inventory.item = new Object ( ) ; inventory.item.sku = '699546085767' ; Warehouse.inventory = inventory }"
    );
    assert.equal(nucleoid.run("warehouse1.inventory.item.sku"), "699546085767");
    assert.equal(
      nucleoid.run("warehouse1.inventory.item.description"),
      undefined
    );
  });

  it("creates instance inside block", function () {
    nucleoid.run("class Device { constructor ( name ) { this.name = name } }");
    nucleoid.run("Device.deleted = false");
    nucleoid.run("Device.key = 'X-' + Device.name");
    nucleoid.run("{ let name = 'Hall' ; device1 = new Device ( name ) }");

    assert.equal(nucleoid.run("device1.name"), "Hall");
    assert.equal(nucleoid.run("device1.key"), "X-Hall");
    assert.equal(nucleoid.run("device1.deleted"), false);
  });

  it("creates instance inside block without variable name defined", function () {
    nucleoid.run("class Summary { constructor ( rate ) { this.rate = rate } }");
    nucleoid.run("Summary.score = Summary.rate * 100");
    nucleoid.run("{ let rate = 4 ; new Summary ( rate ) }");

    assert.equal(nucleoid.run("Summarys[0].rate"), 4);
    assert.equal(nucleoid.run("Summarys[0].score"), 400);
  });

  it("creates variable inside block", function () {
    nucleoid.run("a = 5 ; b = 10");
    nucleoid.run("if ( a > 9 ) { let c = a + b ; d = c * 10 }");
    nucleoid.run("a = 10");
    assert.equal(nucleoid.run("d"), 200);

    nucleoid.run("a = 15");
    assert.equal(nucleoid.run("d"), 250);

    nucleoid.run("b = 20");
    assert.equal(nucleoid.run("d"), 350);
  });

  it("runs let statement as an object before declaration", function () {
    nucleoid.run("class Plane { }");
    nucleoid.run("class Trip { }");
    nucleoid.run("plane1 = new Plane ( )");
    nucleoid.run("plane1.speed = 903");
    nucleoid.run("trip1 = new Trip ( )");
    nucleoid.run("trip1.distance = 5540");
    nucleoid.run(
      "{ let trip = Plane.trip ; Plane.time = trip.distance / Plane.speed }"
    );
    nucleoid.run("plane1.trip = trip1");
    assert.equal(nucleoid.run("plane1.time"), 6.135105204872647);
  });

  it("runs let statement as an object after declaration", function () {
    nucleoid.run("class Seller { }");
    nucleoid.run("class Commission { }");
    nucleoid.run("seller1 = new Seller ( )");
    nucleoid.run("seller1.sales = 1000000");
    nucleoid.run("comm1 = new Commission ( )");
    nucleoid.run("comm1.rate = 0.05");
    nucleoid.run("seller1.commission = comm1");
    nucleoid.run(
      "{ let commission = Seller.commission ; Seller.pay = Seller.sales * commission.rate }"
    );
    assert.equal(nucleoid.run("seller1.pay"), 50000);
  });

  it("reassigns let statement before initialization", function () {
    nucleoid.run("class Order { }");
    nucleoid.run("class Sale { }");
    nucleoid.run(
      "{ let sale = Order.sale ; sale.amount = sale.percentage / Order.amount * 100 }"
    );
    nucleoid.run("order1 = new Order ( )");
    nucleoid.run("order1.amount = 100");
    nucleoid.run("sale1 = new Sale ( )");
    nucleoid.run("sale1.percentage = 10");
    nucleoid.run("order1.sale = sale1");
    assert.equal(nucleoid.run("sale1.amount"), 10);
  });

  it("reassigns let statement after initialization", function () {
    nucleoid.run("class Stock { }");
    nucleoid.run("class Trade { }");
    nucleoid.run("stock1 = new Stock ( )");
    nucleoid.run("stock1.price = 100");
    nucleoid.run("trade1 = new Trade ( )");
    nucleoid.run("trade1.quantity = 1");
    nucleoid.run("stock1.trade = trade1");
    nucleoid.run(
      "{ let trade = Stock.trade ; trade.worth = Stock.price * trade.quantity }"
    );
    assert.equal(nucleoid.run("trade1.worth"), 100);
  });

  it("holds result of function in let", function () {
    nucleoid.run("bugs = [ ]");
    nucleoid.run("ticket = 1");
    nucleoid.run("class Bug { }");
    nucleoid.run("bug1 = new Bug ( )");
    nucleoid.run("bug1.ticket = 1");
    nucleoid.run("bug1.priority = 'LOW'");
    nucleoid.run("bugs.push ( bug1 )");
    nucleoid.run("bug2 = new Bug ( )");
    nucleoid.run("bug2.ticket = 2");
    nucleoid.run("bug2.priority = 'MEDIUM'");
    nucleoid.run("bugs.push ( bug2 )");
    nucleoid.run(
      "{ let bug = bugs.find ( it => it.ticket == ticket ) ; bug.selected = true }"
    );
    assert.equal(nucleoid.run("bug1.selected"), true);
    assert.equal(nucleoid.run("bug2.selected"), undefined);

    nucleoid.run("ticket = 2");
    assert.equal(nucleoid.run("bug2.selected"), true);
  });

  it("skips if block is empty", function () {
    nucleoid.run("{ }");
  });

  it("runs block statement of variable", function () {
    nucleoid.run("h = 1");
    nucleoid.run("{ let value = h * 2 ; j = value * 2 }");
    assert.equal(nucleoid.run("j"), 4);

    nucleoid.run("h = 2");
    assert.equal(nucleoid.run("j"), 8);
  });

  it("runs nested block statement of variable", function () {
    nucleoid.run("radius = 10");
    nucleoid.run(
      "{ let area = Math.pow ( radius , 2 ) * 3.14 ; { volume = area * 5 } }"
    );
    assert.equal(nucleoid.run("volume"), 1570);
  });

  it("runs nested if statement of variable", function () {
    nucleoid.run("gravity = 9.8");
    nucleoid.run("time = 10");
    nucleoid.run("distance = 480");
    nucleoid.run("target = true");
    nucleoid.run(
      "{ let dist = 1 / 2 * gravity * time * time ; if ( dist > distance ) { hit = target } }"
    );
    assert.equal(nucleoid.run("hit"), true);

    nucleoid.run("target = false");
    assert.equal(nucleoid.run("hit"), false);
  });

  it("runs nested else statement of variable", function () {
    nucleoid.run("percentage = 28");
    nucleoid.run("density = 0.899");
    nucleoid.run("substance = 'NH3'");
    nucleoid.run("molarConcentration = null");
    nucleoid.run("default = 0");
    nucleoid.run(
      "{ let concentration = percentage * density / 100 * 1000 ; if ( substance == 'NH3' ) { molarConcentration = concentration / 17.04 } else { molarConcentration = default } }"
    );
    nucleoid.run("substance = 'NH16'");
    nucleoid.run("default = 1");
    assert.equal(nucleoid.run("molarConcentration"), 1);
  });

  it("assigns variable to reference", function () {
    nucleoid.run("a = 1");
    nucleoid.run("b = a");
    assert.equal(nucleoid.run("b"), 1);

    nucleoid.run("a = 2");
    assert.equal(nucleoid.run("b"), 2);
  });

  it("assigns object to variable", function () {
    nucleoid.run("class Model { }");
    nucleoid.run("model1 = new Model ( )");
    assert.equal(nucleoid.run("typeof model1"), "object");
  });

  it("defines class in the state", function () {
    nucleoid.run("class Entity { }");
    assert.equal(nucleoid.run("typeof Entity"), "function");
  });

  it("rejects creating instance if the class does not exist", function () {
    assert.throws(
      function () {
        nucleoid.run("chart1 = new Chart ( )");
      },
      (error) => validate(error, ReferenceError, "Chart is not defined")
    );

    nucleoid.run("class Chart { }");
    nucleoid.run("chart1 = new Chart ( )");
    assert.throws(
      function () {
        nucleoid.run("chart1.plot = new Plot ( )");
      },
      (error) => validate(error, ReferenceError, "Plot is not defined")
    );

    assert.throws(
      function () {
        nucleoid.run("Chart.plot = new Plot ( )");
      },
      (error) => validate(error, ReferenceError, "Plot is not defined")
    );
  });

  it("creates property assignment before declaration", function () {
    nucleoid.run("class Order { }");
    nucleoid.run("var order1 = new Order ( )");
    nucleoid.run("order1.upc = '04061' + order1.barcode");
    nucleoid.run("order1.barcode = '94067'");
    assert.equal(nucleoid.run("order1.upc"), "0406194067");
  });

  it("creates property assignment after declaration", function () {
    nucleoid.run("class User { }");
    nucleoid.run("user = new User ( )");
    nucleoid.run("user.name = 'sample'");
    nucleoid.run("user.email = user.name + '@example.com'");
    assert.equal(nucleoid.run("user.email"), "sample@example.com");

    nucleoid.run("user.name = 'samplex'");
    assert.equal(nucleoid.run("user.email"), "samplex@example.com");
  });

  it("creates property assignment only if instance is defined", function () {
    nucleoid.run("class Channel { }");
    nucleoid.run("channel1 = new Channel ( )");
    assert.throws(
      function () {
        nucleoid.run("channel1.frequency.type = 'ANGULAR'");
      },
      (error) =>
        validate(error, ReferenceError, "channel1.frequency is not defined")
    );
  });

  it("creates object assignment as property only if instance is defined", function () {
    nucleoid.run("class Worker { }");
    nucleoid.run("class Schedule { }");
    nucleoid.run("worker1 = new Worker ( )");
    assert.throws(
      function () {
        nucleoid.run("worker1.duty.schedule = new Schedule ( )");
      },

      (error) => validate(error, ReferenceError, "worker1.duty is not defined")
    );
  });

  it("uses its value when self property used", function () {
    nucleoid.run("class Construction { }");
    nucleoid.run("construction1 = new Construction ( ) ");
    nucleoid.run("construction1.timeline = 120");
    nucleoid.run("construction1.timeline = 2 * construction1.timeline");
    assert.equal(nucleoid.run("construction1.timeline"), 240);
  });

  it("assigns object to property before initialization", function () {
    nucleoid.run("class Agent { }");
    nucleoid.run("class Distance { }");
    nucleoid.run(
      "Distance.total = Math.sqrt ( Distance.x * Distance.x + Distance.y * Distance.y )"
    );
    nucleoid.run("agent1 = new Agent ( )");
    nucleoid.run("agent1.distance = new Distance ( )");
    nucleoid.run("agent1.distance.x = 3");
    nucleoid.run("agent1.distance.y = 4");
    assert.equal(nucleoid.run("agent1.distance.total"), 5);
  });

  it("assigns object to property after initialization", function () {
    nucleoid.run("class Product { }");
    nucleoid.run("product1 = new Product ( )");
    nucleoid.run("class Quality { }");
    nucleoid.run("product1.quality = new Quality ( )");
    nucleoid.run("product1.quality.score = 15");
    nucleoid.run(
      "Quality.class = String.fromCharCode ( 65 + Math.floor ( Quality.score / 10 ) )"
    );
    assert.equal(nucleoid.run("product1.quality.class"), "B");
  });

  it("rejects if name of instance as property is value", function () {
    nucleoid.run("class Schedule { }");
    nucleoid.run("class Place { }");
    nucleoid.run("value = new Schedule ( )");
    assert.throws(
      function () {
        nucleoid.run("value.value = new Place ( )");
      },
      (error) => validate(error, TypeError, "Cannot use 'value' as a property")
    );
  });

  it("rejects if property name is value", function () {
    nucleoid.run("class Value { }");
    nucleoid.run("value = new Value ( )");
    assert.throws(
      function () {
        nucleoid.run("value.value = 2147483647");
      },
      (error) => validate(error, TypeError, "Cannot use 'value' as a name")
    );
  });

  it("uses value property to indicate using only value of property", function () {
    nucleoid.run("class Weight { }");
    nucleoid.run("weight1 = new Weight ( )");
    nucleoid.run("weight1.gravity = 1.352");
    nucleoid.run("weight1.mass = 1000");
    nucleoid.run("weight1.force = weight1.gravity * weight1.mass.value");
    assert.equal(nucleoid.run("weight1.force"), 1352);

    nucleoid.run("weight1.mass = 2000");
    assert.equal(nucleoid.run("weight1.force"), 1352);
  });

  it("uses value property in if condition to indicate using only value of variable", function () {
    nucleoid.run("class Question { }");
    nucleoid.run("question1 = new Question ( )");
    nucleoid.run("question1.text = 'How was the service?'");
    nucleoid.run(
      "if ( question1.text != question1.text.value ) { throw 'QUESTION_ARCHIVED' }"
    );
    assert.throws(function () {
      nucleoid.run("question1.text = 'How would you rate us?'");
    }, "QUESTION_ARCHIVED");
  });

  it("rejects value of property if property is not defined", function () {
    nucleoid.run("class Travel { }");
    nucleoid.run("travel1 = new Travel ( )");
    nucleoid.run("travel1.speed = 65");
    assert.throws(
      function () {
        nucleoid.run("travel1.time = travel1.distance.value / travel1.speed");
      },
      (error) =>
        validate(error, ReferenceError, "travel1.distance is not defined")
    );
  });

  it("keeps as null if value of property is null", function () {
    nucleoid.run("class Interest { }");
    nucleoid.run("interest1 = new Interest ( )");
    nucleoid.run("interest1.rate = 3");
    nucleoid.run("interest1.amount = null");
    nucleoid.run(
      "interest1.annual = interest1.rate * interest1.amount.value / 100"
    );
    assert.equal(nucleoid.run("interest1.annual"), 0);

    nucleoid.run("interest1.amount = 10000");
    assert.equal(nucleoid.run("interest1.annual"), 0);
  });

  it("rejects if property of local name is value", function () {
    nucleoid.run("class Alarm { }");
    assert.throws(
      function () {
        nucleoid.run("{ let value = new Alarm ( ) ; value.value = '22:00' }");
      },
      (error) => validate(error, TypeError, "Cannot use 'value' in local")
    );
  });

  it("keeps same as its value when value property used for local", function () {
    nucleoid.run("speedOfLight = 299792");
    nucleoid.run(
      "{ let time = speedOfLight / 225623 ; roundTrip = time.value * 2 }"
    );
    assert.equal(nucleoid.run("roundTrip"), 2.6574595675086314);
  });

  it("uses value property as part of class declaration", function () {
    nucleoid.run("count = 0");
    nucleoid.run("class Device { }");
    nucleoid.run("device1 = new Device ( )");
    nucleoid.run("{ Device.code = 'A' + count.value ; count = count + 1 }");
    assert.equal(nucleoid.run("device1.code"), "A0");
  });

  it("uses value property of class declaration", function () {
    nucleoid.run(
      "class Summary { constructor ( question ) { this.question = question } }"
    );
    nucleoid.run("class Question { }");
    nucleoid.run("Summary.count = Summary.question.count.value");
    nucleoid.run("question1 = new Question ( )");
    nucleoid.run("question1.count = 10");
    nucleoid.run("summary1 = new Summary ( question1 )");
    assert.equal(nucleoid.run("summary1.count"), 10);

    nucleoid.run("question1.count = 11");
    assert.equal(nucleoid.run("summary1.count"), 10);
  });

  it("updates if block of property", function () {
    nucleoid.run("class Account { }");
    nucleoid.run("account = new Account ( )");
    nucleoid.run("account.balance = 1000");
    nucleoid.run("if ( account.balance < 1500 ) { account.status = 'OK' }");
    assert.equal(nucleoid.run("account.status"), "OK");

    nucleoid.run("if ( account.balance < 1500 ) { account.status = 'LOW' }");
    assert.equal(nucleoid.run("account.status"), "LOW");
  });

  it("creates if statement of property", function () {
    nucleoid.run("class Toy { }");
    nucleoid.run("toy = new Toy ( )");
    nucleoid.run("toy.color = 'BLUE'");
    nucleoid.run("if ( toy.color == 'RED' ) { toy.shape = 'CIRCLE' }");
    nucleoid.run("toy.color = 'RED'");
    assert.equal(nucleoid.run("toy.shape"), "CIRCLE");
  });

  it("creates else statement of property", function () {
    nucleoid.run("class Engine { }");
    nucleoid.run("engine1 = new Engine ( )");
    nucleoid.run("engine1.type = 'V8'");
    nucleoid.run("mpl = 'MPL'");
    nucleoid.run("bsd = 'BSD'");
    nucleoid.run(
      "if ( engine1.type == 'Gecko' ) { engine1.license = mpl } else { engine1.license = bsd }"
    );
    assert.equal(nucleoid.run("engine1.license"), "BSD");

    nucleoid.run("bsd = 'Berkeley Software Distribution'");
    assert.equal(
      nucleoid.run("engine1.license"),
      "Berkeley Software Distribution"
    );
  });

  it("creates else if statement of property", function () {
    nucleoid.run("class Contact { }");
    nucleoid.run("contact1 = new Contact ( )");
    nucleoid.run("contact1.type = 'PERSON'");
    nucleoid.run("contact1.first = 'First'");
    nucleoid.run("contact1.last = 'Last'");
    nucleoid.run(
      "if ( contact1.type == 'BUSINESS' ) { contact1.full = 'B' + contact1.first } else { contact1.full = contact1.first + ' ' + contact1.last }"
    );
    assert.equal(nucleoid.run("contact1.full"), "First Last");

    nucleoid.run("contact1.first = 'F' ; contact1.last = 'L'");
    assert.equal(nucleoid.run("contact1.full"), "F L");
  });

  it("creates multiple else if statement of property", function () {
    nucleoid.run("class Taxpayer { }");
    nucleoid.run("taxpayer1 = new Taxpayer ( )");
    nucleoid.run("taxpayer1.income = 60000");
    nucleoid.run("taxpayer1.member = 1");
    nucleoid.run("rate = 22");
    nucleoid.run(
      "if ( taxpayer1.member > 4 ) { taxpayer1.tax = taxpayer1.income * rate / 100 - 2000 } else if ( taxpayer1.member > 2 ) { taxpayer1.tax = taxpayer1.income * rate / 100 - 1000 } else { taxpayer1.tax = taxpayer1.income * rate / 100 }"
    );
    assert.equal(nucleoid.run("taxpayer1.tax"), 13200);

    nucleoid.run("rate = 23");
    assert.equal(nucleoid.run("taxpayer1.tax"), 13800);
  });

  it("updates property assignment", function () {
    nucleoid.run("class Matter { }");
    nucleoid.run("matter1 = new Matter ( )");
    nucleoid.run("matter1.mass = 10");
    nucleoid.run("matter1.weight = matter1.mass * 9.8");
    assert.equal(nucleoid.run("matter1.weight"), 98);

    nucleoid.run("matter1.weight = matter1.mass * 3.7");
    assert.equal(nucleoid.run("matter1.weight"), 37);

    nucleoid.run("matter1.mass = 20");
    assert.equal(nucleoid.run("matter1.weight"), 74);
  });

  it("deletes instance", function () {
    nucleoid.run("class Circle { }");
    nucleoid.run("circle1 = new Circle ( )");
    nucleoid.run("delete circle1");
    assert.throws(
      function () {
        nucleoid.run("circle1");
      },
      (error) => validate(error, ReferenceError, "circle1 is not defined")
    );
  });

  it("rejects deleting instance if it has any properties", function () {
    nucleoid.run("class Channel { }");
    nucleoid.run("channel1 = new Channel ( )");
    nucleoid.run("channel1.frequency = 440");
    assert.throws(
      function () {
        nucleoid.run("delete channel1");
      },
      (error) =>
        validate(error, ReferenceError, "Cannot delete object 'channel1'")
    );
    assert.equal(nucleoid.run("channel1.frequency "), 440);

    nucleoid.run("delete channel1.frequency");
    nucleoid.run("delete channel1");
  });

  it("rejects deleting instance if it has object as a property", function () {
    nucleoid.run("class Shape { }");
    nucleoid.run("class Type { }");
    nucleoid.run("shape1 = new Shape ( )");
    nucleoid.run("shape1.type = new Type ( )");
    assert.throws(
      function () {
        nucleoid.run("delete shape1");
      },
      (error) =>
        validate(error, ReferenceError, "Cannot delete object 'shape1'")
    );

    nucleoid.run("delete shape1.type");
    nucleoid.run("delete shape1");
  });

  it("deletes property assignment", function () {
    nucleoid.run("class Agent { }");
    nucleoid.run("agent = new Agent ( )");
    nucleoid.run("agent.time = 52926163455");
    nucleoid.run("agent.location = 'CITY'");
    nucleoid.run("agent.report = agent.time + '@' + agent.location");
    assert.equal(nucleoid.run("agent.report"), "52926163455@CITY");

    nucleoid.run("delete agent.time");
    assert.equal(nucleoid.run("agent.report"), undefined);

    nucleoid.run("delete agent.report");
    assert.equal(nucleoid.run("agent.report"), undefined);
  });

  it("runs block statement of property", function () {
    nucleoid.run("class Item { }");
    nucleoid.run("item1 = new Item ( )");
    nucleoid.run("item1.sku = '0000001' ");
    nucleoid.run("{ let custom = 'US' + item1.sku ; item1.custom = custom }");
    assert.equal(nucleoid.run("item1.custom"), "US0000001");

    nucleoid.run("item1.sku = '0000002' ");
    assert.equal(nucleoid.run("item1.custom"), "US0000002");
  });

  it("runs nested block statement of property", function () {
    nucleoid.run("class Figure { }");
    nucleoid.run("figure1 = new Figure ( )");
    nucleoid.run("figure1.width = 9");
    nucleoid.run("figure1.height = 10");
    nucleoid.run(
      "{ let base = Math.pow ( figure1.width , 2 ) ; { figure1.volume = base * figure1.height } }"
    );
    assert.equal(nucleoid.run("figure1.volume"), 810);

    nucleoid.run("figure1.height = 9");
    assert.equal(nucleoid.run("figure1.volume"), 729);
  });

  it("runs nested if statement of property", function () {
    nucleoid.run("class Sale { }");
    nucleoid.run("sale1 = new Sale ( )");
    nucleoid.run("sale1.price = 50");
    nucleoid.run("sale1.quantity = 2");
    nucleoid.run(
      "{ let amount = sale1.price * sale1.quantity ; if ( amount > 100 ) { sale1.tax = amount * 10 / 100 } }"
    );
    assert.equal(nucleoid.run("sale1.tax"), undefined);

    nucleoid.run("sale1.quantity = 3");
    assert.equal(nucleoid.run("sale1.tax"), 15);
  });

  it("creates nested else statement of property", function () {
    nucleoid.run("class Chart { }");
    nucleoid.run("chart1 = new Chart ( )");
    nucleoid.run("chart1.percentage = 1");
    nucleoid.run("invalid = 'INVALID'");
    nucleoid.run("valid = 'VALID'");
    nucleoid.run(
      "{ let ratio = chart1.percentage / 100 ; if ( ratio > 1 ) { chart1.status = invalid } else { chart1.status = valid } }"
    );
    assert.equal(nucleoid.run("chart1.status"), "VALID");

    nucleoid.run("valid = 'V'");
    assert.equal(nucleoid.run("chart1.status"), "V");
  });

  it("creates property assignment with multiple properties", function () {
    nucleoid.run("class Person { }");
    nucleoid.run("person1 = new Person ( )");
    nucleoid.run("class Address { }");
    nucleoid.run("address1 = new Address ( )");
    nucleoid.run("Address.print = Address.city + ', ' + Address.state");
    nucleoid.run("person1.address = new Address ( )");
    nucleoid.run("person1.address.city = 'Syracuse'");
    nucleoid.run("person1.address.state = 'NY'");
    assert.equal(nucleoid.run("person1.address.print"), "Syracuse, NY");
  });

  it("creates property assignment as multiple properties as part of declaration", function () {
    nucleoid.run("class Server { }");
    nucleoid.run("server1 = new Server ( )");
    nucleoid.run("server1.name = 'HOST1'");
    nucleoid.run("class IP { }");
    nucleoid.run("ip1 = new IP ( )");
    nucleoid.run("server1.ip = ip1");
    nucleoid.run("ip1.address = '10.0.0.1'");
    nucleoid.run("server1.summary = server1.name + '@' + server1.ip.address");
    assert.equal(nucleoid.run("server1.summary"), "HOST1@10.0.0.1");

    nucleoid.run("ip1.address = '10.0.0.2'");
    assert.equal(nucleoid.run("server1.summary"), "HOST1@10.0.0.2");
  });

  it("creates dependency behalf if property has reference", function () {
    nucleoid.run("class Schedule { }");
    nucleoid.run("schedule1 = new Schedule ( )");

    nucleoid.run("class Template { }");
    nucleoid.run("template1 = new Template ( )");
    nucleoid.run("template1.type = 'W'");

    nucleoid.run("schedule1.template = template1");
    nucleoid.run("schedule1.template.name = schedule1.template.type + '-0001'");
    assert.equal(nucleoid.run("template1.name"), "W-0001");
    assert.equal(nucleoid.run("schedule1.template.name"), "W-0001");

    nucleoid.run("template1.type = 'D'");
    assert.equal(nucleoid.run("template1.name"), "D-0001");

    nucleoid.run("template1.shape = template1.type + '-Form'");
    assert.equal(nucleoid.run("template1.shape"), "D-Form");
    assert.equal(nucleoid.run("schedule1.template.shape"), "D-Form");

    nucleoid.run("template1.type = 'C'");
    assert.equal(nucleoid.run("template1.shape"), "C-Form");
    assert.equal(nucleoid.run("schedule1.template.shape"), "C-Form");
  });

  it("creates dependency behalf if let has reference", function () {
    nucleoid.run("class Vote { }");
    nucleoid.run("vote1 = new Vote ( )");
    nucleoid.run("vote1.rate = 4");
    nucleoid.run("class Question { }");
    nucleoid.run("Question.rate = 0");
    nucleoid.run("Question.count = 0");
    nucleoid.run("question1 = new Question ( )");
    nucleoid.run("vote1.question = question1");
    nucleoid.run(
      "{ let question = vote1.question ; question.rate = ( question.rate * question.count + vote1.rate ) / ( question.count + 1 ) ; question.count =  question.count + 1}"
    );
    assert.equal(nucleoid.run("question1.rate"), 4);
    assert.equal(nucleoid.run("question1.count"), 1);

    nucleoid.run("vote1.rate = 5");
    assert.equal(nucleoid.run("question1.rate"), 4.5);
  });

  it("runs expression statement of class", function () {
    nucleoid.run("class Element { }");
    nucleoid.run("alkalis = [ ]");
    nucleoid.run("element1 = new Element ( )");
    nucleoid.run("element1.number = 3");
    nucleoid.run(
      "{ let number = Element.number ; if ( number == 3 ) { alkalis.push ( Element ) } }"
    );
    assert.equal(nucleoid.run("alkalis.pop ( )"), nucleoid.run("element1"));
  });

  it("creates class assignment before initialization", function () {
    nucleoid.run("class Review { }");
    nucleoid.run("Review.rate = Review.sum / 10");
    nucleoid.run("review1 = new Review ( )");
    nucleoid.run("review1.sum = 42");
    assert.equal(nucleoid.run("review1.rate"), 4.2);
  });

  it("creates class assignment after initialization", function () {
    nucleoid.run("class Shape { }");
    nucleoid.run("s1 = new Shape ( )");
    nucleoid.run("s1.edge = 3");
    nucleoid.run("s2 = new Shape ( )");
    nucleoid.run("s2.edge = 3");
    nucleoid.run("Shape.angle = ( Shape.edge - 2 ) * 180");
    nucleoid.run("s1.edge = 4");
    assert.equal(nucleoid.run("s1.angle"), 360);
    assert.equal(nucleoid.run("s2.angle"), 180);
  });

  it("updates class assignment", function () {
    nucleoid.run("class Employee { }");
    nucleoid.run("employee = new Employee ( )");
    nucleoid.run("employee.id = 1");
    nucleoid.run("Employee.username = 'E' + Employee.id");
    assert.equal(nucleoid.run("employee.username"), "E1");
    nucleoid.run("Employee.username = 'F' + Employee.id");
    nucleoid.run("employee.id = 2");
    assert.equal(nucleoid.run("employee.username"), "F2");
  });

  it("creates if statement of class before initialization", function () {
    nucleoid.run("class Ticket { }");
    nucleoid.run(
      "if ( Ticket.date > new Date ( '1993-1-1' ) ) { Ticket.status = 'EXPIRED' }"
    );
    nucleoid.run("ticket1 = new Ticket ( )");

    assert.equal(nucleoid.run("ticket1.status"), undefined);
    nucleoid.run("ticket1.date = new Date ( '1993-2-1' ) ");
    assert.equal(nucleoid.run("ticket1.status"), "EXPIRED");

    nucleoid.run("ticket2 = new Ticket ( )");
    assert.equal(nucleoid.run("ticket2.status"), undefined);
  });

  it("creates if statement of class after initialization", function () {
    nucleoid.run("class Student { }");
    nucleoid.run("s1 = new Student ( )");
    nucleoid.run("s1.age = 2");
    nucleoid.run("s1.class = 'Daycare'");
    nucleoid.run("s2 = new Student ( )");
    nucleoid.run("s2.age = 2");
    nucleoid.run("s2.class = 'Daycare'");
    nucleoid.run("if ( Student.age == 3 ) { Student.class = 'Preschool' }");
    nucleoid.run("s1.age = 3");
    assert.equal(nucleoid.run("s1.class"), "Preschool");
    assert.equal(nucleoid.run("s2.class"), "Daycare");
  });

  it("updates if block of class", function () {
    nucleoid.run("class Inventory { }");
    nucleoid.run("i1 = new Inventory ( )");
    nucleoid.run("i1.quantity = 0");

    nucleoid.run("i2 = new Inventory ( )");
    nucleoid.run("i2.quantity = 1000");

    nucleoid.run(
      "if ( Inventory.quantity == 0 ) { Inventory.replenishment = true }"
    );
    assert.equal(nucleoid.run("i1.replenishment"), true);
    assert.equal(nucleoid.run("i2.replenishment"), undefined);
    nucleoid.run(
      "if ( Inventory.quantity == 0 ) { Inventory.replenishment = false }"
    );

    assert.equal(nucleoid.run("i1.replenishment"), false);
    assert.equal(nucleoid.run("i2.replenishment"), undefined);
  });

  it("creates else statement of class before initialization", function () {
    nucleoid.run("class Count { }");
    nucleoid.run(
      "if ( Count.max > 1000 ) { Count.reset = urgent } else { Count.reset = regular }"
    );
    nucleoid.run("urgent = 'URGENT'");
    nucleoid.run("regular = 'REGULAR'");
    nucleoid.run("count1 = new Count ( )");
    nucleoid.run("count1.max = 850");
    assert.equal(nucleoid.run("count1.reset"), "REGULAR");

    nucleoid.run("regular = 'R'");
    assert.equal(nucleoid.run("count1.reset"), "R");
  });

  it("creates else statement of class after initialization", function () {
    nucleoid.run("class Concentration { }");
    nucleoid.run("serialDilution = '(c1V1+c2V2)/(V1+V2)'");
    nucleoid.run("directDilution = 'c1/V1'");
    nucleoid.run("concentration1 = new Concentration ( )");
    nucleoid.run("concentration1.substances = 2");
    nucleoid.run(
      "if ( Concentration.substances == 1 ) { Concentration.formula = directDilution } else { Concentration.formula = serialDilution }"
    );
    assert.equal(nucleoid.run("concentration1.formula"), "(c1V1+c2V2)/(V1+V2)");

    nucleoid.run("serialDilution = '(c1V1+c2V2+c3V3)/(V1+V2+V3)'");
    assert.equal(
      nucleoid.run("concentration1.formula"),
      "(c1V1+c2V2+c3V3)/(V1+V2+V3)"
    );
  });

  it("creates else if statement of class before initialization", function () {
    nucleoid.run("class Storage { }");
    nucleoid.run("normal = 'NORMAL' ; low = 'LOW'");
    nucleoid.run(
      "if ( Storage.capacity > 25 ) { Storage.status = normal } else { Storage.status = low }"
    );
    nucleoid.run("storage1 = new Storage ( )");
    nucleoid.run("storage1.capacity = 23");
    assert.equal(nucleoid.run("storage1.status"), "LOW");

    nucleoid.run("low = 'L'");
    assert.equal(nucleoid.run("storage1.status"), "L");
  });

  it("creates else if statement of class after initialization", function () {
    nucleoid.run("class Registration { }");
    nucleoid.run("yes = 'YES' ; no = 'NO'");
    nucleoid.run("registration1 = new Registration ( )");
    nucleoid.run("registration1.available = 0");
    nucleoid.run(
      "if ( Registration.available > 0 ) { Registration.accepted = yes } else { Registration.accepted = no }"
    );
    assert.equal(nucleoid.run("registration1.accepted"), "NO");

    nucleoid.run("yes = true ; no = false");
    assert.equal(nucleoid.run("registration1.accepted"), false);
  });

  it("creates multiple else if statement of class before initialization", function () {
    nucleoid.run("class Capacity { }");
    nucleoid.run(
      "if ( Capacity.spare / Capacity.available > 0.5 ) { Capacity.total = Capacity.available +  Capacity.spare } else if ( Capacity.spare / Capacity.available > 0.1 ) { Capacity.total = Capacity.available +  Capacity.spare * 2 } else { Capacity.total = Capacity.available + Capacity.spare * 3 }"
    );
    nucleoid.run("capacity1 = new Capacity ( )");
    nucleoid.run("capacity1.available = 100");
    nucleoid.run("capacity1.spare = 5");
    assert.equal(nucleoid.run("capacity1.total"), 115);

    nucleoid.run("capacity1.spare = 1");
    assert.equal(nucleoid.run("capacity1.total"), 103);
  });

  it("creates multiple else if statement of class after initialization", function () {
    nucleoid.run("class Shape { }");
    nucleoid.run("shape1 = new Shape ( )");
    nucleoid.run("shape1.type = 'RECTANGLE'");
    nucleoid.run("shape1.x = 5");
    nucleoid.run("shape1.y = 6");
    nucleoid.run(
      "if ( Shape.type == 'SQUARE' ) { Shape.area = Math.pow( Shape.x, 2 ) } else if ( Shape.type == 'TRIANGLE' ) { Shape.area = Shape.x * Shape.y / 2 } else { Shape.area = Shape.x * Shape.y }"
    );
    assert.equal(nucleoid.run("shape1.area"), 30);

    nucleoid.run("shape1.x = 7");
    assert.equal(nucleoid.run("shape1.area"), 42);
  });

  it("runs block statement of class before initialization", function () {
    nucleoid.run("class Stock { }"); //Stock
    nucleoid.run(
      "{ let change = Stock.before * 4 / 100 ; Stock.after = Stock.before + change }"
    );
    nucleoid.run("stock1 = new Stock ( )");
    nucleoid.run("stock1.before = 57.25");
    assert.equal(nucleoid.run("stock1.after"), 59.54);

    nucleoid.run("stock1.before = 59.50");
    assert.equal(nucleoid.run("stock1.after"), 61.88);
  });

  it("runs block statement of class after initialization", function () {
    nucleoid.run("class Purchase { }");
    nucleoid.run("purchase = new Purchase ( )");
    nucleoid.run("purchase.price = 99");
    nucleoid.run(
      "{ let retailPrice = Purchase.price * 1.15 ; Purchase.retailPrice = retailPrice }"
    );
    assert.equal(nucleoid.run("purchase.retailPrice"), 113.85);

    nucleoid.run("purchase.price = 199");
    assert.equal(nucleoid.run("purchase.retailPrice"), 228.85);
  });

  it("runs nested block statement of class before initialization", function () {
    nucleoid.run("class Compound { }");
    nucleoid.run(
      "{ let mol = 69.94 / Compound.substance ; { Compound.sample = Math.floor ( mol * Compound.mol ) } }"
    );
    nucleoid.run("compound1 = new Compound ( )");
    nucleoid.run("compound1.substance = 55.85");
    nucleoid.run("compound1.mol = 1000");
    assert.equal(nucleoid.run("compound1.sample"), 1252);
  });

  it("runs nested block statement of class after initialization", function () {
    nucleoid.run("class Bug { }");
    nucleoid.run("bug1 = new Bug ( )");
    nucleoid.run("bug1.initialScore = 1000");
    nucleoid.run("bug1.aging = 24");
    nucleoid.run(
      "{ let score = Bug.aging * 10 ; { Bug.priorityScore = score + Bug.initialScore } }"
    );
    assert.equal(nucleoid.run("bug1.priorityScore"), 1240);
  });

  it("runs nested if statement of class before initialization", function () {
    nucleoid.run("class Mortgage { }");
    nucleoid.run(
      "{ let interest = Mortgage.annual / 12 ; if ( interest < 4 ) { Mortgage.rate = rate1 } }"
    );
    nucleoid.run("rate1 = 'EXCEPTIONAL'");
    nucleoid.run("mortgage1 = new Mortgage ( )");
    nucleoid.run("mortgage1.annual = 46");
    assert.equal(nucleoid.run("mortgage1.rate"), "EXCEPTIONAL");

    nucleoid.run("rate1 = 'E'");
    assert.equal(nucleoid.run("mortgage1.rate"), "E");
  });

  it("runs nested if statement of class after initialization", function () {
    nucleoid.run("class Building { }");
    nucleoid.run("buildingType1 = 'SKYSCRAPER'");
    nucleoid.run("building1 = new Building ( )");
    nucleoid.run("building1.floors = 20");
    nucleoid.run(
      "{ let height = Building.floors * 14 ; if ( height > 330 ) { Building.type = buildingType1 } }"
    );
    assert.equal(nucleoid.run("building1.type"), undefined);

    nucleoid.run("building1.floors = 25");
    assert.equal(nucleoid.run("building1.type"), "SKYSCRAPER");

    nucleoid.run("buildingType1 = 'S'");
    assert.equal(nucleoid.run("building1.type"), "S");
  });

  it("creates nested else statement of class before initialization", function () {
    nucleoid.run("class Account { }");
    nucleoid.run("noAlert = 'NO_ALERT'");
    nucleoid.run("lowAlert = 'LOW_ALERT'");
    nucleoid.run(
      "{ let balance = Account.balance ; if ( balance > 1000 ) { Account.alert = noAlert } else { Account.alert = lowAlert } }"
    );
    nucleoid.run("account1 = new Account ( )");
    nucleoid.run("account1.balance = 950");
    assert.equal(nucleoid.run("account1.alert"), "LOW_ALERT");

    nucleoid.run("lowAlert = 'L'");
    assert.equal(nucleoid.run("account1.alert"), "L");
  });

  it("creates nested else statement of class after initialization", function () {
    nucleoid.run("class Question { }");
    nucleoid.run("high = 'HIGH'");
    nucleoid.run("low = 'LOW'");
    nucleoid.run("question1 = new Question ( )");
    nucleoid.run("question1.count = 1");
    nucleoid.run(
      "{ let score = Question.count * 10 ; if ( score > 100 ) { Question.type = high } else { Question.type = low } }"
    );
    assert.equal(nucleoid.run("question1.type"), "LOW");

    nucleoid.run("low = 'L'");
    assert.equal(nucleoid.run("question1.type"), "L");
  });

  it("creates class assignment with multiple properties before declaration", function () {
    nucleoid.run("class Room { }");
    nucleoid.run("Room.level = Room.number / 10");
    nucleoid.run("class Guest { }");
    nucleoid.run("Guest.room = new Room ( )");
    nucleoid.run("guest1 = new Guest ( )");
    nucleoid.run("guest1.room.number = 30");
    assert.equal(nucleoid.run("guest1.room.level"), 3);
  });

  it("creates class assignment with multiple properties after declaration", function () {
    nucleoid.run("class Channel { }");
    nucleoid.run("class Frequency { }");
    nucleoid.run("channel1 = new Channel ( )");
    nucleoid.run("Channel.frequency = new Frequency ( )");
    nucleoid.run("Frequency.hertz = 1 / Frequency.period");
    nucleoid.run("channel1.frequency.period = 0.0025");
    assert.equal(nucleoid.run("channel1.frequency.hertz"), 400);
  });

  it("creates class assignment as multiple properties as part of declaration before initialization", function () {
    nucleoid.run("class Hospital { }");
    nucleoid.run("class Clinic { }");
    nucleoid.run("Hospital.clinic = new Clinic ( )");
    nucleoid.run("Hospital.patients = Hospital.clinic.beds * 746");
    nucleoid.run("hospital1 = new Hospital ( )");
    nucleoid.run("hospital1.clinic.beds = 2678");
    assert.equal(nucleoid.run("hospital1.patients"), 1997788);
  });

  it("creates class assignment as multiple properties as part of declaration after initialization", function () {
    nucleoid.run("class Server { }");
    nucleoid.run("class OS { }");
    nucleoid.run("Server.os = new OS ( )");
    nucleoid.run("server1 = new Server ( )");
    nucleoid.run("server1.os.version = 14");
    nucleoid.run("Server.build = Server.os.version + '.526291'");
    assert.equal(nucleoid.run("server1.build"), "14.526291");
  });

  it("creates class assignment only if instance is defined", function () {
    nucleoid.run("class Phone { }");
    assert.throws(
      function () {
        nucleoid.run("Phone.line.wired = true");
      },
      (error) => validate(error, ReferenceError, "Phone.line is not defined")
    );
  });

  it("creates for of statement", function () {
    nucleoid.run(
      "class Question { constructor ( rate ) { this.rate = rate } }"
    );
    nucleoid.run("question1 = new Question ( 4 )");
    nucleoid.run("question2 = new Question ( 5 )");
    nucleoid.run(
      "class Summary { constructor ( question ) { this.question = question } }"
    );
    nucleoid.run("Summary.rate = Summary.question.rate.value");

    nucleoid.run("for ( question of Questions ) { new Summary ( question ) }");
    assert.equal(nucleoid.run("Summarys[0]").rate, 4);
    assert.equal(nucleoid.run("Summarys[1]").rate, 5);
  });

  it("creates block of for statement without dependencies", function () {
    nucleoid.run("class Item { }");
    nucleoid.run("item1 = new Item ( )");
    nucleoid.run("item2 = new Item ( )");
    nucleoid.run("VALUE = 10");
    nucleoid.run(
      "for ( item of Items ) { let i = 10 * VALUE ; item.score = i }"
    );

    nucleoid.run("VALUE = 20");
    assert.equal(nucleoid.run("item1.score"), 100);
    assert.equal(nucleoid.run("item2.score"), 100);

    nucleoid.run(
      "for ( item of Items ) { let i = 10 * VALUE ; item.score = i }"
    );
    assert.equal(nucleoid.run("item1.score"), 200);
    assert.equal(nucleoid.run("item2.score"), 200);
  });

  it("loops through only defined objects in for of statement", function () {
    nucleoid.run("array = [ ]");
    nucleoid.run("class Item { }");

    nucleoid.run("item1 = new Object ( ) ;  array.push ( item1 )");
    nucleoid.run("item2 = { id: 'item3' } ;   array.push ( item2 )");
    nucleoid.run("item4 = new Item ( );   array.push ( item4 )");
    nucleoid.run("count = 0;");

    nucleoid.run("for ( item of array ) { count++ }");
    assert.equal(nucleoid.run("count"), 1);
  });

  it("supports if statement in for of statement", function () {
    nucleoid.run("class Question { }");
    nucleoid.run("question1 = new Question ( )");
    nucleoid.run("question2 = new Question ( )");
    nucleoid.run("question2.archived = true");
    nucleoid.run("question3 = new Question ( )");
    nucleoid.run(
      "class Summary { constructor ( question ) { this.question = question } }"
    );
    nucleoid.run("Summary.type = 'DAILY'");
    nucleoid.run(
      "for ( question of Questions ) { if ( ! question.archived ) { new Summary ( question ) } }"
    );

    assert.equal(nucleoid.run("Summarys.length"), 2);
    assert.equal(nucleoid.run("Summarys[0].question.id"), "question1");
    assert.equal(nucleoid.run("Summarys[1].question.id"), "question3");
    assert.equal(nucleoid.run("Summarys[0].type"), "DAILY");
    assert.equal(nucleoid.run("Summarys[1].type"), "DAILY");
  });

  it("returns integer in variable assignment", () => {
    nucleoid.run("function test ( a ) { return a = 2 }");
    assert.equal(nucleoid.run("b = 1 ; test ( b )"), 2);
  });

  it("returns string in variable assignment", () => {
    nucleoid.run("function test ( a ) { return a = 'abc' }");
    assert.equal(nucleoid.run("b = 1 ; test ( b )"), "abc");
  });

  it("returns object in variable assignment", () => {
    nucleoid.run("function test ( a ) { return a = new Object ( ) }");
    assert.deepEqual(nucleoid.run("b = 1 ; test ( b )"), {});
  });

  it("returns undefined in class creation", () => {
    assert.equal(nucleoid.run("class Test { }"), undefined);
  });

  it("returns object itself in object creation", () => {
    nucleoid.run("class Test { constructor ( prop ) { this.prop = prop } }");
    const object = nucleoid.run("new Test ( 123 )");
    assert.notEqual(object.id, null);
    assert.equal(object.prop, 123);
  });

  describe("Nucleoid (Imperative)", () => {
    const imperative = { declarative: false };

    beforeEach(function () {
      for (let property in state) delete state[property];
      for (let property in graph) delete graph[property];

      state["Classes"] = [];
      graph["Classes"] = { name: "Classes" };
    });

    it("creates variable assignment", () => {
      nucleoid.run("x = 1", imperative);
      nucleoid.run("y = x + 2", imperative);
      nucleoid.run("x = 2", imperative);
      assert.equal(nucleoid.run("y", imperative), 3);
    });

    it("creates if statement of variable", () => {
      nucleoid.run("m = false", imperative);
      nucleoid.run("n = false", imperative);
      nucleoid.run("if ( m == true ) { n = m && true }", imperative);
      assert.equal(nucleoid.run("n", imperative), false);

      nucleoid.run("m = true", imperative);
      assert.equal(nucleoid.run("n", imperative), false);
    });

    it("creates property assignment", () => {
      nucleoid.run("class Order { }", imperative);
      nucleoid.run("var order1 = new Order ( )", imperative);
      nucleoid.run("order1.upc = '04061' + order1.barcode", imperative);
      nucleoid.run("order1.barcode = '94067'", imperative);
      assert.equal(nucleoid.run("order1.upc", imperative), undefined);

      nucleoid.run("order1.upc = '04061' + order1.barcode", imperative);
      assert.equal(nucleoid.run("order1.upc", imperative), "0406194067");
    });
  });
});