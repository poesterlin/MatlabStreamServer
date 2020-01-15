import sirv from "sirv";
import polka from "polka";
import compression from "compression";
import * as sapper from "@sapper/server";
import io from "socket.io";
import { readFileSync, appendFileSync, writeFileSync } from "fs";
import { join } from "path";
import { createServer } from "https";
import * as http from "http";

let { PORT, NODE_ENV } = process.env;
const dev = NODE_ENV === "development";

if (!dev) {
  PORT = 443;
}

const options = {};

if (!dev) {
  options.key = readFileSync(
    "/etc/letsencrypt/live/matlab.oesterlin.dev-0001/privkey.pem"
  );
  options.cert = readFileSync(
    "/etc/letsencrypt/live/matlab.oesterlin.dev-0001/cert.pem"
  );
  options.ca = readFileSync(
    "/etc/letsencrypt/live/matlab.oesterlin.dev-0001/chain.pem"
  );
}

const { handler } = polka()
  .get("/csv", (_, res) => {
    res.end(readFileSync(join("csv", "file.csv")));
    resetFile("");
  })
  .use(
    compression({ threshold: 0 }),
    sirv("static", { dev }),
    sapper.middleware()
  );

let create = createServer;
if (dev) {
  create = http.createServer;
}

const server = create(options, handler).listen(PORT, err => {
  if (err) throw err;
  log(`> Running on port ${PORT}`);
});

const socket = io(server);
socket.on("connection", socket => {
  socket.on("message", data => {
    const newData = JSON.parse(data);

    const csv = newData
      .map((line, i) => `${(i + lastTs) * 100},${line.x},${line.y},${line.z}`)
      .join("\n");

    lastTs += newData.length;
    if (lastTs > 12000) {
      resetFile(csv);
    }

    appendFileSync(join("csv", "file.csv"), "\n" + csv);
  });
});

let lastTs = 0;
resetFile("");

function resetFile(csv) {
  const header = "time x y z";
  writeFileSync(join("csv", "file.csv"), header + csv);
  log("---> reset files");
  lastTs = 0;
}

function log(message) {
  const d = new Date();
  const date = `${d.getHours()} : ${
    d.getMinutes() > 9 ? d.getMinutes() : "0" + d.getMinutes()
    } : ${
    d.getSeconds() > 9 ? d.getSeconds() : "0" + d.getSeconds()
    } - ${d.getMilliseconds()}`;
  const width = process.stdout.columns - 20;
  const equalizer = " ".repeat(width > 0 ? width : 70).slice(message.length);
  console.log(message + equalizer, date);
}
