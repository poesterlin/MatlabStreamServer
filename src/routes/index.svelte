<script>
  import io from "socket.io-client";
  import { fade } from "svelte/transition";

  $: history = [];
  const historyLength = 20;

  $: x = 0;
  $: y = 0;
  $: z = 0;
  $: message = "";

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
	  Promise.resolve().then(()=>{
		  message += 'no sensor suppport '
	  })
  }

  setTimeout(() => {
    if (x + y + z !== 0) {
      return;
    }
    message += "simulation mode ";
    const inteval = 100;
    setInterval(() => {
      x = Math.random() * 10;
      update();
    }, inteval);
    setInterval(() => {
      y = Math.random() * 10;
      update();
    }, inteval);
    setInterval(() => {
      z = Math.random() * 10;
      update();
    }, inteval);
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

  const socket = io();

  function submit() {
    socket.emit("message", JSON.stringify(history));
  }

  const width = window.innerWidth * 0.8;
  const height = 500;
  $: innerWidth = width - 50;
  $: barWidth = innerWidth / historyLength;

  const max = 40;
  $: xPath = `M0 ${height / 2} `.concat(
    history
      .map(
        ({ x }, i) =>
          `L${i * barWidth} ${((x / max) * height) / 2 + height / 2}`
      )
      .join(" ")
  );
  $: yPath = `M0 ${height / 2} `.concat(
    history
      .map(
        ({ y }, i) =>
          `L${i * barWidth} ${((y / max) * height) / 2 + height / 2}`
      )
      .join(" ")
  );
  $: zPath = `M0 ${height / 2} `.concat(
    history
      .map(
        ({ z }, i) =>
          `L${i * barWidth} ${((z / max) * height) / 2 + height / 2}`
      )
      .join(" ")
  );
</script>

<style>
  svg {
    width: 80vw;
    height: 500px;
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

<svelte:head>
  <title>AccTest</title>
</svelte:head>

<h1 style="color:red">{message}</h1>

<h4>{x}</h4>
<h4>{y}</h4>
<h4>{z}</h4>

<svg>
  <g class="bars">
    <path d={xPath} class="x" />
    <path d={yPath} class="y" />
    <path d={zPath} class="z" />
  </g>
</svg>
