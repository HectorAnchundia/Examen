"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var jayson = require("jayson");
// Definir los métodos JSON-RPC
var methods = {
    sum: function (args, callback) {
        callback(null, args.a + args.b);
    },
    hello: function (args, callback) {
        callback(null, "Hola, ".concat(args.name, "!"));
    }
};
var server = new jayson.Server(methods);
var app = (0, express_1.default)();
app.use(express_1.default.json());
app.post("/jsonrpc", server.middleware());
app.listen(4000, function () {
    console.log("JSON-RPC service listening on http://localhost:4000/jsonrpc");
});
