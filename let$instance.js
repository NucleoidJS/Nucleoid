var LET = require("./let");
var EXPRESSION = require("./expression");
var Identifier = require("./identifier");

class LET$INSTANCE extends LET {
  prepare() {
    this.value = new EXPRESSION(
      this.declaration.value.tokens.map(token => {
        let parts = token.split(".");
        if (parts[0] == this.class.name)
          parts[0] = Identifier.serialize(this.instance, true);
        return parts.join(".");
      })
    );
  }
}

LET$INSTANCE.prototype.type = "INSTANCE";
module.exports = LET$INSTANCE;
