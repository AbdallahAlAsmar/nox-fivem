import fs from "node:fs";
const s = fs.readFileSync("dist/assets/index-DVfBdmZA.js", "utf8");
const i = s.indexOf("oauth:callback");
console.log(s.slice(i - 1800, i + 200));
