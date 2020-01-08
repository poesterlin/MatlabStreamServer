import sirv from "sirv";
import polka from "polka";
import compression from "compression";
import * as sapper from "@sapper/server";
import http from "http";
import io from "socket.io";
import tmp from "tmp";
import { writeFile, readdirSync, unlinkSync } from "fs";
import { spawn } from "child_process";
import { join } from "path";
// import * as onnx from "onnxjs-node";

const { PORT, NODE_ENV } = process.env;
const dev = NODE_ENV === "development";
const server = http.createServer();
const tmpDir = "csv";

cleanTemp();

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

polka({ server })
  .use(
    compression({ threshold: 0 }),
    sirv("static", { dev }),
    sapper.middleware()
  )
  .listen(PORT, err => {
    if (err) console.log("error", err);
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


// const session = new onnx.InferenceSession({backendHint: 'wasm'});
// const session = new onnx.InferenceSession();

// setupModel().then(predict)

// async function setupModel() {
//   // use the following in an async method
//   const url = "./test.onnx";
//   await session.loadModel(url);
// }

// async function predict() {
//   const inputs = [
//     new onnx.Tensor(new Float32Array([1.0, 2.0, 3.0, 4.0]), "float32", [2, 2])
//   ];
//   const outputMap = await session.run(inputs);
//   const outputTensor = outputMap.values().next().value;
// }