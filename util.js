// default packages
const util = require("util");
const fs = require("fs");
const readline = require("readline");
const path = require("path");

const chalk = require("chalk");

const verb = chalk.green;
const warn = chalk.keyword("orange");
const cerr = chalk.red;

// gets the next lowest suffix for file naming
const getFileName = (_dir, _name, _includeDir, _startIndex) => {
  let name = _name.split(".")[0];
  let ext = _name.split(".")[1];
  let num = _startIndex || 0;
  _includeDir = _includeDir || false;

  let fullPath;
  do {
    fullPath = path.join(_dir, `${name}_${num++}.${ext}`);
  } while (fs.existsSync(`.${fullPath}`));
  let fName = path.relative(_dir, fullPath);
  return _includeDir ? path.join(_dir, fName) : fName;
};

const prompt = async (_q, _warn) => {
  return await new Promise((resolve, reject) => {
    let input;
    // setup readline
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.on("line", (data) => {
      input = data;
      rl.close();
    });

    rl.on("close", () => {
      resolve(input);
    });

    rl.setPrompt(_q);
    rl.prompt();
  });
};

module.exports = {
  prompt,
  getFileName,
};
