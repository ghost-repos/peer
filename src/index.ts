import { createServer } from "http";
import { createReadStream } from "fs";
import WebSocket, { Server } from "ws";
import { MESSAGE, IDENTIFY, ERROR } from "../static/constants";

const server = createServer((req, res) => {
    switch (req.url) {
    case "/":
        res.setHeader("content-type", "text/html");
        createReadStream("./static/index.html").pipe(res);
        break;
    case "/adapter.js":
        res.setHeader("content-type", "application/javascript");
        createReadStream("./static/adapter.js").pipe(res);
        break;
    case "/constants.js":
        res.setHeader("content-type", "application/javascript");
        createReadStream("./static/constants.js").pipe(res);
        break;
    default:
        res.statusCode = 404;
        res.end();
    }
});

server.listen(8080);

const wsServer = new Server({
    server,
});

type Id = String;
const clients = new WeakMap<WebSocket, Id>();
const clientIds = new Map<Id, WebSocket>();

function generateUniqueId() {
    function generateId() {
        const words = [
            ["Awesome", "Blue", "Crazy", "Darn", "Edgy"],
            ["Astute", "Buff", "Cool", "Dead", "Excellent"],
            ["Animal", "Ball", "Castle", "Dear", "Ear"],
        ];
        return Array.from({ length: 3 }, () => Math.floor(Math.random() * 5))
            .map((num, i) => words[i][num]).join("");
    }

    let id = generateId();
    while (clientIds.has(id)) {
        id = generateId();
    }

    return id;
}

wsServer.on("connection", (socket) => {
    socket.on("message", (data) => {
        console.log(data);
        const { op, payload } = JSON.parse(String(data));

        switch (op) {
        case IDENTIFY: {
            const newId = generateUniqueId();
            clients.set(socket, newId);
            clientIds.set(newId, socket);

            socket.send(JSON.stringify({
                op: IDENTIFY,
                payload: newId,
            }));
            break;
        }
        case MESSAGE: {
            const { to, message } = payload;

            const from = clients.get(socket);
            const forwardTo = clientIds.get(to);

            if (!forwardTo) {
                socket.send(JSON.stringify({
                    op: ERROR,
                    payload: {
                        message: "Invalid ID",
                    },
                }));
                return;
            }

            if (forwardTo === socket) {
                socket.send(JSON.stringify({
                    op: ERROR,
                    payload: {
                        message: "Can't connect to self",
                    },
                }));
                return;
            }

            forwardTo.send(JSON.stringify({
                op: MESSAGE,
                payload: {
                    from,
                    message,
                },
            }));
            break;
        }
        default:
        }
    });

    socket.on("close", () => {
        const id = clients.get(socket);
        if (id) {
            clients.delete(socket);
            clientIds.delete(id);
        }
        console.log(`${id} socket close`);
    });

    socket.on("error", () => {
        const id = clients.get(socket);
        if (id) {
            clients.delete(socket);
            clientIds.delete(id);
        }
        console.log(`${id} socket error`);
    });
});
