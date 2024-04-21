var express = require('express');
var router = express.Router();
const userModel = require("./users");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const cloudinary = require("cloudinary").v2;
require('dotenv').config({path:"./.env"})
const mongoose = require("mongoose");
var id3 = require("node-id3");
var crypto = require("crypto");
var multer = require("multer");
const { token } = require('morgan');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
/* GET home page. */
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});
router.get('/',isLoggedIn, async function(req, res, next) {
  const user = req.user;
  const loggedInUser = await userModel.findOne({ _id: user._id });
  res.render('index', { loggedInUser});
});
router.get("/register", async function (req, res, next) {
  res.render("register", { error: req.flash("error") });
});
const conn = mongoose.connection;
var gfsBucket, gfsBucketPoster;
conn.once("open", () => {
  gfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "audio",
  });
  gfsBucketPoster = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "poster",
  });
});
router.get("/uploadMusic",   function (req, res, next) {
  res.render("uploadmusic");
});
router.post(
  "/uploadMusic",
  upload.single("audio"), // Change to single file upload
  async function (req, res, next) {
    try {
      const RandomName = crypto.randomBytes(20).toString("hex");

      // Save audio track
      const audioFile = req.file;
      if (!audioFile) {
        return res.status(400).send("No audio file uploaded");
      }
      const audioReadStream = Readable.from(audioFile.buffer);
      audioReadStream.pipe(gfsBucket.openUploadStream(RandomName));

      // Upload poster image to Cloudinary
      const posterFile = req.files && req.files.poster;
      let posterUrl;
      if (posterFile) {
        const posterImage = posterFile[0];
        cloudinary.uploader.upload(posterImage.tempFilePath, async function (err, result) {
          if (err) {
            console.error("Error uploading poster image to Cloudinary:", err);
            throw err;
          }
          posterUrl = result.secure_url;

          // Create audio track entry
          await songModel.create({
            title: req.body.title || "Untitled",
            description: req.body.description || "",
            audioFilename: RandomName,
            posterUrl: posterUrl || "", // Empty string if no poster provided
          });

          res.send("Audio track uploaded successfully");
        });
      } else {
        // If no poster image provided
        await songModel.create({
          title: req.body.title || "Untitled",
          description: req.body.description || "",
          audioFilename: RandomName,
          posterUrl: "", // No poster provided
        });

        res.send("Audio track uploaded successfully");
      }
    } catch (error) {
      console.error("Error uploading audio track:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);
async function createAudioTrack(req, res, RandomName, posterUrl) {
  const { title, artistName, instagramId, youtubeChannel, isrcCode, upcCode, genre, subGenre, releaseDate } = req.body;

  await songModel.create({
    title: title,
    artistName: artistName,
    instagramId: instagramId,
    youtubeChannel: youtubeChannel,
    isrcCode: isrcCode,
    upcCode: upcCode,
    genre: genre,
    subGenre: subGenre,
    releaseDate: releaseDate,
    audioFilename: RandomName,
    posterUrl: posterUrl
  });

  res.send("Audio track uploaded successfully");
}

router.post("/register", async function (req, res, next) {
  try {
    if (!req.body.username || !req.body.email || !req.body.password) {
      req.flash("error", "All fields are required");
      return res.redirect("/login");
    }

    const { username, password, email } = req.body;
    const existingUserEmail = await userModel.findOne({ email });
    if (existingUserEmail) {
      req.flash("error", "This Email already exists");
      return res.redirect("/register");
    }
    const data = await userModel.create({ username, email, password });
    const token = await data.generateToken();
    res.cookie("token", token, { httpOnly: true }); // Set token as a cookie
    res.redirect("/"); // Redirect to / page
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while registering the user" });
  }
});
router.post("/login", async function (req, res, next) {
  try {
    const { email, password } = req.body;
    const userExist = await userModel.findOne({ email });
    if (!userExist) {
      req.flash("error", "Invalid credentials");
      console.log("user login nhi hai")
      return res.redirect("/login");
    }
    const user = await userExist.comparePassword(password);
    if (user) {
      if (userExist.role === "admin") {
        const token = await userExist.generateToken();
        res.cookie("token", token, { httpOnly: true }); // Set token as a cookie
        res.redirect("/register");
        console.log("admin")
      } else {
        console.log(token)
        console.log("user")
        res.redirect("/");
      }
    } else {
      req.flash("error", "Invalid credentials");
      console.log("Invalid credentials")
      return res.redirect("/login");
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while login" });
  }
});

router.get("/login", async function (req, res, next) {
  try {
    res.render("login", { error: req.flash("error") });
  } catch (error) {
    console.error("Error occurred while fetching data:", error);
    next(error);
  }
});
router.get('/logout', (req, res) => {
  try {
    res.clearCookie('token');
    res.redirect('/');
  } catch (err) {
    console.error("Error during logout:", err);
    res.status(500).send('Internal Server Error');
  }
});

function isLoggedIn(req, res, next) {
  const token = req.cookies.token;
  if (token == null) return res.redirect('/login');

  jwt.verify(token, process.env.JWT_SECRET_KEY , (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.redirect('/login');
      }
      return res.redirect('/login');
    }
    req.user = user;
    next();
  });
}

async function isAdmin(req, res, next) {
  const token = req.cookies.token;

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, user) => {
    if (err) return res.sendStatus(403);
    const userRole = await userModel.findById(user._id);
    if (userRole.role != 'admin') {
      res.status(400).json({ success: false, message: "only admin is allowed" });
      res.redirect('/login');
    } else {
      req.user = user;
      next();
    }
  });
}
module.exports = router;
