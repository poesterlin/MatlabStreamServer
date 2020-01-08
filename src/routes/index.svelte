<script>
  import io from "socket.io-client";

  $: history = [];
  const historyLength = 300;

  $: x = 0;
  $: y = 0;
  $: z = 0;
  $: message = "";
  $: log = [];

  const height = 300;
  $: barWidth = document.documentElement.clientWidth / historyLength;

  const socket = io();
  socket.on("results", results => {
    log.push(results);
    if (log.length === 10) {
      log.shift();
    }
    log = log;
  });

  function submit() {
    socket.emit("message", JSON.stringify(history));
  }

  if ("Accelerometer" in window) {
    let accelerometer = new Accelerometer({ frequency: 10 });

    accelerometer.addEventListener("reading", e => {
      x = accelerometer.x;
      y = accelerometer.y;
      z = accelerometer.z;
      update();
    });

    accelerometer.start();
  } else {
    Promise.resolve().then(() => {
      message += "no sensor suppport ";
    });
  }

  setTimeout(() => {
    if (x + y + z !== 0) {
      return;
    }
    message += "simulation mode ";
    const interval = 100;
    setInterval(() => {
      x = Math.random() * 10;
      update();
    }, interval);
    setInterval(() => {
      y = Math.random() * 10;
      update();
    }, interval);
    setInterval(() => {
      z = Math.random() * 10;
      update();
    }, interval);
  }, 100);

  function update() {
    history.push({ x, y, z });
    // if (history.length === historyLength) {
    //   history.shift();
    // }
    if (history.length === historyLength) {
      submit(history);
      history = [];
    }

    history = history;
  }

  function makeSVGPath(x, y) {
    return `L${x * barWidth} ${((y / max) * height) / 2 + height / 2}`;
  }

  const max = 40;
  $: xPath = `M0 ${height / 2} `.concat(
    history.map(({ x }, i) => makeSVGPath(i, x)).join(" ")
  );
  $: yPath = `M0 ${height / 2} `.concat(
    history.map(({ y }, i) => makeSVGPath(i, y)).join(" ")
  );
  $: zPath = `M0 ${height / 2} `.concat(
    history.map(({ z }, i) => makeSVGPath(i, z)).join(" ")
  );
</script>

<style>
  svg {
    width: 100vw;
    height: 300px;
  }
  .bars path {
    opacity: 0.4;
    stroke-width: 2px;
    fill: none;
  }

  .x {
    stroke: rgb(0, 0, 0);
  }
  .y {
    stroke: rgb(62, 119, 62);
  }
  .z {
    stroke: rgb(16, 126, 13);
  }
  h1,
  h4 {
    margin-left: 20px;
  }

  .logs {
    max-height: 30vh;
    width: 100vw;
    overflow: auto;
  }

  .log {
    white-space: nowrap;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>

{@debug barWidth}

<svelte:head>
  <title>AccTest</title>
</svelte:head>

<h1 style="color:red">{message}</h1>

<br />
<h3>Data:</h3>
<h4>X: {x}</h4>
<h4>Y: {y}</h4>
<h4>Z: {z}</h4>

<svg>
  <g class="bars">
    <path d={xPath} class="x" />
    <path d={yPath} class="y" />
    <path d={zPath} class="z" />
  </g>
</svg>

<div class="logs">
  Results:
  {#each log as l}
    <div class="log">{l}</div>
  {/each}
</div>
