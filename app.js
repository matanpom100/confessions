//jshint esversion:6
require('dotenv').config();//מצפין את שיטת ההצפנה
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const md5 = require("md5");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();



app.use(express.static("public"));// - באמצעות זה css קבצים שמשודרים כקבצים סטטיים באתר- אפשר לארח  "public"  מגדיר את תיקיית 
app.set('view engine', 'ejs');

//jsonהופך את הנתונים שאני שולח בבקשת פוסט ל 
app.use(bodyParser.urlencoded({
    extended: true
}));

//לשמור את נתוני המשתמש על הדאטאבייס שלנו במקום על המחשב שלו
app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());//מאפשרת לפספורט להשתמש בסשן



//מתחבר לדאטאבייס שאנחנו רוצים ליצור 
mongoose.connect("mongodb://127.0.0.1/userDB", { useNewUrlParser: true });


//סכמת המשתמש, כלומר איך יראה הקובץ של המשתמש
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    secret: String,
    counter: Number
});

userSchema.plugin(passportLocalMongoose);//מאפשר לאחסן את הסיסמאות המוצפנות בדאטאבייס

const User = new mongoose.model("User", userSchema);//יוצר את הקולקשן של המשתמשים


passport.use(User.createStrategy());//אחראית להגדרת האימות של המשתמש

passport.serializeUser(User.serializeUser());//יוצר את העוגיה שמאחסנת את הזיהוי משתמש
passport.deserializeUser(User.deserializeUser());//ממוחקת את אותה עוגיה וחושפת את ההודעה מהמשתמש ומגלה מי הוא ומאפשרת לאמת

//הצפנת הסיסמה על ידי -mongoose-encyption 
// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });



app.get("/", (req, res) => {
    res.render('home');
})

app.get("/login", (req, res) => {

    res.render('login');
})

app.get("/register", (req, res) => {
    res.render('register');
})

app.get("/secrets", function (req, res) {
    if (!req.isAuthenticated()) {
        res.redirect("/login");
    }
    else {
        User.find({ "secret": { $ne: null } }, function (err, foundUsers) {
            if (err) {
                console.log(err);
            } else {
                if (foundUsers) {
                    res.render("secrets", { usersWithSecrets: foundUsers });
                }
            }
        });
    }
});

app.get('/submit', function (req, res) {
    if (req.isAuthenticated()) {//אם כבר יש עוגייה ששומרת את פרטי ההתחברות, אפשר לגשת ישירות לדף הסודות
        res.render('submit');
    } else {
        res.redirect("/login");
    }
})

app.post("/submit", function (req, res) {
    const sumbittedSecret = req.body.secret;
    User.findById(req.user.id, function (err, foundUser) {//מוצא את המשתמש ששולח את הסוד
        if (err) {
            console.log(err);
        }
        else if (foundUser) {//אם קיים משתמש שרוצה לפרסם והוא נמצא בדאטאבייס
            foundUser.secret = sumbittedSecret;
            foundUser.save(function () {
                res.redirect("/secrets")
            });
        }
    })
});

app.get("/logout", function (req, res) {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});



app.post("/register", (req, res) => {//בקשת פוסט מהלקוח לשרת ביצירת המשתמש
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {//אם יש שגיאה בקבלת הנתונים השרת ישלח את הלקוח להרשמה מחדש
            console.log(err);
            res.redirect("/register");
        }
        else {
            passport.authenticate("local")(req, res, function () {//מאמת את הנתונים ושולח את הלקוח לעמוד הסודות
                
                User.findById(req.user.id, function (err, foundUser) {//מוצא את המשתמש שנרשם
                    if (err) {
                        console.log(err);
                    }
                    else if (foundUser) {//
                        foundUser.counter = 1;//כמות הפעמים שהמשתמש נכנס לאתר
                        foundUser.save(function () {
                            res.redirect("/secrets")
                        });
                    }
                })
            });
        }

    });
});
// app.post("/login", function (req, res) {

//     const user = new User({
//         username: req.body.username,
//         password: req.body.password
//     });

//     req.login(user, function (err) {
//         if (err) {
//             console.log(err);
//         } else {
//             passport.authenticate("local")(req, res, function () {
//                 res.redirect("/secrets");
//             });
//         }
//     });

// });

app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }),  function(req, res) {
    User.findById(req.user.id, function (err, foundUser) {//מוצא את המשתמש שנרשם
        if (err) {
            console.log(err);
        }
        else if (foundUser) {//
            foundUser.counter ++;
            foundUser.save(function () {
                res.redirect("/secrets")
            });
        }
    })
    console.log(req.user)
	// res.redirect('/secrets');
});




app.listen(3000, function () {
    console.log("listening on port 3000")
});
