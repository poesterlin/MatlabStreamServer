import sirv from "sirv";
import polka from "polka";
import compression from "compression";
import * as sapper from "@sapper/server";
import io from "socket.io";
import tmp from "tmp";
import { writeFile, readdirSync, unlinkSync, readFileSync } from "fs";
import { spawn } from "child_process";
import { join } from "path";
import { createServer } from 'https';
import * as http from 'http';

const { PORT, NODE_ENV } = process.env;
const dev = NODE_ENV === "development";

const options = {};

if (!dev) {
  options.key = readFileSync("/etc/letsencrypt/live/matlab.oesterlin.dev-0001/privkey.pem");
  options.cert = readFileSync("/etc/letsencrypt/live/matlab.oesterlin.dev-0001/cert.pem");
  options.ca = readFileSync("/etc/letsencrypt/live/matlab.oesterlin.dev-0001/chain.pem");
}

const tmpDir = "csv";

// cleanTemp();

function cleanTemp() {
  return readdirSync(tmpDir, { withFileTypes: true })
    .filter(f => f.name.includes(".csv"))
    .forEach(f => {
      try {
        unlinkSync(join(tmpDir, f.name));
      } catch (error) {
        console.log(error);
      }
    });
}

process.on("beforeExit", cleanTemp);

const { handler } = polka().use(
  compression({ threshold: 0 }),
  sirv("static", { dev }),
  sapper.middleware()
)

let create = createServer;
if(dev){
  create = http.createServer
}

const server = create(options, handler).listen(PORT, err => {
  if(err) throw err;
  console.log(`> Running on port ${PORT}`);
});

const socket = io(server);
socket.on("connection", function (socket) {
  socket.on("message", function (data) {
    saveTmp(JSON.parse(data));
  });
});

tmp.setGracefulCleanup();

function saveTmp(arr) {
  tmp.file(
    { prefix: "data-", postfix: ".csv", dir: tmpDir },
    (err, path, _, cleanup) => {
      if (err) {
        console.error(err);
        return;
      }
      const header = "time x y z\n";
      const csv = arr
        .map((line, i) => `${i * 100},${line.x},${line.y},${line.z}`)
        .join("\n");
      writeFile(path, header.concat(csv), () => runMatlab(path).then(cleanup));
    }
  );
}

function runMatlab(path) {
  const start = Date.now();

  //TODO: update command
  // run matlab
  const matlabProcess = spawn("ls");

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