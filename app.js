const express = require("express");
const app = express();
const _ = require("lodash");
const helmet = require("helmet");

let a = {};
let key = "";
let content = "";
let data = { notepad: "" };

app.use(helmet());

app.set("view engine", "ejs");
app.set("views", "pages");
app.use(express.static("pages"));
app.use(express.urlencoded({ extended: false }));

// Disable favicon request
app.get("/favicon.ico", (req, res) => res.status(204));

function generateRandomKey() {
  const characters = "abcdefghijklmnopqrstuvwxyz@#";
  const randomKey = _.times(6, () => _.sample(characters)).join("");
  return randomKey;
}

app
  .route("/message")
  .get((req, res) => {
    res.redirect(key);
  })
  .post((req, res) => {
    content = req.body.notepad;
    a[key] = content;
    res.redirect(key);
    key = "";
    content = "";
  });

app.use((req, res) => {
  key = req.url;
  if (key === "/") {
    var link = "/" + generateRandomKey();
    return res.redirect(link);
  }
  if (key in a) {
    data["notepad"] = a[key];
    return res.render("index", data);
  } else {
    return res.render("index", { notepad: "" });
  }
});

app.listen(3000, () => {
  //console.log("Running on port 3000");
});
