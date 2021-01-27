import { createServer } from "http";
import { createReadStream } from "fs";
import { Server } from "ws";

let request = 0;

const server = createServer((req, res) => {
  console.log(request++, req.url);
  switch (req.url) {
    case "/":
      res.setHeader("content-type", "text/html");
      createReadStream("./static/index.html").pipe(res);
      break;
    case "/adapter.js":
      res.setHeader("content-type", "application/javascript");
      createReadStream("./static/adapter.js").pipe(res);
      break;
    default:
      res.statusCode = 404;
      res.end();
  }
})

server.listen(8080);

const wsServer = new Server({
  server,
});

let id = 1;
const clients = new WeakMap();
const clientIds = new Map();

wsServer.on("connection", (socket) => {
  socket.on("message", message => {
    console.log(message);
    const { op, payload } = JSON.parse(String(message));

    switch (op) {
      case "IDENTIFY": {
        clients.set(socket, id);
        clientIds.set(String(id), socket);

        socket.send(JSON.stringify({
          op: "IDENTIFY",
          payload: String(id)
        }));

        id++;
        break;
      }
      case "MESSAGE": {
        const { to, message } = payload;

        const from = clients.get(socket);
        const forwardTo = clientIds.get(String(to));

        forwardTo.send(JSON.stringify({
          op: "MESSAGE",
          payload: {
            from: String(from),
            to: String(to),
            message,
          }
        }));
        break;
      }
    }
  });

  socket.on("close", () => {
    const id = clients.get(socket);
    clients.delete(socket);
    clientIds.delete(id);
    console.log(`${id} socket close`);
  });

  socket.on("error", () => {
    const id = clients.get(socket);
    clients.delete(socket);
    clientIds.delete(id);
    console.log(`${id} socket error`);
  });
});