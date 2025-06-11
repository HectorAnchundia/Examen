import express from "express";
import * as jayson from "jayson";
import { Pool } from "pg";

// Configuración de conexión a PostgreSQL
const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "1234",
  database: "ExamenWeb"
});

// Definir los métodos JSON-RPC
const methods = {
  addUser: function(args: { name: string, email: string }, callback: any) {
    if (!args.name || !args.email) {
      callback({ code: -32602, message: "Faltan datos obligatorios (name, email)" });
      return;
    }
    pool.query(
      "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
      [args.name, args.email]
    )
      .then(result => callback(null, result.rows[0]))
      .catch(err => callback({ code: -32000, message: "Error al insertar usuario", data: err }));
  },
  sum: function(args: {a: number, b: number}, callback: any) {
    callback(null, args.a + args.b);
  },
  hello: function(args: {name: string}, callback: any) {
    callback(null, `Hola, ${args.name}!`);
  },
  updateUser: function(args: { id: number, name: string, email: string }, callback: any) {
    if (!args.id || !args.name || !args.email) {
      callback({ code: -32602, message: "Faltan datos obligatorios (id, name, email)" });
      return;
    }
    pool.query(
      "UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *",
      [args.name, args.email, args.id]
    )
      .then(result => {
        if (result.rowCount === 0) {
          callback({ code: -32001, message: "Usuario no encontrado" });
        } else {
          callback(null, result.rows[0]);
        }
      })
      .catch(err => callback({ code: -32000, message: "Error al actualizar usuario", data: err }));
  },
  deleteUser: function(args: { id: number }, callback: any) {
    if (!args.id) {
      callback({ code: -32602, message: "Falta el id del usuario a eliminar" });
      return;
    }
    pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING *",
      [args.id]
    )
      .then(result => {
        if (result.rowCount === 0) {
          callback({ code: -32001, message: "Usuario no encontrado" });
        } else {
          callback(null, { message: "Usuario eliminado", user: result.rows[0] });
        }
      })
      .catch(err => callback({ code: -32000, message: "Error al eliminar usuario", data: err }));
  }
};

const server = new jayson.Server(methods);

const app = express();
app.use(express.json());

// GET: obtener usuarios
app.get("/jsonrpc", (req, res) => {
  (async () => {
    try {
      const result = await pool.query("SELECT * FROM users");
      res.json(result.rows);
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      res.status(500).json({ error: "Error al eliminar usuario", details: err });
    }
  })();
});

// POST: JSON-RPC
app.post("/jsonrpc", server.middleware());

app.listen(4000, () => {
  console.log("JSON-RPC service listening on http://localhost:4000/jsonrpc");
});
