var express = require("express");
var adminHelper = require("../helper/adminHelper");
var fs = require("fs");
const userHelper = require("../helper/userHelper");
var router = express.Router();
var db = require("../config/connection");
var collections = require("../config/collections");
const ObjectId = require("mongodb").ObjectID;

const verifySignedIn = (req, res, next) => {
  if (req.session.signedInAdmin) {
    next();
  } else {
    res.redirect("/admin/signin");
  }
};

/* GET admins listing. */
router.get("/", verifySignedIn, async function (req, res, next) {
  try {
    let administator = req.session.admin;
    let users = await adminHelper.getAllUsers();
    let userRegistrationData = await adminHelper.getUserRegistrationData(); // Fetch user registration data
    let bookings = await adminHelper.getAllbookings();
    let events = await userHelper.getAllevents();
    let facilitie = await userHelper.getAllfacilities();
    let { payments } = await adminHelper.getParticiation(); // ✅ Get grand total


    res.render("admin/home", {
      admin: true,
      users,
      userRegistrationData,
      layout: "admin-layout",
      administator,
      bookings,
      events,
      facilitie,
      payments,
    });
  } catch (err) {
    next(err);
  }
});



router.post("/send-alert", (req, res) => {
  console.log("sent in post route");
  const { message } = req.body;
  if (req.io) {
    // req.io.emit("receiveAlert", message || "🚨 Default Admin Alert");
    req.io.emit('hide', message || "🚨 Default Admin Alert");//testing trig
    console.log("Alert sent:", message);
    res.json({ success: true, message: message });
  } else {
    console.log("req.ioreq.ioreq.io:");
    res.status(500).json({ success: false, message: "Socket.io not initialized" });
  }
});



router.get("/delete-expired-activities", async (req, res) => {
  try {
    await adminHelper.deleteExpiredActivities();
    res.send("Expired activities deleted successfully.");
  } catch (error) {
    res.status(500).send("Error deleting expired activities.");
  }
});




///////ALL officer/////////////////////                                         
router.get("/all-officers", verifySignedIn, function (req, res) {
  let administator = req.session.admin;
  adminHelper.getAllUsers().then((users) => {
    res.render("admin/officers/all-officers", { admin: true, layout: "admin-layout", users, administator });
  });
});




router.post("/delete-officer/:id", verifySignedIn, async function (req, res) {
  await db.get().collection(collections.OFFICERS_COLLECTION).deleteOne({ _id: ObjectId(req.params.id) });
  res.redirect("/admin/officers/all-officers");
});

///////ADD officer/////////////////////                                         
router.get("/add-officer", verifySignedIn, function (req, res) {
  let administator = req.session.admin;
  res.render("admin/officers/add-officer", { admin: true, layout: "admin-layout", administator });
});

///////ADD officer/////////////////////                                         
router.post("/add-officer", function (req, res) {
  adminHelper.addofficer(req.body, (id) => {
    res.redirect("/admin/officers/all-officers");
  });
});

///////EDIT officer/////////////////////                                         
router.get("/edit-officer/:id", verifySignedIn, async function (req, res) {
  let administator = req.session.admin;
  let officerId = req.params.id;
  let officer = await adminHelper.getofficerDetails(officerId);
  console.log(officer);
  res.render("admin/officers/edit-officer", { admin: true, layout: "admin-layout", officer, administator });
});

///////EDIT officer/////////////////////                                         
router.post("/edit-officer/:id", verifySignedIn, function (req, res) {
  let officerId = req.params.id;
  adminHelper.updateofficer(officerId, req.body).then(() => {
    res.redirect("/admin/officers/all-officers");
  });
});

///////DELETE officer/////////////////////                                         
// router.get("/delete-officer/:id", verifySignedIn, function (req, res) {
//   let officerId = req.params.id;
//   adminHelper.deleteofficer(officerId).then((response) => {
//     res.redirect("/admin/all-officers");
//   });
// });

///////DELETE ALL officer/////////////////////                                         
router.get("/delete-all-officers", verifySignedIn, function (req, res) {
  adminHelper.deleteAllofficers().then(() => {
    res.redirect("/admin/officer/all-officers");
  });
});


router.get("/all-notifications", verifySignedIn, async function (req, res) {
  let administator = req.session.admin;
  let notifications = await adminHelper.getAllnotifications();
  res.render("admin/all-notifications", { admin: true, layout: "admin-layout", administator, notifications });
});

