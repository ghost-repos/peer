import { createServer } from "http";
import { createReadStream } from "fs";
import { Server } from "ws";
import { MESSAGE, IDENTIFY } from "../static/constants";

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

const clients = new WeakMap();
const clientIds = new Map();

function generateUniqueId() {
    function generateId() {
        const words = [["Awesome", "Blue", "Crazy", "Darn", "Edgy"],
            ["Astute", "Buff", "Cool", "Dead", "Excellent"],
            ["Animal", "Ball", "Castle", "Dear", "Ear"]];
        return Array.from({ length: 3 }, () => Math.floor(Math.random() * 5))
            .map((num, i) => words[i][num]).join("");
    }

    let id;
    do {
        id = generateId();
    } while (clientIds.has(id));

    return id;
}

wsServer.on("connection", (socket) => {
    socket.on("message", (data) => {
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

            forwardTo?.send(JSON.stringify({
                op: MESSAGE,
                payload: {
                    from,
                    to,
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
