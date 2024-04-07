console.clear();
const DataDome = require("@datadome/node-module");
const http = require("http");
const express = require("express");
const mysql = require("mysql");
const dotenv = require("dotenv").config();
const app = express();
const bodyParser = require("body-parser");
const sessions = require("express-session");
const cookieParser = require("cookie-parser");

const hostname = process.env.Localhost;
const port = process.env.NodeJSPort;

var connection = mysql.createConnection({
  host: process.env.Localhost,
  user: process.env.User,
  password: process.env.Password,
  port: process.env.MySQLPort,
  database: process.env.Database,
});
console.clear();

const datadomeClient = new DataDome(
  process.env.DDServerSideKey,
  "api.datadome.co"
);

console.log(
  `MySQL listening on port : ${process.env.Database} \nDatabase selected: ${process.env.Database}\n`
);

connection.connect(function (err) {
  if (err) throw err;
  console.log("\nMySQL connection OK!");
});

app.listen(port, () =>
  console.log(`NodesJS server is listening on port ${port}`)
);

app.use(bodyParser.urlencoded({ extended: false }));

app.use(function (req, resp, next) {
  datadomeClient.authCallback(
    req,
    resp,
    function () {
      // apiserver passed request, move forward
      next();
    },
    function () {
      // nothing to do when blocked
    }
  );
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/register.html");
});

app.use(express.static(__dirname + "."));

app.use(
  sessions({
    secret: "thisismysecrctekey",
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 24 hours
    resave: false,
  })
);

app.use(cookieParser());

app.post("/register", (req, res) => {
  let firstName = req.body.firstName;
  let lastName = req.body.lastName;
  let userName = req.body.userName;
  let password = req.body.password;

  connection.connect(function (err) {
    if (err) {
      console.log(err);
    }
    connection.query(
      `SELECT * FROM users WHERE username = '${userName}' AND password  = '${password}'`,
      function (err, result) {
        if (err) {
          console.log(err);
        }
        if (Object.keys(result).length > 0) {
          res.sendFile(__dirname + "/failReg.html");
        } else {
          function userPage() {
            req.session.user = {
              firstname: firstName,
              lastname: lastName,
              username: userName,
              password: password,
            };

            res.send(`<!DOCTYPE html>
            <html lang="en">
            <head>
                <title>Login and register form with Node.js, Express.js and MySQL</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
            </head>
            <body>
                <div class="container">
                    <h3>Hi, ${req.session.user.firstname} ${req.session.user.lastname}</h3>
                    <a href="/">Log out</a>
                </div>
            </body>
            </html> `);
          }
          // inserting new user data
          var sql = `INSERT INTO users (firstname, lastname, username, password) VALUES ('${firstName}', '${lastName}', '${userName}', '${password}')`;
          connection.query(sql, function (err, result) {
            if (err) {
              console.log(err);
            } else {
              // using userPage function for creating user page
              userPage();
              console.log(`User ${process.env.Username} created`);
            }
          });
        }
      }
    );
  });
});

app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/login.html");
});

// get user data to /dashboard page
app.post("/login", (req, res) => {
  var userName = req.body.userName;
  var password = req.body.password;

  connection.connect(function (err) {
    if (err) {
      console.log(err);
    }
    //get user data from MySQL database
    connection.query(
      `SELECT * FROM users WHERE username = '${userName}' AND password = '${password}'`,
      function (err, result) {
        if (err) {
          console.log(err);
        }
        // creating userPage function to create user page
        function userPage() {
          // We create a session for the dashboard (user page) page and save the user data to this session:
          req.session.user = {
            firstname: result[0].firstname, // get MySQL row data
            lastname: result[0].lastname, // get MySQL row dataa
            username: userName,
            password: password,
          };

          res.send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
              <title>Login and register form with Node.js, Express.js and MySQL</title>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
          </head>
          <body>
              <div class="container">
                  <h3>Hi, ${req.session.user.firstname} ${req.session.user.lastname}</h3>
                  <a href="/">Log out</a>
              </div>
          </body>
          </html>
          `);
        }

        if (Object.keys(result).length > 0) {
          userPage();
        } else {
          res.sendFile(__dirname + "/failLog.html");
        }
      }
    );
  });
});