///////ADD reply/////////////////////                                         
router.get("/add-notification", verifySignedIn, async function (req, res) {
  let administator = req.session.admin;
  let users = await adminHelper.getAllUsers();
  res.render("admin/add-notification", { admin: true, layout: "admin-layout", administator, users });
});

///////ADD notification/////////////////////                                         
router.post("/add-notification", function (req, res) {
  adminHelper.addnotification(req.body, (id) => {
    res.redirect("/admin/all-notifications");
  });
});

router.get("/delete-notification/:id", verifySignedIn, function (req, res) {
  let notificationId = req.params.id;
  adminHelper.deletenotification(notificationId).then((response) => {
    res.redirect("/admin/all-notifications");
  });
});

///////ALL builder/////////////////////                                         
router.get("/all-builders", verifySignedIn, function (req, res) {
  let administator = req.session.admin;
  adminHelper.getAllbuilders().then((builders) => {
    res.render("admin/builder/all-builders", { admin: true, layout: "admin-layout", builders, administator });
  });
});



router.post("/approve-builder/:id", verifySignedIn, async function (req, res) {
  await db.get().collection(collections.BUILDER_COLLECTION).updateOne(
    { _id: ObjectId(req.params.id) },
    { $set: { approved: true } }
  );
  res.redirect("/admin/all-builders");
});

router.post("/reject-builder/:id", function (req, res) {
  const builderId = req.params.id;
  db.get()
    .collection(collections.BUILDER_COLLECTION)
    .updateOne({ _id: ObjectId(builderId) }, { $set: { approved: false, rejected: true } })
    .then(() => {
      res.redirect("/admin/all-builders");
    })
    .catch((err) => {
      console.error(err);
      res.redirect("/admin/all-builders");
    });
});


router.post("/delete-builder/:id", verifySignedIn, async function (req, res) {
  await db.get().collection(collections.BUILDER_COLLECTION).deleteOne({ _id: ObjectId(req.params.id) });
  res.redirect("/admin/all-builders");
});

///////ADD builder/////////////////////                                         
router.get("/add-builder", verifySignedIn, function (req, res) {
  let administator = req.session.admin;
  res.render("admin/builder/add-builder", { admin: true, layout: "admin-layout", administator });
});

///////ADD builder/////////////////////                                         
router.post("/add-builder", function (req, res) {
  adminHelper.addbuilder(req.body, (id) => {
    let image = req.files.Image;
    image.mv("./public/images/builder-images/" + id + ".png", (err, done) => {
      if (!err) {
        res.redirect("/admin/builder/all-builders");
      } else {
        console.log(err);
      }
    });
  });
});

///////EDIT builder/////////////////////                                         
router.get("/edit-builder/:id", verifySignedIn, async function (req, res) {
  let administator = req.session.admin;
  let builderId = req.params.id;
  let builder = await adminHelper.getbuilderDetails(builderId);
  console.log(builder);
  res.render("admin/builder/edit-builder", { admin: true, layout: "admin-layout", builder, administator });
});

///////EDIT builder/////////////////////                                         
router.post("/edit-builder/:id", verifySignedIn, function (req, res) {
  let builderId = req.params.id;
  adminHelper.updatebuilder(builderId, req.body).then(() => {
    if (req.files) {
      let image = req.files.Image;
      if (image) {
        image.mv("./public/images/builder-images/" + builderId + ".png");
      }
    }
    res.redirect("/admin/builder/all-builders");
  });
});

///////DELETE builder/////////////////////                                         
// router.get("/delete-builder/:id", verifySignedIn, function (req, res) {
//   let builderId = req.params.id;
//   adminHelper.deletebuilder(builderId).then((response) => {
//     res.redirect("/admin/all-builders");
//   });
// });

///////DELETE ALL builder/////////////////////                                         
router.get("/delete-all-builders", verifySignedIn, function (req, res) {
  adminHelper.deleteAllbuilders().then(() => {
    res.redirect("/admin/builder/all-builders");
  });
});

router.get("/all-products", verifySignedIn, function (req, res) {
  let administator = req.session.admin;
  adminHelper.getAllProducts().then((products) => {
    res.render("admin/all-products", { admin: true, layout: "admin-layout", products, administator });
  });
});

router.get("/signup", function (req, res) {
  if (req.session.signedInAdmin) {
    res.redirect("/admin");
  } else {
    res.render("admin/signup", {
      admin: true, layout: "admin-empty",
      signUpErr: req.session.signUpErr,
    });
  }
});

