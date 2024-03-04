const express = require("express");
const { MongoClient, GridFSBucket } = require("mongodb");
const _ = require("lodash");
const helmet = require("helmet");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const multer = require("multer");
const { Readable } = require("stream");
const path = require("path");
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
let randomKey = "";
const data = {
  notepad: "",
  showModal: false,
  error: "",
  lock: true,
  Filestatus: "",
  Filekey: "",
};

app.use(helmet());
app.set("view engine", "ejs");
app.set("views", "pages");
app.use(express.static("pages"));
app.use(express.urlencoded({ extended: false }));

function encrypt(text, key) {
  const cipher = crypto.createCipher("aes-256-cbc", key);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

function decrypt(encryptedText, key) {
  const decipher = crypto.createDecipher("aes-256-cbc", key);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

app.get("/favicon.ico", (req, res) => res.status(204));

app.get("/files", (req, res) => {
  res.render("filesSend", data);
});
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

let gfs;

client
  .connect()
  .then(() => {
    console.log("Connected to Database");
    gfs = new GridFSBucket(client.db("Share-Note"), {
      bucketName: "uploads",
    });
    console.log("GridFSBucket initialized");
  })
  .catch((err) => console.error(err));

app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded");
  }

  const fileData = req.file.buffer;
  const originalFilename = req.file.originalname; // Get the original filename
  const fileExtension = path.extname(originalFilename).toLowerCase(); // Extract the file extension
  console.log(originalFilename);
  randomKey = generateRandomKey();

  const readableStream = new Readable();
  readableStream.push(fileData);
  readableStream.push(null);

  const uploadStream = gfs.openUploadStream(randomKey, {
    metadata: { originalFilename },
  });
  const id = uploadStream.id;

  readableStream
    .pipe(uploadStream)
    .on("error", (err) => {
      console.error("Error uploading file to GridFS:", err);
      res.status(500).send("Internal Server Error");
    })
    .on("finish", async () => {
      console.log("File uploaded successfully");

      await client.db("Share-Note").collection("FileKeys").insertOne({
        _id: randomKey,
        fileId: id,
        originalFilename: originalFilename,
      });
      data["Filekey"] = randomKey;
      data["Filestatus"] = "File uploaded successfully";
      res.redirect("/files");
    });
});

app.get("/recive", (req, res) => {
  res.render("filesRecive");
});

app.get("/download", async (req, res) => {
  const f_key = req.query.Filekey;
  try {
    const fileRecord = await client
      .db("Share-Note")
      .collection("FileKeys")
      .findOne({ _id: f_key });

    if (!fileRecord) {
      return res.status(404).send("File not found");
    }

    const Filename = fileRecord.originalFilename;
    const fileid = fileRecord.fileId;
    const downloadStream = gfs.openDownloadStream(fileid);
    res.set("Content-Disposition", `attachment; filename=${Filename}`);
    downloadStream.pipe(res);
~``  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app
  .route("/message")
  .get((req, res) => res.redirect(key))
  .post(async (req, res) => {
    content = req.body.notepad;
    const encryptedContent = encrypt(content, "your_encryption_key");
    await client
      .db("Share-Note")
      .collection("Data")
      .updateOne(
        { _id: key },
        { $set: { content: encryptedContent } },
        { upsert: true }
      );
    res.redirect(key);
    key = "";
    content = "";
  });

app.post("/mod", (req, res) => {
  data["showModal"] = true;
  data["lock"] = false;
  return res.redirect(key);
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

    data["notepad"] = containsData
      ? decrypt(containsData.content, "your_encryption_key")
      : "";

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
