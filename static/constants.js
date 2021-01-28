/* eslint-disable no-unused-vars */
const MESSAGE = "MESSAGE";
const IDENTIFY = "IDENTIFY";
const ERROR = "ERROR";

// things get complicated past 16kb
const CHUNK_SIZE = 15 * 1024;
const NUM_CHANNELS = 10;

// lol
if (typeof module !== "undefined" && typeof module.exports === "object") {
    module.exports = {
        MESSAGE,
        IDENTIFY,
        ERROR,
    };
}
