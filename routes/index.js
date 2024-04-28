var express = require('express');
var router = express.Router();
const userModel = require("./users");
const songModel = require("./songModel");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const cloudinary = require("cloudinary").v2;
require('dotenv').config({path:"./.env"})
const mongoose = require("mongoose");
const { Readable } = require("stream");
var id3 = require("node-id3");
var crypto = require("crypto");
const formidable = require("formidable");
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
const conn = mongoose.connection
var gfsBucket 
//  gfs
conn.once('open',()=>{
 gfsBucket = new mongoose.mongo.GridFSBucket(conn.db,{
  bucketName:"audioSongs"
 })
})
router.get("/uploadMusic", isLoggedIn,  function (req, res, next) {
  res.render("uploadmusic");
});
// router.post('/uploadMusic', upload.single('audio'), isLoggedIn, async (req, res) => {
//   try {
//     const RandomName = crypto.randomBytes(20).toString('hex');

//     // Save audio track
//     const audioFile = req.file;
//     if (!audioFile) {
//       return res.status(400).send('No audio file uploaded');
//     }
//     const audioReadStream = Readable.from(audioFile.buffer);
//     audioReadStream.pipe(gfsBucket.openUploadStream(RandomName));

//     // Upload poster image to Cloudinary
//     const posterFile = req.files && req.files.poster;
//     let posterUrl;
//     if (posterFile) {
//       const posterImage = posterFile[0];
//       const posterUploadResult = await cloudinary.uploader.upload({
//         resource_type: 'image',
//         folder: 'audio_posters'
//       }, (error, result) => {
//         if (error) {
//           console.error('Error uploading poster image to Cloudinary:', error);
//           throw error;
//         }
//         posterUrl = result.secure_url;

//         // Create audio track entry
//         createAudioTrack(req, res, RandomName, posterUrl);
//       });
//       Readable.from(posterImage.buffer).pipe(posterUploadResult);
//     } else {
//       // If no poster image provided
//       createAudioTrack(req, res, RandomName, '');
//     }
//   } catch (error) {
//     console.error('Error uploading audio track:', error);
//     res.status(500).send('Internal Server Error');
//   }
// });
// router.post('/uploadMusic', upload.fields([{ name: 'song', maxCount: 1 }, { name: 'posterUrl', maxCount: 1 }]), async function(req, res, next) {
//   try {
//     // Check if audio file is uploaded
//     if (!req.files || !req.files.song || req.files.song.length === 0) {
//       return res.status(400).send('No audio file uploaded.');
//     }

//     // Handle audio upload to GridFS
//     const audioFile = req.files.song[0]; // Access the uploaded audio file
//     const audioUploadStream = gfsBucket.openUploadStream();
//     Readable.from(audioFile.buffer).pipe(audioUploadStream);

//     audioUploadStream.on('error', (error) => {
//       console.error('Error uploading audio to GridFS:', error);
//       res.status(500).send('Error uploading audio.');
//     });

//     audioUploadStream.on('finish', async () => {
//       console.log('Audio uploaded to GridFS successfully.');
      
//       // Upload image to Cloudinary if provided
//       if (req.files.posterUrl && req.files.posterUrl.length > 0) {
//         const imageFile = req.files.posterUrl; // Access the uploaded image file

//         cloudinary.uploader.upload(imageFile.tempFilePath, async function(error, result) {
//           if (error) {
//             console.error('Error uploading image to Cloudinary:', error);
//             return res.status(500).send('Error uploading image.');
//           }

