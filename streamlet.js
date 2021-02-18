const fs = require("fs")
const beginStream = require("./stream.js");

const sKey = fs.readFileSync("./stream_key.txt", 'utf8').trim()
console.log(sKey);

const ingestServer = require("./ingest_servers.json").youtube.main.replace("%d", sKey);

const str = `-f flv ${ingestServer}`;
beginStream(str);