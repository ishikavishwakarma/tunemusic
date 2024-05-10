var express = require('express');
var router = express.Router();
const userModel = require("./users");
const songModel = require("./songModel");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const cloudinary = require("cloudinary").v2;
require('dotenv').config({path:"./.env"})
const { token } = require('morgan');

/* GET home page. */
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

router.get('/', async function(req, res, next) {
  res.render('index');
});
router.get('/UserHome',isLoggedIn, async function(req, res, next) {
  const user = req.user;
  const loggedInUser = await userModel.findOne({ _id: user._id }).populate('songs');
  const recentSong = await songModel.findOne({ status: 'approve' }).sort({ createdAt: -1 }).limit(1).populate("userid");
  res.render('userAdmin',{loggedInUser, recentSong});
});
router.get("/register", async function (req, res, next) {
  res.render("register", { error: req.flash("error") });
});

router.get("/uploadMusic", isLoggedIn, async function (req, res, next) {
  const user = req.user;
  const loggedInUser = await userModel.findOne({ _id: user._id });

  res.render("uploadmusic",{ loggedInUser});
});


router.get('/home',isAdmin, async(req, res) => {
  const adminuser = req.user;
  const admin = await userModel.findOne({ _id: adminuser._id });
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
    const adminuser = req.user;
    const admin = await userModel.findOne({ _id: adminuser._id });
    const users = await userModel.find({ role: { $ne: "admin" } });
    res.render('adminSongs',{admin,songs,users})
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
router.get('/packages', async(req, res) => {
  try {
   res.render('packages')
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
router.get('/terms', async(req, res) => {
  try {
   res.render('terms')
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
router.get('/allusers',isAdmin, async(req, res) => {

  try {
    const songs = await songModel.find({ status: { $ne: 'approve' } });
    const adminuser = req.user;
    const admin = await userModel.findOne({ _id: adminuser._id });
    const users = await userModel.find({ role: { $ne: "admin" } }).populate('songs');
    res.render('allusers',{admin,songs,users})
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
router.post('/approve-song/:id',isAdmin, async (req, res) => {
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

router.get('/deletesong/:id',isAdmin, async (req, res) => {
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
router.post('/reject-song/:id',isAdmin, async (req, res) => {
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
    const adminuser = req.user;
    const admin = await userModel.findOne({ _id: adminuser._id });
    const users = await userModel.find({ role: { $ne: "admin" } });
    res.render('approvesongs',{admin,songs,users})
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.get('/adminsongs/:id',isAdmin, async(req, res) => {
  const adminuser = req.user;
  const admin = await userModel.findOne({ _id: adminuser._id });
  const song = await songModel.findOne({_id: req.params.id}).populate('userid')
  res.render('singleSong',{admin,song})
});
router.get('/usersongs/:id',isLoggedIn, async(req, res) => {
  const user = req.user;
  const loggedInUser = await userModel.findOne({ _id: user._id });
  const song = await songModel.findOne({_id: req.params.id}).populate('userid')
  res.render('usersingle',{loggedInUser,song})
});
router.post('/updateprofile', isLoggedIn, async function (req, res, next) {
  try {
    if (req.files && req.files.image) {
      const image = req.files.image;

      // Upload new image to Cloudinary
      const cloudinaryResult = await cloudinary.uploader.upload(image.tempFilePath);
      const user = req.user;
      // Update user details with the new image URL
      const loggedInUser = await userModel.findOneAndUpdate(
        { _id: user._id },
        {
          name: req.body.name,
          email: req.body.email,
          contact: req.body.contact,
          image: cloudinaryResult.secure_url, // Set as a new array with only the new image
        },
        { new: true }
      );
      // Delete old image from Cloudinary if there was a previous image
      if (loggedInUser.image.length > 0) {
        await cloudinary.uploader.destroy(loggedInUser.image[0]);
      }
    } else {
      const user = req.user;
      // No new image uploaded, update user details without changing the image
      const loggedInUser = await userModel.findOneAndUpdate(
        { _id: user._id },
        {
          name: req.body.name,
          email: req.body.email,
          contact: req.body.contact,
        },
        { new: true }
      );
    }

    req.flash('success', 'User details updated successfully');
    res.redirect('/userprofile');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Error updating user details');
  }
});
router.get('/userprofile',isLoggedIn, async(req, res) => {
  const user = req.user;
  const loggedInUser = await userModel.findOne({ _id: user._id });
  const song = await songModel.findOne({_id: req.params.id}).populate('userid')
  res.render('userProfile',{loggedInUser,song})
});
router.get('/editprofile',isLoggedIn, async(req, res) => {
  const user = req.user;
  const loggedInUser = await userModel.findOne({ _id: user._id });
  const song = await songModel.findOne({_id: req.params.id}).populate('userid')
  res.render('editprofile',{loggedInUser,song})
});

router.get('/songs',isLoggedIn,async (req, res) => {
  const user = req.user;
  const loggedInUser = await userModel.findOne({ _id: user._id }).populate('songs');
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
    res.redirect('/songs');
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
    res.redirect("/UserHome"); // Redirect to / page
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
        res.redirect('/UserHome');
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
