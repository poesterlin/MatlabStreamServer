<script>
  import io from "socket.io-client";

  $: history = [];
  let updateIdx = 0;
  const historyLength = 100;

  $: x = 0;
  $: y = 0;
  $: z = 0;
  $: message = "";
  $: log = [];

  const height = 300;
  $: barWidth = document.documentElement.clientWidth / historyLength;

  const socket = io();

  function submit(h) {
    socket.emit("message", JSON.stringify(h));
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
  }, 1000);

  function update() {
    history.push({ x, y, z });
    updateIdx++;
    if (history.length === historyLength) {
      history.shift();
    }
    if (updateIdx % 20 === 0) {
      submit(history.slice(-20));
      updateIdx = 0;
    }

    history = history;
  }

  function makeSVGPath(x, y) {
    return `L${x * barWidth} ${((y / max) * height) / 2 + height / 2}`;
  }

  const max = 20;
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
