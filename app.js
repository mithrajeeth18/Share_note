const express = require("express");
const app = express();
const link = require("./send");

let a = {};
let key = "";
let content = "";
let data = { notepad: "" };

app.set("view engine", "ejs");
app.set("views", "pages");
app.use(express.static("pages"));
app.use(express.urlencoded({ extended: false }));

// Disable favicon request
app.get("/favicon.ico", (req, res) => res.status(204));

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
    res.redirect("hello");
  }
  if (key in a) {
    data["notepad"] = a[key];
    res.render("index", data);
  } else {
    res.render("index", { notepad: "" });
  }

  console.log(a);
});

app.listen(3000, () => {
  console.log("Running on port 3000");
});
