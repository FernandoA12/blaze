process.on("message", handler);

let lastEntry = "";
let loss = 0;
let gain = 0;

function handler({ aposta, last, entries, err }) {
  if (lastEntry !== "") {
    if (last === lastEntry) {
      gain++;
    } else {
      loss++;
    }
  }
  lastEntry = aposta;
  console.clear();
  console.log({
    loss,
    gain,
    aposta,
    totalRodadas: loss + gain,
    acertividade:
      gain === 0 && loss === 0
        ? 0.0
        : ((gain * 100) / (loss + gain)).toFixed(2),
    entries: entries.length,
    errorPercente: err,
  });
}
