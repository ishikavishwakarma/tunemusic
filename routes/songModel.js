const mongoose = require('mongoose');

const songSchema = mongoose.Schema({
    title: {
        type: String,
        required: true
      },
     
      artistName: String,
      instagramId: String,
      youtubeChannel: String,
      isrcCode: String,
      upcCode: String,
      genre: String,
      subGenre: String,
      releaseDate: Date,
      audio: {
        type: String,
        required: true
      },
      posterUrl: String
})

const songModel = mongoose.model('song', songSchema)
module.exports = songModel