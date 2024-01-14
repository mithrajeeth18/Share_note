const _ = require("lodash");

function generateRandomKey(length) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#@";
  const randomKey = _.times(length, () => _.sample(characters)).join("");
  return randomKey;
}

const link = "/" + generateRandomKey(5);
module.exports = link;
