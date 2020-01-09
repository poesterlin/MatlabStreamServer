import sirv from "sirv";
import polka from "polka";
import compression from "compression";
import * as sapper from "@sapper/server";
import io from "socket.io";
import {
  writeFile,
  readdirSync,
  unlinkSync,
  readFileSync,
  appendFileSync,
  writeFileSync
} from "fs";
import { join } from "path";
import { createServer } from "https";
import * as http from "http";

const { PORT, NODE_ENV } = process.env;
const dev = NODE_ENV === "development";

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

const app = polka()
  .get("/csv", (req, res) => {
    res.end(readFileSync(join("csv", "file.csv")));
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

const server = create(options, app.handler).listen(PORT, err => {
  if (err) throw err;
  console.log(`> Running on port ${PORT}`);
});

app.get("/csv", (req, res) => {
  console.log("csv", res.sendFile);
  res.sendFile("csv/file.csv");
});

resetFile("");

let lastTs = 0;

const socket = io(server);
socket.on("connection", function(socket) {
  socket.on("message", function(data) {
    const newData = JSON.parse(data);
    lastTs += newData.length;

    const csv = newData
      .map((line, i) => `${(i + lastTs) * 100},${line.x},${line.y},${line.z}`)
      .join("\n");
    if (lastTs > 600) {
      resetFile(csv);
    }
    appendFileSync(join("csv", "file.csv"), "\n" + csv);
  });
});

function resetFile(csv) {
  const header = "time x y z\n";
  writeFileSync(join("csv", "file.csv"), header + csv);
  console.log("reset files");
}
