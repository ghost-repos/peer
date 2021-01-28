import { createServer } from "http";
import { readFileSync } from "fs";
import WebSocket, { Server } from "ws";
import { MESSAGE, IDENTIFY, ERROR } from "../static/constants";

const home = readFileSync("./static/index.html");
const adapter = readFileSync("./static/adapter.js");
const constants = readFileSync("./static/constants.js");

const server = createServer((req, res) => {
    switch (req.url) {
    case "/":
        res.setHeader("content-type", "text/html");
        res.end(home);
        break;
    case "/adapter.js":
        res.setHeader("content-type", "application/javascript");
        res.end(adapter);
        break;
    case "/constants.js":
        res.setHeader("content-type", "application/javascript");
        res.end(constants);
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

type Id = string;
const clients = new WeakMap<WebSocket, Id>();
const clientIds = new Map<Id, WebSocket>();

const idPool = Array.from({ length: 50 }, (_, i) => String(i));
for (let i = 0; i < idPool.length; i++) {
    const temp = idPool[i];
    const pos = Math.floor(Math.random() * idPool.length - i) + i;
    idPool[i] = idPool[pos];
    idPool[pos] = temp;
}

function generateUniqueId():Id {
    function generateId() {
        return idPool.shift();
    }

    const id = generateId();

    if (id === undefined) {
        throw new Error("Ran out of ids...");
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
            idPool.push(id);
            console.log(`${id} socket close`);
        }
    });

    socket.on("error", () => {
        const id = clients.get(socket);
        if (id) {
            clients.delete(socket);
            clientIds.delete(id);
            idPool.push(id);
            console.log(`${id} socket error`);
        }
    });
});
