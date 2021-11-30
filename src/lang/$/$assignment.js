const $PROPERTY = require("./$property");
const $VARIABLE = require("./$variable");
const Local = require("../../utils/local");
const $LET = require("./$let");
const $ = require("./$");
const Id = require("../../utils/identifier");

module.exports = function (left, right) {
  let statement = new $ASSIGNMENT();
  statement.left = left.split(".");
  statement.right = right;
  return statement;
};

class $ASSIGNMENT extends $ {
  run(scope) {
    if (this.left.length === 1) {
      return $VARIABLE(this.left[0], this.right);
    } else {
      let parts = Id.splitLast(this.left.join("."));

      if (Local.check(scope, parts[1])) {
        return $LET(this.left.join("."), this.right);
      } else {
        return $PROPERTY(parts[1], parts[0], this.right);
      }
    }
  }
}