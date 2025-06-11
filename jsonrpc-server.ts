import express from "express";
import * as jayson from "jayson";
import { Pool } from "pg";

// Configuración de conexión a PostgreSQL
const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "1234",
  database: "ExamenWebII"
});

//métodos JSON-RPC
const methods = {
  addLibro: function(args: { titulo: string, autor: string, estado:string }, callback: any) {
    if (!args.titulo || !args.autor || !args.estado) {
      callback({ code: -32602, message: "Faltan datos obligatorios (titulo, autor, estado)" });
      return;
    }
    pool.query(
      "INSERT INTO libros (titulo, autor, estado) VALUES ($1, $2, $3) RETURNING *",
      [args.titulo, args.autor, args.estado]
    )
      .then(result => callback(null, result.rows[0]))
      .catch(err => callback({ code: -32000, message: "Error al insertar libro", data: err }));
  },
  updateLibro: function(args: { id: number, titulo: string, autor: string, estado: string }, callback: any) {
    // validacion
    if (args.id === undefined || args.id === null || !args.titulo || !args.autor || !args.estado) {
      callback({ code: -32602, message: "Faltan datos obligatorios (id, titulo, autor, estado)" });
      return;
    }
    pool.query(
      "UPDATE libros SET titulo = $1, autor = $2, estado = $3 WHERE id = $4 RETURNING *",
      [args.titulo, args.autor, args.estado, args.id]
    )
      .then(result => {
        if (result.rowCount === 0) {
          callback({ code: -32001, message: "Libro no encontrado" });
        } else {
          callback(null, result.rows[0]);
        }
      })
      .catch(err => callback({ code: -32000, message: "Error al actualizar libro", data: err }));
  },
  deleteLibro: function(args: { id: number }, callback: any) {
    if (!args.id) {
      callback({ code: -32602, message: "Falta el id del libro a eliminar" });
      return;
    }
    pool.query(
      "DELETE FROM libros WHERE id = $1 RETURNING *",
      [args.id]
    )
      .then(result => {
        if (result.rowCount === 0) {
          callback({ code: -32001, message: "Libro no encontrado" });
        } else {
          callback(null, { message: "Libro eliminado", libro: result.rows[0] });
        }
      })
      .catch(err => callback({ code: -32000, message: "Error al eliminar libro", data: err }));
  },
  listarLibros: function(_: any, callback: any) {
    pool.query("SELECT * FROM libros")
      .then(result => callback(null, result.rows))
      .catch(err => callback({ code: -32000, message: "Error al obtener libros", data: err }));
  },
};

const server = new jayson.Server(methods);

const app = express();
app.use(express.json());

// GET
app.get("/jsonrpc", (req, res) => {
  (async () => {
    try {
      const result = await pool.query("SELECT * FROM libros");
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Error al obtener libros", details: err });
    }
  })();
});

// PUT
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
    } catch (err) {
      res.status(500).json({ error: "Error al actualizar libro", details: err });
    }
  })();
});

// DELETE
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
    } catch (err) {
      res.status(500).json({ error: "Error al eliminar libro", details: err });
    }
  })();
});

// POST:
app.post("/jsonrpc", server.middleware());

app.listen(4000, () => {
  console.log("JSON-RPC service listening on http://localhost:4000/jsonrpc");
});
