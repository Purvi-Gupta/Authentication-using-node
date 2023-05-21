//jshint esversion:6
require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github').Strategy;
// const findOrCreate = require('mongoose-findorcreate');

const app = express();

// const saltRounds = 10;
const port = process.env.PORT || 3000;

// middlewares

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
    secret:"our little secret.",
    resave:false,
    saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());    

// database connection

mongoose.connect("mongodb://127.0.0.1:27017/userDB")
.then(()=>console.log(`connection sucessful to db`))
.catch((err)=>console.log(err + "error"));

// db schema

const userSchema = new mongoose.Schema({
    username : String,
    password : String,
    googleId : String,
    githubId : String,
    secret : String
});

userSchema.plugin(passportLocalMongoose);
// userSchema.plugin(findOrCreate);

// db model

const User = mongoose.model('Users', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username, name: user.name });
    });
  });

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/google/secrets'
  },  async function (accessToken, refreshToken, profile, cb) {
    try {
      console.log(profile);
      // Find or create user in your database
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        // Create new user in database
        const username = Array.isArray(profile.emails) && profile.emails.length > 0 ? profile.emails[0].value.split('@')[0] : '';
        const newUser = new User({
          username: profile.displayName,
          googleId: profile.id
        });
        user = await newUser.save();
      }
      return cb(null, user);
    } catch (err) {
      return cb(err);
    }
  }

));

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/github/secrets"
},
async function (accessToken, refreshToken, profile, cb) {
  try {
    console.log(profile);
    // Find or create user in your database
    let user = await User.findOne({ githubId: profile.id });
    if (!user) {
      // Create new user in database
      const username = Array.isArray(profile.emails) && profile.emails.length > 0 ? profile.emails[0].value.split('@')[0] : '';
      const newUser = new User({
        username: profile.username,
        githubId: profile.id
      });
      user = await newUser.save();
    }
    return cb(null, user);
  } catch (err) {
    return cb(err);
  }
}
));

// routes

app.get("/",async(req,res)=>{
    res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ["profile"] })
  );

app.get('/auth/google/secrets', 
 passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect sectets.
    res.redirect('/secrets');
  });

app.get('/auth/github',
  passport.authenticate('github',{ scope: ["profile"]}));

app.get('/auth/github/secrets', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.route("/login")
.get(async(req,res)=>{ 
    res.render("login");
})
.post(async(req,res)=>{
    const user = new User({
        username : req.body.username,
        password : req.body.password
    });

    req.login(user,(err)=>{
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local",{failureRedirect: '/login'})(req,res,()=>{
                res.redirect("/secrets")
            })
        }
    })
});

app.route("/register")
.get( async(req,res)=>{
    res.render("register");
})

.post(async(req,res)=>{ 

   User.register({username:req.body.username, active: false},req.body.password , function(err, user) {
    if (err) {
         console.log(err); 
         res.redirect("/register")
        }
    else{
        passport.authenticate('local')(req,res,()=>{
            res.redirect("/secrets");
        });
    }

  });
});

app.route("/secrets")
.get(async(req,res)=>{
  try {
    const foundUsers = await User.find({secret:{$ne:"null"}});
    if (foundUsers) {
      res.render("secrets",{userWithSecrets:foundUsers});
    } else {
      console.log(err);
    }
  } catch (error) {
    console.log(error);
  }

});

app.route("/submit")
.get((req,res)=>{
  if (req.isAuthenticated()) {
    res.render("submit");
} else {
    res.redirect("/login");
}
})
.post(async(req,res)=>{
  const submittedSecret = req.body.secret;
  console.log(req.user.id);

  try {
    const founduser = await User.findById(req.user.id);
    if (founduser) {
      founduser.secret = submittedSecret;
      const saveSecret = await founduser.save();
      if (saveSecret) {
        res.redirect("/secrets");
      }
    } else {
      console.log(err);
    }
    
  } catch (error) {
    console.log(error);
  }

})

app.get("/logout",(req,res)=>{

    req.logout(err=>console.log(err));
    res.redirect("/");
})

app.listen(port,()=>{
    console.log(`app is running on the port ${port}`);
})
