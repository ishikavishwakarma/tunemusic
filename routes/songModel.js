const mongoose = require('mongoose');

const songSchema = mongoose.Schema({
    title: {
        type: String,
        required: true
      },
      userid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
      artistName: String,
      instagramId: String,
      youtubeChannel: String,
      isrcCode: String,
      upcCode: String,
      genre: String,
      subGenre: String,
      releaseDate: Date,
      filename: {
        type: String,
       
      },
      posterUrl: String,
      status:{
        type:String,
        enum:["reject","approve","pending"],
        default:"pending",
      }
})

const songModel = mongoose.model('song', songSchema)
module.exports = songModel