router.post("/signup", function (req, res) {
  adminHelper.doSignup(req.body).then((response) => {
    console.log(response);
    if (response.status == false) {
      req.session.signUpErr = "Invalid Admin Code";
      res.redirect("/admin/signup");
    } else {
      req.session.signedInAdmin = true;
      req.session.admin = response;
      res.redirect("/admin");
    }
  });
});

router.get("/signin", function (req, res) {
  if (req.session.signedInAdmin) {
    res.redirect("/admin");
  } else {
    res.render("admin/signin", {
      admin: true, layout: "admin-empty",
      signInErr: req.session.signInErr,
    });
    req.session.signInErr = null;
  }
});

router.post("/signin", function (req, res) {
  adminHelper.doSignin(req.body).then((response) => {
    if (response.status) {
      req.session.signedInAdmin = true;
      req.session.admin = response.admin;
      res.redirect("/admin");
    } else {
      req.session.signInErr = "Invalid Email/Password";
      res.redirect("/admin/signin");
    }
  });
});

router.get("/signout", function (req, res) {
  req.session.signedInAdmin = false;
  req.session.admin = null;
  res.redirect("/admin");
});

router.get("/add-product", verifySignedIn, function (req, res) {
  let administator = req.session.admin;
  res.render("admin/add-product", { admin: true, layout: "admin-layout", administator });
});

router.post("/add-product", function (req, res) {
  adminHelper.addProduct(req.body, (id) => {
    let image = req.files.Image;
    image.mv("./public/images/product-images/" + id + ".png", (err, done) => {
      if (!err) {
        res.redirect("/admin/add-product");
      } else {
        console.log(err);
      }
    });
  });
});

router.get("/edit-product/:id", verifySignedIn, async function (req, res) {
  let administator = req.session.admin;
  let productId = req.params.id;
  let product = await adminHelper.getProductDetails(productId);
  console.log(product);
  res.render("admin/edit-product", { admin: true, layout: "admin-layout", product, administator });
});

router.post("/edit-product/:id", verifySignedIn, function (req, res) {
  let productId = req.params.id;
  adminHelper.updateProduct(productId, req.body).then(() => {
    if (req.files) {
      let image = req.files.Image;
      if (image) {
        image.mv("./public/images/product-images/" + productId + ".png");
      }
    }
    res.redirect("/admin/all-products");
  });
});

router.get("/delete-product/:id", verifySignedIn, function (req, res) {
  let productId = req.params.id;
  adminHelper.deleteProduct(productId).then((response) => {
    fs.unlinkSync("./public/images/product-images/" + productId + ".png");
    res.redirect("/admin/all-products");
  });
});

router.get("/delete-all-products", verifySignedIn, function (req, res) {
  adminHelper.deleteAllProducts().then(() => {
    res.redirect("/admin/all-products");
  });
});

router.get("/all-users", verifySignedIn, function (req, res) {
  let administator = req.session.admin;
  adminHelper.getAllUsers().then((users) => {
    res.render("admin/users/all-users", { admin: true, layout: "admin-layout", administator, users });
  });
});



router.post("/block-user/:id", (req, res) => {
  const userId = req.params.id;
  const { reason } = req.body;

  // Update the user in the database to set isDisable to true and add the reason
  db.get()
    .collection(collections.USERS_COLLECTION)
    .updateOne(
      { _id: new ObjectId(userId) },
      { $set: { isDisable: true, blockReason: reason } }
    )
    .then(() => res.json({ success: true }))
    .catch(err => {
      console.error('Error blocking user:', err);
      res.json({ success: false });
    });
});


router.post("/unblock-user/:id", (req, res) => {
  const userId = req.params.id;
  const { reason } = req.body;

  // Update the user in the database to set isDisable to false
  db.get()
    .collection(collections.USERS_COLLECTION)
    .updateOne(
      { _id: new ObjectId(userId) },
      { $set: { isDisable: false } }
    )
    .then(() => res.redirect("/admin/users/all-users")) // Redirect on success
    .catch(err => {
      console.error('Error unblocking user:', err);
      res.json({ success: false });
    });
});


router.get("/all-tempusers", verifySignedIn, function (req, res) {
  let administator = req.session.admin;
  adminHelper.getAllTempUsers().then((tempusers) => {
    res.render("admin/tempusers/all-tempusers", { admin: true, layout: "admin-layout", administator, tempusers });
  });
});


router.post("/approve-tempuser/:id", verifySignedIn, async function (req, res) {
  await db.get().collection(collections.TEMPUSERS_COLLECTION).updateOne(
    { _id: ObjectId(req.params.id) },
    { $set: { approved: true } }
  );
  res.redirect("/admin/tempusers/all-tempusers");
});

