var state = require("./state");
var Node = require("./node");

module.exports = class FUNCTION extends Node {
  before() {
    this.key = this.name;
  }

  run(scope) {
    state.assign(scope, this.name, new Function(this.args, this.block));
  }
};
