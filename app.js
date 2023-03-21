//jshint esversion:6
require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
// const encrypt = require('mongoose-encryption');
// const md5 = require('md5');
const bcrypt = require('bcrypt');

const app = express();

const saltRounds = 10;
const port = process.env.PORT || 3000;

// middlewares

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));

// database connection

mongoose.connect("mongodb://localhost:27017/userDB")
.then(()=>console.log(`connection sucessful to db`))
.catch((err)=>console.log(err));

// db schema

const userSchema = new mongoose.Schema({
    email : {
        type:String,
        required:true,
        unique:[true,"Email id already present"]
    },
    password : {
        type : String,
        required : true
    }
});

// const secret = "Thisisourlittlesecret";

// userSchema.plugin(encrypt,{secret:process.env.SECRET, encryptedFields:["password"]});

// db model

const User = new mongoose.model("User",userSchema);

// routes

app.get("/",async(req,res)=>{
    res.render("home");
});

app.route("/login")
.get(async(req,res)=>{ 
    res.render("login");
})
.post(async(req,res)=>{
    const username = req.body.username;
    const password = req.body.password;

    const foundUser = await User.findOne({email : username});

    bcrypt.compare(password,foundUser.password,function (err, result) {
        if (result === true) {
            res.render("secrets");
        }
    });
});

app.route("/register")
.get( async(req,res)=>{
    res.render("register");
})
.post(async(req,res)=>{
    const userPassword = req.body.password;
    bcrypt.hash(userPassword, saltRounds, function(err, hash) {
        const newUser = new User({
            email : req.body.username,
            password : hash
        });
    
        newUser.save()
        .then(()=>{
            res.render("secrets")
        })
        .catch((err)=>console.log(err));
    
    });
    
    
});

app.listen(port,()=>{
    console.log(`app is running on the port ${port}`);
})