//           const newSong = new songModel({
//             posterUrl: result.secure_url
//           });
//           await newSong.save();
//           console.log('Image uploaded to Cloudinary:', result);
//           res.send('Audio and image uploaded successfully.');
//         });
//       } else {
//         res.send('Audio uploaded successfully.');
//       }
//     });
//   } catch (error) {
//     console.error('Error handling upload:', error);
//     res.status(500).send('Error handling upload.');
//   }
// });
router.get('/home',isAdmin, async(req, res) => {
  const admin = await userModel.findOne({ role: "admin" });
  const songs = await songModel.find()
  const requests = await songModel.find({ status: { $ne: 'approve' } });
  const request = await songModel.find({ status: { $ne: 'approve' } }).limit(3);
  const users = await userModel.find({ role: { $ne: "admin" } });
  const user = await userModel.find({ role: { $ne: "admin" } }).limit(3);
  res.render('home',{admin,songs,users,user,request,requests})
});
router.get('/requestsongs',isAdmin, async(req, res) => {

  try {
    const songs = await songModel.find({ status: { $ne: 'approve' } });
    const admin = await userModel.findOne({ role: "admin" });
    const users = await userModel.find({ role: { $ne: "admin" } });
    res.render('adminSongs',{admin,songs,users})
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
router.post('/approve-song/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Find the song by ID and update its status
    const song = await songModel.findByIdAndUpdate(id, { status: 'approve' });
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }
    // Redirect to the /adminsongs route after updating the status
    res.json({ redirectTo: '/adminsongs' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.get('/deletesong/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Find the song by ID and delete it
    const deletedSong = await songModel.findByIdAndDelete(id);

    // If the song is deleted successfully, remove its ID from the associated user's songs array
    if (deletedSong) {
      const users = await userModel.find({ songs: id }); // Find users with this song in their songs array
      for (const user of users) {
        user.songs.pull(id); // Remove the song ID from the user's songs array
        await user.save(); // Save the user
      }
    }
    res.redirect('/adminsongs');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
router.post('/reject-song/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Find the song by ID and update its status
    const song = await songModel.findByIdAndUpdate(id, { status: 'reject' });
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }
    // Redirect to the /adminsongs route after updating the status
    res.json({ redirectTo: '/adminsongs' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.get('/adminsongs',isAdmin, async(req, res) => {
  
  try {
    const songs = await songModel.find({ status: 'approve' });
    const admin = await userModel.findOne({ role: "admin" });
    const users = await userModel.find({ role: { $ne: "admin" } });
    res.render('approvesongs',{admin,songs,users})
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
router.get('/adminsongs/:id',isAdmin, async(req, res) => {
  const admin = await userModel.findOne({ role: "admin" });
  const song = await songModel.findOne({_id: req.params.id}).populate('userid')
  res.render('singleSong',{admin,song})
});

router.get('/songs',isLoggedIn,async (req, res) => {
  const user = req.user;
  const loggedInUser = await userModel.findOne({ _id: user._id });
  res.render('userSongs', { loggedInUser})
});
router.post('/uploadMusic',isLoggedIn, async (req, res) => {
  try {
    const audioFile = req.files.filename;
    const imageFile = req.files.posterUrl;
    const user = req.user;
    const loggedInUser = await userModel.findOne({ _id: user._id });
    // Upload audio file to Cloudinary
    const audioResult = await cloudinary.uploader.upload(audioFile.tempFilePath, {
      resource_type: "video" // specify the resource type as "video" to ensure audio files are processed correctly
    });
    // Upload image file to Cloudinary
    const imageResult = await cloudinary.uploader.upload(imageFile.tempFilePath);
    // Save URLs to MongoDB
    const newMedia = new songModel({
      title:req.body.title,
      userid:loggedInUser.id,
      artistName:req.body.artistName,
      instagramId:req.body.instagramId,
      isrcCode:req.body.isrcCode,
      upcCode:req.body.upcCode,
      releaseDate:req.body.releaseDate,
      genre:req.body.genre,
      filename: audioResult.secure_url,
      posterUrl: imageResult.secure_url
    });
    await newMedia.save();
    await loggedInUser.songs.push(newMedia._id)
    await loggedInUser.save()
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.get('/stream/:id', async (req, res) => {
  try {
    const song = await songModel.findById(req.params.id);
    if (!song) {
      return res.status(404).send('Song not found');
    }

    // Redirect to the Cloudinary URL of the audio file for streaming
    res.redirect(song.filename);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
// async function createAudioTrack(req, res, RandomName, posterUrl) {
//   // const { title, artistName, instagramId, youtubeChannel, isrcCode, upcCode, genre, subGenre, releaseDate } = req.body;

//   await songModel.create({
//     // title: title,
//     // artistName: artistName,
//     // instagramId: instagramId,
//     // youtubeChannel: youtubeChannel,
//     // isrcCode: isrcCode,
//     // upcCode: upcCode,
//     // genre: genre,
//     // subGenre: subGenre,
//     // releaseDate: releaseDate,
//     audio: RandomName,
//     posterUrl: posterUrl
//   });

//   res.send("Audio track uploaded successfully");
// }

router.post("/register", async function (req, res, next) {
  try {
    if (!req.body.username || !req.body.email || !req.body.password) {
      req.flash("error", "All fields are required");
      return res.redirect("/login");
    }

    const { username,name, password, email } = req.body;
    const existingUserEmail = await userModel.findOne({ email });
    if (existingUserEmail) {
      req.flash("error", "This Email already exists");
      return res.redirect("/register");
    }
    const data = await userModel.create({ username,name, email, password });
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
router.post('/login', async function (req, res, next) {
  try {
    const { email, password } = req.body;
    const userExist = await userModel.findOne({ email });
    if (!userExist) {
      req.flash('error', 'Invalid credentials');
      return res.redirect('/login');
    }

    const user = await userExist.comparePassword(password);
    // user contains true/false
    if (user) {
     
      const token = await userExist.generateToken();
      res.cookie('token', token, { 
        httpOnly: true,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }); // Set token as a cookie

      if (userExist.role === 'admin') {
        res.redirect('/home');
      } else {
        res.redirect('/');
      }

    } else {
      req.flash('error', 'Invalid credentials');
      return res.redirect('/login');
    }
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while login' });
  };

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
