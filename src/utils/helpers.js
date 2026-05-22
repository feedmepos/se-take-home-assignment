const { time } = require("../utils/time");
const fs = require("fs");
const path = require("path");

const resultFile = path.join(__dirname, "..", "../scripts/result.txt");

function initLog() 
{
    fs.writeFileSync(resultFile, "");
}

function padTrio(number) 
{
    if (number < 0) throw new Error("Number cannot be negative");
    return number.toString().padStart(3, "0");
}

function log(message, init = false) 
{
    const timestamped = init ? message :'['+time()+'] '+message;
    console.log(timestamped);
    fs.appendFileSync(resultFile, timestamped + "\n");
}

module.exports = { padTrio, log, initLog };
