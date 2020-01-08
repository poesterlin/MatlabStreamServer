import sirv from "sirv";
import polka from "polka";
import compression from "compression";
import * as sapper from "@sapper/server";
import http from "http";
import io from "socket.io";
import tmp from "tmp";
import { writeFile } from "fs";
import { spawn } from "child_process";

const { PORT, NODE_ENV } = process.env;
const dev = NODE_ENV === "development";

const server = http.createServer();

polka({ server }) // You can also use Express
  .use(
    compression({ threshold: 0 }),
    sirv("static", { dev }),
    sapper.middleware()
  )
  .listen(PORT, err => {
    if (err) console.log("error", err);
  });

const socket = io(server);
socket.on("connection", function(socket) {
  socket.on("message", function(data) {
    saveTmp(JSON.parse(data));
  });
});

function saveTmp(arr) {
  tmp.file({ prefix: "data-", postfix: ".csv" }, (err, path, _, cleanup) => {
    if (err) {
      console.error(err);
      return;
    }
    const header = "time x y z\n";
    const csv = arr
      .map((line, i) => `${i * 100},${line.x},${line.y},${line.z}`)
      .join("\n");
    writeFile(path, header.concat(csv), () => runMatlab(path).then(cleanup));
  });
}

function runMatlab(path) {
  const start = Date.now();

  //TODO: update command
  // run matlab
  const matlabProcess = spawn("dir", [
    "C:\\Users\\Philip\\AppData\\Local\\Temp"
  ]);

  return new Promise(res => {
    // listen to process output and send it over socket
    matlabProcess.stdout.on("data", results => {
      //TODO: parse results
      socket.emit("results", results.toString().length);
    });

    // log processing times
    matlabProcess.on("close", () => {
      console.log("matlab done in: " + (Date.now() - start) / 1000, "s");
      setTimeout(res, 10000);
    });
  });
}