router.post("/reject-tempuser/:id", function (req, res) {
  const userId = req.params.id;
  db.get()
    .collection(collections.TEMPUSERS_COLLECTION)
    .updateOne({ _id: ObjectId(userId) }, { $set: { approved: false, rejected: true } })
    .then(() => {
      res.redirect("/admin/tempusers/all-tempusers");
    })
    .catch((err) => {
      console.error(err);
      res.redirect("/admin/tempusers/all-tempusers");
    });
});


router.post("/approve-user/:id", verifySignedIn, async function (req, res) {
  await db.get().collection(collections.USERS_COLLECTION).updateOne(
    { _id: ObjectId(req.params.id) },
    { $set: { approved: true } }
  );
  res.redirect("/admin/users/all-users");
});

router.post("/reject-user/:id", function (req, res) {
  const userId = req.params.id;
  db.get()
    .collection(collections.USERS_COLLECTION)
    .updateOne({ _id: ObjectId(userId) }, { $set: { approved: false, rejected: true } })
    .then(() => {
      res.redirect("/admin/users/all-users");
    })
    .catch((err) => {
      console.error(err);
      res.redirect("/admin/users/all-users");
    });
});






router.post("/delete-user/:id", verifySignedIn, async function (req, res) {
  await db.get().collection(collections.USERS_COLLECTION).deleteOne({ _id: ObjectId(req.params.id) });
  res.redirect("/admin/users/all-users");
});

///////SET ROLE/////////////////////                                         
router.get("/set-role/:id", verifySignedIn, async function (req, res) {
  let administator = req.session.admin;
  let userId = req.params.id;
  let user = await adminHelper.getuserDetails(userId);
  console.log(user);
  res.render("admin/users/set-role", { admin: true, layout: "admin-layout", user, administator });
});

///////EDIT officer/////////////////////                                         
router.post("/set-role/:id", verifySignedIn, function (req, res) {
  let userId = req.params.id;
  adminHelper.updateuser(userId, req.body).then(() => {
    res.redirect("/admin/users/all-users");
  });
});



router.post("/block-user/:id", (req, res) => {
  const userId = req.params.id;
  const { reason } = req.body;

  // Update the user in the database to set isDisable to true and add the reason
  db.get()
    .collection(collections.USERS_COLLECTION)
    .updateOne(
      { _id: new ObjectId(userId) },
      { $set: { isDisable: true, blockReason: reason } }
    )
    .then(() => res.json({ success: true }))
    .catch(err => {
      console.error('Error blocking user:', err);
      res.json({ success: false });
    });
});



router.get("/remove-all-users", verifySignedIn, function (req, res) {
  adminHelper.removeAllUsers().then(() => {
    res.redirect("/admin/all-users");
  });
});

router.get("/all-orders", verifySignedIn, async function (req, res) {
  let administator = req.session.admin;
  let { fromDate, toDate } = req.query; // Get fromDate and toDate from the query parameters

  try {
    let orders = await adminHelper.getAllOrders(fromDate, toDate); // Pass the date range to the function

    res.render("admin/finance", {
      admin: true,
      layout: "admin-layout",
      administator,
      orders,     // Render the filtered orders
      fromDate,   // Pass back toDate and fromDate to display on the form
      toDate
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Server Error");
  }
});


router.get(
  "/view-ordered-products/:id",
  verifySignedIn,
  async function (req, res) {
    let administator = req.session.admin;
    let orderId = req.params.id;
    let products = await userHelper.getOrderProducts(orderId);
    res.render("admin/order-products", {
      admin: true, layout: "admin-layout",
      administator,
      products,
    });
  }
);

router.get("/change-status/", verifySignedIn, function (req, res) {
  let status = req.query.status;
  let orderId = req.query.orderId;
  adminHelper.changeStatus(status, orderId).then(() => {
    res.redirect("/admin/all-orders");
  });
});

router.get("/cancel-order/:id", verifySignedIn, function (req, res) {
  let orderId = req.params.id;
  adminHelper.cancelOrder(orderId).then(() => {
    res.redirect("/admin/all-orders");
  });
});

router.get("/cancel-all-orders", verifySignedIn, function (req, res) {
  adminHelper.cancelAllOrders().then(() => {
    res.redirect("/admin/all-orders");
  });
});

router.post("/search", verifySignedIn, function (req, res) {
  let administator = req.session.admin;
  adminHelper.searchProduct(req.body).then((response) => {
    res.render("admin/search-result", { admin: true, layout: "admin-layout", administator, response });
  });
});


module.exports = router;
