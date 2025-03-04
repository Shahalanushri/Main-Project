var createError = require("http-errors");
var express = require("express");

const http = require("http");
const socketIo = require("socket.io");

var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var hbs = require("express-handlebars");
var usersRouter = require("./routes/users");
var adminRouter = require("./routes/admin");
var builderRouter = require("./routes/builder");
var officerRouter = require("./routes/officer");

var fileUpload = require("express-fileupload");
var db = require("./config/connection");
var session = require("express-session");
const Handlebars = require('handlebars');

const app = express();
const server = http.createServer(app); // ✅ Attach HTTP server
const io = socketIo(server, { cors: { origin: "*" } }); // ✅ Allow CORS




// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

// Middleware to pass io instance to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Handle Socket.io connections
io.on("connection", (socket) => {
  console.log("✅ A user connected: " + socket.id);
  socket.on("disconnect", () => {
    console.log("❌ User disconnected: " + socket.id);
  });
});

Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});

// Set up Handlebars engine with helpers
app.engine(
  "hbs",
  hbs({
    extname: "hbs",
    defaultLayout: "layout",
    layoutsDir: __dirname + "/views/layout/",
    partialsDir: [
      __dirname + "/views/header-partials/", // Header partials
      __dirname + "/views/footer-partials/"  // Footer partials
    ],
    helpers: {
      incremented: function (index) {
        return index + 1;
      },
      eq: function (a, b) {
        return a === b;
      },
      formatDate: function (dateString) {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
        const year = date.getFullYear();
        return `${day}-${month}-${year}`; // Return the formatted date
      },
      or: function () {
        return Array.from(arguments).slice(0, -1).some(Boolean);
      }
    },
  })
);




app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(fileUpload());
app.use(
  session({
    secret: "Key",
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 1 day in milliseconds
  })
);
db.connect((err) => {
  if (err) console.log("Error" + err);
  else console.log("\x1b[38;2;144;238;144mDatabase Connected Successfully ✅ \x1b[0m");
  console.log("\x1b[38;2;144;238;144mYour Link : http://localhost:4004/ ✅ \x1b[0m");
});
app.use("/", usersRouter);
app.use("/admin", adminRouter);
app.use("/builder", builderRouter);
app.use("/officer", officerRouter);
app.use("/admin/users", adminRouter);
app.use("/admin/builder", adminRouter);
app.use("/admin/officers", adminRouter);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
