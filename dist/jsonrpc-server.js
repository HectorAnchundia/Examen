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
    database: "ExamenWebII"
});
// Definir los métodos JSON-RPC
const methods = {
    addLibro: function (args, callback) {
        if (!args.titulo || !args.autor || !args.estado) {
            callback({ code: -32602, message: "Faltan datos obligatorios (titulo, autor, estado)" });
            return;
        }
        pool.query("INSERT INTO libros (titulo, autor, estado) VALUES ($1, $2, $3) RETURNING *", [args.titulo, args.autor, args.estado])
            .then(result => callback(null, result.rows[0]))
            .catch(err => callback({ code: -32000, message: "Error al insertar libro", data: err }));
    },
    updateLibro: function (args, callback) {
        // Validar explícitamente null o undefined
        if (args.id === undefined || args.id === null || !args.titulo || !args.autor || !args.estado) {
            callback({ code: -32602, message: "Faltan datos obligatorios (id, titulo, autor, estado)" });
            return;
        }
        pool.query("UPDATE libros SET titulo = $1, autor = $2, estado = $3 WHERE id = $4 RETURNING *", [args.titulo, args.autor, args.estado, args.id])
            .then(result => {
            if (result.rowCount === 0) {
                callback({ code: -32001, message: "Libro no encontrado" });
            }
            else {
                callback(null, result.rows[0]);
            }
        })
            .catch(err => callback({ code: -32000, message: "Error al actualizar libro", data: err }));
    },
    deleteLibro: function (args, callback) {
        if (!args.id) {
            callback({ code: -32602, message: "Falta el id del libro a eliminar" });
            return;
        }
        pool.query("DELETE FROM libros WHERE id = $1 RETURNING *", [args.id])
            .then(result => {
            if (result.rowCount === 0) {
                callback({ code: -32001, message: "Libro no encontrado" });
            }
            else {
                callback(null, { message: "Libro eliminado", libro: result.rows[0] });
            }
        })
            .catch(err => callback({ code: -32000, message: "Error al eliminar libro", data: err }));
    },
    listarLibros: function (_, callback) {
        pool.query("SELECT * FROM libros")
            .then(result => callback(null, result.rows))
            .catch(err => callback({ code: -32000, message: "Error al obtener libros", data: err }));
    },
};
const server = new jayson.Server(methods);
const app = (0, express_1.default)();
app.use(express_1.default.json());
// GET: obtener libros
app.get("/jsonrpc", (req, res) => {
    (async () => {
        try {
            const result = await pool.query("SELECT * FROM libros");
            res.json(result.rows);
        }
        catch (err) {
            res.status(500).json({ error: "Error al obtener libros", details: err });
        }
    })();
});
// PUT: actualizar libro
app.put("/jsonrpc", (req, res) => {
    (async () => {
        const { id, titulo, autor, estado } = req.body;
        if (!id || !titulo || !autor || !estado) {
            res.status(400).json({ error: "Faltan datos obligatorios (id, titulo, autor, estado)" });
            return;
        }
        try {
            await pool.query("UPDATE libros SET titulo = $1, autor = $2, estado = $3 WHERE id = $4", [titulo, autor, estado, id]);
            res.json({ message: "Libro actualizado" });
        }
        catch (err) {
            res.status(500).json({ error: "Error al actualizar libro", details: err });
        }
    })();
});
// DELETE: eliminar libro
app.delete("/jsonrpc", (req, res) => {
    (async () => {
        const { id } = req.body;
        if (!id) {
            res.status(400).json({ error: "Falta el id del libro a eliminar" });
            return;
        }
        try {
            await pool.query("DELETE FROM libros WHERE id = $1", [id]);
            res.json({ message: "Libro eliminado" });
        }
        catch (err) {
            res.status(500).json({ error: "Error al eliminar libro", details: err });
        }
    })();
});
// POST: JSON-RPC
app.post("/jsonrpc", server.middleware());
app.listen(4000, () => {
    console.log("JSON-RPC service listening on http://localhost:4000/jsonrpc");
});
