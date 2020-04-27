var state = require("./state");
var graph = require("./graph");
var Instruction = require("./instruction");
var Node = require("./node");

module.exports = class DELETE {
  before() {}
  run(scope) {
    state.run(scope, "delete state." + this.key);

    let list = [];

    for (let node in graph[this.key].next) {
      list.push(new Instruction(scope.root, graph[node], false, true, false));
    }

    return list;
  }

  beforeGraph() {}
  graph() {
    for (let node in graph[this.key].previous)
      delete graph[node].next[this.key];

    let empty = new Node();

    for (let node in graph[this.key].next) {
      empty.next[node] = graph[this.key].next[node];
      delete graph[this.key].next[node];
    }

    let name = graph[this.key].name;
    delete graph[this.key].object.property[name];
    delete graph[this.key];
    graph[this.key] = empty;
  }
};
