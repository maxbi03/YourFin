// Résumé compact des problèmes ESLint (une ligne par problème) :
//   npx eslint src --format json | node scripts/lint-report.mjs
let s = "";
process.stdin.on("data", (d) => (s += d)).on("end", () => {
  const results = JSON.parse(s);
  let count = 0;
  for (const f of results) {
    for (const m of f.messages) {
      const file = f.filePath.replace(/\\/g, "/").split("/YourFin/").pop();
      console.log(`${file}:${m.line} [${m.severity === 2 ? "E" : "W"}] ${m.ruleId} — ${m.message.split("\n")[0].slice(0, 110)}`);
      count++;
    }
  }
  console.log(`${count} problème(s)`);
});
