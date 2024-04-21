var createError = require('http-errors');
var express = require('express');
var path = require('path');
const cors = require('cors');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const expressSession = require('express-session');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const flash = require('connect-flash');
const fileUpload = require('express-fileupload');
var app = express();


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(fileUpload({
  useTempFiles: true
}))
app.use(cors({
  origin: process.env.MONGO_URI,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204,
}));

app.use(flash());
app.use(expressSession({
  resave:false,
  saveUninitialized:false,
  secret: process.env.EXPRESS_SESSION_SECRET
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

app.all("*",function(req,res,next){
  res.status(404).json({success:false,message:`${req.url} route not found`});
})


app.listen(process.env.PORT,()=>{
  console.log( `Server running on PORT ${process.env.PORT}`);
})

module.exports = app;
