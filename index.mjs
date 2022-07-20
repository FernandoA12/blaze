import puppeteer from "puppeteer";
import { fork } from "child_process";
import { recurrent } from "brain.js";
import fs from "fs";

const net = new recurrent.LSTM();
let err = 0;
let aposta = "";
let entries = [];

const cp = fork("./children.mjs");

const browser = await puppeteer.launch({
  headless: false,
  defaultViewport: {
    height: 1000,
    width: 1000,
  },
});
const page = await browser.newPage();

await page.goto("https://blaze.com/pt/games/double");
await page.waitForTimeout(2000);

entries = await getLastsEntries(page);

async function start() {
  let init = await getStatusRound("complete");
  while (!init) {
    init = await getStatusRound("complete");
  }
  computing();
}

async function computing() {
  const networkStateLoad = JSON.parse(
    fs.readFileSync("network_state.json", "utf-8")
  );
  if (networkStateLoad.sizes) {
    net.fromJSON(networkStateLoad);
  }
  const lastentries = await getLastsEntries(page);
  entries.push(lastentries[0]);
  net.train(
    entries.map((entry) => ({
      input: ["red", "white", "black"],
      output: entry,
    })),
    {
      callback: ({ error }) => (err = error),
      iterations: 10,
    }
  );

  aposta = net.run(["red", "white", "black"]);
  // const result = entries.reduce(
  //   (acc, color) => (acc += color === "red" ? 2 : color === "black" ? 1 : 3),
  //   0
  // );
  // aposta = result % 2 === 0 ? "red" : "black";

  const networkStateSave = net.toJSON();
  fs.writeFileSync(
    "network_state.json",
    JSON.stringify(networkStateSave, null, 2),
    "utf-8"
  );
  cp.send({ aposta, last: lastentries[0], entries, err });
  let reload = await getStatusRound("waiting");
  while (!reload) {
    reload = await getStatusRound("waiting");
  }
  start();
}

async function getLastsEntries(page) {
  return await page.evaluate(() => {
    const entries = Array.from(
      document.querySelector(".entries.main").children
    );
    return entries.map(
      (entry) => entry.children.item(0).children.item(0).classList["1"]
    );
  });
}

async function getStatusRound(status) {
  let init = false;
  while (!init) {
    const result = await page.evaluate(() => {
      const entries = document.getElementById("roulette").classList["1"];
      return entries;
    });
    init = result === status;
  }
  return true;
}

start();
