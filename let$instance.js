var LET = require("./let");
var EXPRESSION = require("./expression");
var Identifier = require("./identifier");
var BREAK = require("./break");
var state = require("./state");

module.exports = class LET$INSTANCE extends LET {
  before() {
    this.value = new EXPRESSION(
      this.declaration.value.tokens.map((token) => {
        let parts = token.split(".");
        if (parts[0] === this.class.name)
          parts[0] = Identifier.serialize(this.instance, true);
        return parts.join(".");
      })
    );
  }

  run(scope) {
    try {
      let value = this.value.run(scope);
      let expression = "scope.local." + this.name + `=${value}`;
      state.run(scope, expression);
    } catch (error) {
      return new BREAK(scope.block);
    }
  }
};
