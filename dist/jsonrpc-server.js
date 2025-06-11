"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jayson = __importStar(require("jayson"));
const pg_1 = require("pg");
// Configuración de conexión a PostgreSQL
const pool = new pg_1.Pool({
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "1234",
    database: "ExamenWeb"
});
// Definir los métodos JSON-RPC
const methods = {
    addUser: function (args, callback) {
        if (!args.name || !args.email) {
            callback({ code: -32602, message: "Faltan datos obligatorios (name, email)" });
            return;
        }
        pool.query("INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *", [args.name, args.email])
            .then(result => callback(null, result.rows[0]))
            .catch(err => callback({ code: -32000, message: "Error al insertar usuario", data: err }));
    },
    sum: function (args, callback) {
        callback(null, args.a + args.b);
    },
    hello: function (args, callback) {
        callback(null, `Hola, ${args.name}!`);
    },
    updateUser: function (args, callback) {
        if (!args.id || !args.name || !args.email) {
            callback({ code: -32602, message: "Faltan datos obligatorios (id, name, email)" });
            return;
        }
        pool.query("UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *", [args.name, args.email, args.id])
            .then(result => {
            if (result.rowCount === 0) {
                callback({ code: -32001, message: "Usuario no encontrado" });
            }
            else {
                callback(null, result.rows[0]);
            }
        })
            .catch(err => callback({ code: -32000, message: "Error al actualizar usuario", data: err }));
    },
    deleteUser: function (args, callback) {
        if (!args.id) {
            callback({ code: -32602, message: "Falta el id del usuario a eliminar" });
            return;
        }
        pool.query("DELETE FROM users WHERE id = $1 RETURNING *", [args.id])
            .then(result => {
            if (result.rowCount === 0) {
                callback({ code: -32001, message: "Usuario no encontrado" });
            }
            else {
                callback(null, { message: "Usuario eliminado", user: result.rows[0] });
            }
        })
            .catch(err => callback({ code: -32000, message: "Error al eliminar usuario", data: err }));
    }
};
const server = new jayson.Server(methods);
const app = (0, express_1.default)();
app.use(express_1.default.json());
// GET: obtener usuarios
app.get("/jsonrpc", (req, res) => {
    (async () => {
        try {
            const result = await pool.query("SELECT * FROM users");
            res.json(result.rows);
        }
        catch (err) {
            res.status(500).json({ error: "Error al obtener usuarios", details: err });
        }
    })();
});
// PUT: actualizar usuario (requiere id y datos en body)
app.put("/jsonrpc", (req, res) => {
    (async () => {
        const { id, name, email } = req.body;
        if (!id || !name || !email) {
            res.status(400).json({ error: "Faltan datos obligatorios (id, name, email)" });
            return;
        }
        try {
            await pool.query("UPDATE users SET name = $1, email = $2 WHERE id = $3", [name, email, id]);
            res.json({ message: "Usuario actualizado" });
        }
        catch (err) {
            res.status(500).json({ error: "Error al actualizar usuario", details: err });
        }
    })();
});
// DELETE: eliminar usuario (requiere id en body)
app.delete("/jsonrpc", (req, res) => {
    (async () => {
        const { id } = req.body;
        if (!id) {
            res.status(400).json({ error: "Falta el id del usuario a eliminar" });
            return;
        }
        try {
            await pool.query("DELETE FROM users WHERE id = $1", [id]);
            res.json({ message: "Usuario eliminado" });
        }
        catch (err) {
            res.status(500).json({ error: "Error al eliminar usuario", details: err });
        }
    })();
});
// POST: JSON-RPC
app.post("/jsonrpc", server.middleware());
app.listen(4000, () => {
    console.log("JSON-RPC service listening on http://localhost:4000/jsonrpc");
});
