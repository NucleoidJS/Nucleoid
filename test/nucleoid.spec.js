var assert = require("assert");
var nucleoid = require("../nucleoid");

describe("Nucleoid", function() {
  it("runs statements in the state", function() {
    nucleoid.run("var i = 1 ;");
    assert.equal(nucleoid.run("i == 1"), true);
  });

  it("runs expression statement", function() {
    nucleoid.run("var j = 1 ;");
    assert.equal(nucleoid.run("j + 2"), 3);
  });

  it("allows variable declaration without var keyword", function() {
    nucleoid.run("pi = 3.14 ;");
    assert.equal(nucleoid.run("pi == 3.14"), true);
  });

  it("allows statements without semicolon at the end", function() {
    nucleoid.run("au = 149597870700");
    assert.equal(nucleoid.run("au == 149597870700"), true);
  });

  it("rejects variable if not declared", function() {
    assert.throws(function() {
      nucleoid.run("e == 2.71828");
    }, ReferenceError);
  });

  it("runs multiple statements in the state", function() {
    nucleoid.run("k = 1 ; l = k + 1 ; k = 2");
    assert.equal(nucleoid.run("l == 3"), true);
  });

  it("creates variable assignment", function() {
    nucleoid.run("x = 1");
    nucleoid.run("y = x + 2");
    nucleoid.run("x = 2");
    assert.equal(nucleoid.run("y == 4"), true);
  });

  it("creates if statement of variable", function() {
    nucleoid.run("m = false");
    nucleoid.run("n = false");
    nucleoid.run("if ( m == true ) { n = m && true }");
    assert.equal(nucleoid.run("n == false"), true);

    nucleoid.run("m = true");
    assert.equal(nucleoid.run("n == true"), true);
  });
});
