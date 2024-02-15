const express = require("express");
const { MongoClient } = require("mongodb");
const _ = require("lodash");
const helmet = require("helmet");
const session = require("express-session");
const cookieParser = require("cookie-parser");

const app = express();

app.use(cookieParser());
app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

const uri =
  "mongodb+srv://Mithra707:*Mithrajeeth*@cluster0.2gpt44h.mongodb.net";
const client = new MongoClient(uri);

let key = "";
let content = "";

const data = { notepad: "", showModal: false, error: "", lock: true };

app.use(helmet());
app.set("view engine", "ejs");
app.set("views", "pages");
app.use(express.static("pages"));
app.use(express.urlencoded({ extended: false }));

client
  .connect()
  .then(() => console.log("Connected to Database"))
  .catch((err) => console.error(err));

app.get("/favicon.ico", (req, res) => res.status(204));

app.get("/files", (req, res) => {
  res.render("files");
});
app
  .route("/message")
  .get((req, res) => res.redirect(key))
  .post(async (req, res) => {
    content = req.body.notepad;
    await client
      .db("Share-Note")
      .collection("Data")
      .updateOne({ _id: key }, { $set: { content } }, { upsert: true });
    res.redirect(key);
    key = "";
    content = "";
  });

app.get("/mod", (req, res) => {
  data["showModal"] = true;
  data["lock"] = false;
  res.redirect(key);
});

app.post("/lock", async (req, res) => {
  const password = req.body.pass;
  if (!password) {
    data["error"] = "Enter password";
    data["showModal"] = true;
  } else {
    data["error"] = "";
    data["showModal"] = false;
    await client
      .db("Share-Note")
      .collection("Lock")
      .updateOne({ _id: key }, { $set: { Pass: password } }, { upsert: true });
  }
  req.session.PageUnlocked = key;
  req.session.cookie.expires = new Date(Date.now() + 60 * 1000);
  req.session.cookie.maxAge = 60 * 1000;
  res.redirect(key);
});

app.get("/close", (req, res) => {
  data["showModal"] = false;
  data["error"] = "";
  res.redirect(key);
});

app.post("/unlock", async (req, res) => {
  const pass = req.body.passkey;
  const DBdata = await client
    .db("Share-Note")
    .collection("Lock")
    .findOne({ _id: key });
  if (pass === DBdata.Pass) {
    req.session.PageUnlocked = key;
    req.session.cookie.expires = new Date(Date.now() + 2 * 60 * 1000);
    req.session.cookie.maxAge = 60 * 1000;
    return res.redirect(key);
  } else {
    data["error"] = "Incorrect password";
    return res.redirect(key);
  }
});

app.use(async (req, res) => {
  key = req.url;
  if (key === "/") {
    data["showModal"] = false;
    data["error"] = "";
    const link = "/" + generateRandomKey();
    return res.redirect(link);
  }

  try {
    const containsData = await client
      .db("Share-Note")
      .collection("Data")
      .findOne({ _id: key });
    const isLocked = await client
      .db("Share-Note")
      .collection("Lock")
      .findOne({ _id: key });

    if (isLocked) {
      data["lock"] = false;
      if (!req.session.PageUnlocked || key !== req.session.PageUnlocked) {
        return res.render("unLock", data);
      }
    } else {
      if (data["showModal"]) {
        data["lock"] = false;
      } else {
        data["lock"] = true;
      }
    }

    data["notepad"] = containsData ? containsData.content : "";
    res.render("index", data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(3000, () => console.log("Running on port 3000"));

function generateRandomKey() {
  const characters = "abcdefghijklmnopqrstuvwxyz@#";
  return _.times(7, () => _.sample(characters)).join("");
}
