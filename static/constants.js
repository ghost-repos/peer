/* eslint-disable no-unused-vars */
const MESSAGE = "MESSAGE";
const IDENTIFY = "IDENTIFY";
const ERROR = "ERROR";

// things get complicated past 16kb
const CHUNK_SIZE = 14000;

// lol
if (typeof module !== "undefined" && typeof module.exports === "object") {
    module.exports = {
        MESSAGE,
        IDENTIFY,
        CHUNK_SIZE,
        ERROR,
    };
}
