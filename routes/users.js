var express = require("express");
var userHelper = require("../helper/userHelper");
var adminHelper = require("../helper/adminHelper");
const crypto = require('crypto');
const Razorpay = require("razorpay");
var fs = require("fs");

var router = express.Router();
var db = require("../config/connection");
var collections = require("../config/collections");
const ObjectId = require("mongodb").ObjectID;

const verifySignedIn = (req, res, next) => {
  if (req.session.signedIn) {
    next();
  } else {
    res.redirect("/signin");
  }
};

/* GET home page. */
router.get("/", async function (req, res, next) {
  let user = req.session.user;
  if (user) {
    return res.redirect('/home');
  }
  userHelper.getAllevents().then((events) => {
    res.render("users/welcome", { admin: false, layout: 'empty', events, user });
  }).catch(next); // Ensure to catch any errors and pass them to the next middleware
});


router.get("/home", verifySignedIn, async function (req, res, next) {
  let user = req.session.user;
  let activities = await userHelper.getAllactivities()
  userHelper.getAllevents().then((events) => {
    res.render("users/home", { admin: false, activities, events, user });
  });
});


///////user event/////////////////////                                         
router.get("/events", verifySignedIn, function (req, res) {
  let user = req.session.user;
  userHelper.getAllevents().then((events) => {
    res.render("users/events", { admin: false, events, user });
  });
});


router.get("/notifications", verifySignedIn, function (req, res) {
  let user = req.session.user;  // Get logged-in user from session

  // Use the user._id to fetch notifications for the logged-in user
  userHelper.getnotificationById(user._id).then((notifications) => {
    res.render("users/notifications", { admin: false, notifications, user });
  }).catch((err) => {
    console.error("Error fetching notifications:", err);
    res.status(500).send("Error fetching notifications");
  });
});

router.get("/about", async function (req, res) {
  res.render("users/about", { admin: false, });
})


router.get("/contact", async function (req, res) {
  res.render("users/contact", { admin: false, });
})

router.get("/service", async function (req, res) {
  res.render("users/service", { admin: false, });
})


router.post("/add-feedback", async function (req, res) {
  let user = req.session.user; // Ensure the user is logged in and the session is set
  let feedbackText = req.body.text; // Get feedback text from form input
  let username = req.body.username; // Get username from form input
  let eventId = req.body.eventId; // Get event ID from form input
  let builderId = req.body.builderId; // Get builder ID from form input

  if (!user) {
    return res.status(403).send("User not logged in");
  }

  try {
    const feedback = {
      userId: ObjectId(user._id), // Convert user ID to ObjectId
      eventId: ObjectId(eventId), // Convert event ID to ObjectId
      builderId: ObjectId(builderId), // Convert builder ID to ObjectId
      text: feedbackText,
      username: username,
      createdAt: new Date() // Store the timestamp
    };

    await userHelper.addFeedback(feedback);
    res.redirect("/single-event/" + eventId); // Redirect back to the event page
  } catch (error) {
    console.error("Error adding feedback:", error);
    res.status(500).send("Server Error");
  }
});



router.get("/single-event/:id", async function (req, res) {
  let user = req.session.user;
  const eventId = req.params.id;

  try {
    const event = await userHelper.getEventById(eventId);

    if (!event) {
      return res.status(404).send("Event not found");
    }
    const feedbacks = await userHelper.getFeedbackByEventId(eventId); // Fetch feedbacks for the specific event

    res.render("users/single-event", {
      admin: false,
      user,
      event,
      feedbacks
    });
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).send("Server Error");
  }
});




////////////////////PROFILE////////////////////////////////////
router.get("/profile", async function (req, res, next) {
  let user = req.session.user;
  if (!req.session.user) {
    return res.redirect("/signin"); // Redirect if not logged in
  }

  const userId = new ObjectId(req.session.user._id); // Convert userId to ObjectId
  const familyMembers = await userHelper.getFamilyByUserId(userId);

  res.render("users/profile", { admin: false, user, familyMembers });
});

///////ADD officer/////////////////////                                         
router.post("/add-family", function (req, res) {
  if (!req.session.user) {
    return res.redirect("/signin"); // Redirect if the user is not logged in
  }

  const familyData = {
    ...req.body,
    userId: new ObjectId(req.session.user._id) // Convert userId to ObjectId
  };

  userHelper.addfamily(familyData)
    .then(() => {
      res.redirect("/profile");
    })
    .catch((error) => {
      console.error("Error adding family:", error);
      res.redirect("/profile"); // Redirect even on failure, but you can handle errors differently
    });
});


////////////////////USER TYPE////////////////////////////////////
router.get("/usertype", async function (req, res, next) {
  res.render("users/usertype", { admin: false, layout: 'empty' });
});

router.get("/validation", async function (req, res, next) {
  let user = req.session.user;
  res.render("users/validation", { admin: false, layout: 'empty', user });
});


router.get("/continue/:id", async function (req, res, next) {
  let user = req.session.user;
  let userId = req.session.user._id;
  let userProfile = await userHelper.getUserDetails(userId);
  res.render("users/continue", { admin: false, layout: 'empty', user, userProfile });
});


router.post("/continue/:id", verifySignedIn, async function (req, res) {
  try {
    const { Fname, Lname, Email, Phone, Address, District, Pincode } = req.body;
    let errors = {};

    // Validate first name
    if (!Fname || Fname.trim().length === 0) {
      errors.fname = 'Please enter your first name.';
    }

    if (!District || District.trim().length === 0) {
      errors.district = 'Please enter your first name.';
    }

    // Validate last name
    // if (!Lname || Lname.trim().length === 0) {
    //   errors.lname = 'Please enter your last name.';
    // }

    // Validate email format
    if (!Email || !/^\S+@\S+\.\S+$/.test(Email)) {
      errors.email = 'Please enter a valid email address.';
    }

    // Validate phone number
    if (!Phone) {
      errors.phone = "Please enter your phone number.";
    } else if (!/^\d{10}$/.test(Phone)) {
      errors.phone = "Phone number must be exactly 10 digits.";
    }


    // Validate pincode
    if (!Pincode) {
      errors.pincode = "Please enter your pincode.";
    } else if (!/^\d{6}$/.test(Pincode)) {
      errors.pincode = "Pincode must be exactly 6 digits.";
    }

    if (!Phone) {
      errors.phone = "Please enter your phone number.";
    } else if (!/^\d{10}$/.test(Phone)) {
      errors.phone = "Phone number must be exactly 10 digits.";
    } else {
      const existingPhone = await db.get()
        .collection(collections.USERS_COLLECTION)
        .findOne({ Phone });

      if (existingPhone) {
        errors.phone = "This phone number is already registered.";
      }
    }

    if (!Fname) errors.fname = "Please enter your first name.";
    // if (!Lname) errors.lname = "Please enter your last name.";
    if (!Email) errors.email = "Please enter your email.";
    if (!Address) errors.address = "Please enter your address.";
    if (!District) errors.district = "Please enter your district.";

    // Validate other fields as needed...

    // If there are validation errors, re-render the form with error messages
    if (Object.keys(errors).length > 0) {
      let userProfile = await userHelper.getUserDetails(req.params.id);
      return res.render("users/continue", {
        admin: false,
        userProfile,
        user: req.session.user,
        errors,
        Fname,
        Lname,
        Email,
        Phone,
        Address,
        District,
        Pincode,
        layout: 'empty'
      });
    }

    // Update the user profile
    await userHelper.updateUserProfile(req.params.id, req.body);

    // Fetch the updated user profile and update the session
    let updatedUserProfile = await userHelper.getUserDetails(req.params.id);
    req.session.user = updatedUserProfile;

    // Redirect to the profile page
    res.redirect("/payment");
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).send("An error occurred while updating the profile.");
  }
});

router.get("/payment", async function (req, res, next) {
  let user = req.session.user;
  res.render("users/payment", { admin: false, user, layout: 'empty' });
});

router.post('/create-order', async (req, res) => {
  try {
    const userId = req.session.user._id; // Retrieve userId from session
    const amount = 500; // Registration Fee amount

    const order = await userHelper.createOrder(amount);

    const updatedUser = await db
      .get()
      .collection(collections.USERS_COLLECTION)
      .updateOne(
        { _id: ObjectId(userId) },
        {
          $set: {
            userStatus: 'paid',
            amount,
          },
        }
      );

    if (updatedUser.modifiedCount > 0) {
      res.json({ success: true, order });
    } else {
      res.json({
        success: false,
        message: 'Order created, but failed to update user status.',
      });
    }
  } catch (error) {
    console.error('Error creating order:', error);
    res.json({ success: false, message: 'Failed to create order' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { paymentId, orderId, signature, userId, amount } = req.body;

    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', 'xPzG53EXxT8PKr34qT7CTFm9') // Replace with your Razorpay secret key
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === signature) {
      // Payment is verified
      await db
        .get()
        .collection(collections.USERS_COLLECTION)
        .updateOne(
          { _id: ObjectId(userId) },
          { $set: { userStatus: 'verified', amount } }
        );

      return res.json({ success: true });
    } else {
      // Signature does not match
      return res.json({ success: false, message: 'Payment verification failed' });
    }
  } catch (error) {
    console.error('Error during payment verification:', error);
    return res.json({
      success: false,
      message: 'Internal server error during payment verification',
    });
  }
});


router.get("/pending-approval", function (req, res) {
  if (!req.session.signedIn || req.session.user.approved) {
    res.redirect("/home");
  } else {
    res.render("users/pending-approval", {
      admin: false, layout: "empty",
    });
  }
});

router.get("/signup", function (req, res) {
  if (req.session.signedIn) {
    res.redirect("/");
  } else {
    res.render("users/signup", { admin: false, layout: 'empty' });
  }
});

router.post("/signup", async function (req, res) {
  const { Fname, Email, Password } = req.body;
  let errors = {};

  // Check if email already exists
  const existingEmail = await db.get()
    .collection(collections.USERS_COLLECTION)
    .findOne({ Email });

  if (existingEmail) {
    errors.email = "This email is already registered.";
  }

  // Validate phone number length and uniqueness

  // if (!Phone) {
  //   errors.phone = "Please enter your phone number.";
  // } else if (!/^\d{10}$/.test(Phone)) {
  //   errors.phone = "Phone number must be exactly 10 digits.";
  // } else {
  //   const existingPhone = await db.get()
  //     .collection(collections.USERS_COLLECTION)
  //     .findOne({ Phone });

  //   if (existingPhone) {
  //     errors.phone = "This phone number is already registered.";
  //   }
  // }
  // Validate Pincode
  // if (!Pincode) {
  //   errors.pincode = "Please enter your pincode.";
  // } else if (!/^\d{6}$/.test(Pincode)) {
  //   errors.pincode = "Pincode must be exactly 6 digits.";
  // }

  if (!Fname) errors.fname = "Please enter your first name.";
  if (!Email) errors.email = "Please enter your email.";
  // if (!Address) errors.address = "Please enter your address.";
  // if (!District) errors.district = "Please enter your city.";

  // Password validation
  if (!Password) {
    errors.password = "Please enter a password.";
  } else {
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/;
    if (!strongPasswordRegex.test(Password)) {
      errors.password = "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.render("users/signup", {
      admin: false,
      layout: 'empty',
      errors,
      Fname,
      Email,
      // Phone,
      // Address,
      // Pincode,
      // District,
      Password
    });
  }

  // Proceed with signup
  userHelper.doSignup(req.body).then((response) => {
    req.session.signedIn = true;
    req.session.user = response;
    res.redirect("/validation");
  }).catch((err) => {
    console.error("Signup error:", err);
    res.status(500).send("An error occurred during signup.");
  });
});



router.get("/signin", function (req, res) {
  if (req.session.signedIn) {
    res.redirect("/home");
  } else {
    res.render("users/signin", {
      admin: false,
      layout: 'empty',
      signInErr: req.session.signInErr,
    });
    req.session.signInErr = null;
  }
});


router.post("/signin", function (req, res) {
  const { Email, Password } = req.body;

  if (!Email || !Password) {
    req.session.signInErr = "Please fill in all fields.";
    return res.render("users/signin", {
      admin: false,
      layout: "empty",
      signInErr: req.session.signInErr,
      email: Email,
      password: Password,
    });
  }

  userHelper.doSignin(req.body).then((response) => {
    if (response.status === "pending") {
      req.session.signInErr = "User is not approved by admin.";
      return res.redirect("/signin");
    } else if (response.status === "rejected") {
      req.session.signInErr = "This user is rejected by admin.";
      return res.redirect("/signin");
    } else if (response.status && response.user) {
      req.session.signedIn = true;
      req.session.user = response.user;

      // Redirect based on role
      switch (response.user.role) {
        case "President":
          return res.redirect("/president");
        case "Treasurer":
          return res.redirect("/treasurer");
        case "Secretary":
          return res.redirect("/secretary");
        case "Resource Manager":
          return res.redirect("/resource-manager");
        case "resident":  // If user is a resident, go to /home
        default:
          return res.redirect("/home");
      }
    } else {
      req.session.signInErr = "Invalid Email/Password";
      return res.render("users/signin", {
        admin: false,
        layout: "empty",
        signInErr: req.session.signInErr,
        email: Email,
      });
    }
  });
});


//////////////ROLES/////////////////////
router.get("/president", verifySignedIn, async function (req, res, next) {
  let user = req.session.user;
  res.render("users/president/home", { admin: false, user });
});
router.get("/treasurer", verifySignedIn, async function (req, res, next) {
  let user = req.session.user;
  let users = await adminHelper.getAllUsers();
  res.render("users/treasurer/home", { admin: false, user, users });
});




router.get("/secretary", verifySignedIn, async function (req, res, next) {
  let user = req.session.user;
  res.render("users/secretary/home", { admin: false, user });
});

router.get("/facilities", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let facilities = await userHelper.getAllfacilities()
  res.render("users/facilities", { admin: false, facilities, user });
});


router.post("/book-now", async (req, res) => {
  try {
    let bookingData = {
      title: req.body.title,
      desc: req.body.desc,
      seats: req.body.seats,
      price: req.body.price,
      userId: req.body.userId,
      username: req.body.username,
      useremail: req.body.useremail,
      userphone: req.body.userphone,
      useraddress: req.body.useraddress,
      count: req.body.count,
      date: req.body.date
    };

    // Store booking data in the database
    await userHelper.storeBooking(bookingData);

    res.send("<script>alert('Booking Confirmed!'); window.location.href='/facilities';</script>"); // Redirect after success
  } catch (error) {
    console.error("Error in booking:", error);
    res.status(500).send("Something went wrong. Please try again.");
  }
});



router.get("/cancel-booking/:id", verifySignedIn, async (req, res) => {
  let bookingId = req.params.id;
  let crackedCount = parseInt(req.query.cracked) || 0; // Get cracked product count from query

  try {
    await userHelper.cancelBooking(bookingId, crackedCount);
    res.redirect("/orders");
  } catch (error) {
    console.error("Error canceling booking:", error);
    res.status(500).send("Something went wrong");
  }
});


///////ALL facilitie/////////////////////                                         
router.get("/all-facilities", verifySignedIn, function (req, res) {
  let user = req.session.user;
  userHelper.getAllfacilities().then((facilities) => {
    res.render("users/secretary/all-facilities", { admin: false, facilities, user });
  });
});

///////ADD facilities/////////////////////                                         
router.get("/add-facilities", verifySignedIn, function (req, res) {
  let user = req.session.user;
  res.render("users/secretary/add-facilities", { admin: false, user });
});

///////ADD facilities/////////////////////                                         
router.post("/add-facilities", function (req, res) {
  userHelper.addfacilitie(req.body, (id) => {
    let image = req.files.Image;
    image.mv("./public/images/facilitie-images/" + id + ".png", (err, done) => {
      if (!err) {
        res.redirect("/all-facilities");
      } else {
        console.log(err);
      }
    });
  });
});

///////EDIT facilities/////////////////////                                         
router.get("/edit-facilitie/:id", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let facilitieId = req.params.id;
  let facilitie = await userHelper.getfacilitieDetails(facilitieId);
  console.log(facilitie);
  res.render("users/secretary/edit-facilitie", { admin: false, facilitie, user });
});

///////EDIT facilities/////////////////////                                         
router.post("/edit-facilitie/:id", verifySignedIn, function (req, res) {
  let facilitieId = req.params.id;
  userHelper.updatefacilitie(facilitieId, req.body).then(() => {
    if (req.files) {
      let image = req.files.Image;
      if (image) {
        image.mv("./public/images/facilitie-images/" + facilitieId + ".png");
      }
    }
    res.redirect("/all-facilities");
  });
});

///////DELETE facilities/////////////////////                                         
router.get("/delete-facilitie/:id", verifySignedIn, function (req, res) {
  let facilitieId = req.params.id;
  userHelper.deletefacilitie(facilitieId).then((response) => {
    fs.unlinkSync("./public/images/facilitie-images/" + facilitieId + ".png");
    res.redirect("/all-facilities");
  });
});

///////DELETE ALL facilities/////////////////////                                         
router.get("/delete-all-facilities", verifySignedIn, function (req, res) {
  userHelper.deleteAllfacilities().then(() => {
    res.redirect("/users/secretary/all-facilities");
  });
});






///////ALL activity/////////////////////                                         
router.get("/all-announcements", verifySignedIn, function (req, res) {
  let user = req.session.user;
  userHelper.getAllactivities().then((activities) => {
    res.render("users/secretary/all-announcements", { admin: false, activities, user });
  });
});

///////ADD activity/////////////////////                                         
router.get("/add-activity", verifySignedIn, function (req, res) {
  let user = req.session.user;
  res.render("users/secretary/add-activity", { admin: false, user });
});

///////ADD activity/////////////////////                                         
router.post("/add-activity", function (req, res) {
  userHelper.addactivity(req.body, (id) => {
    let image = req.files.Image;
    image.mv("./public/images/activity-images/" + id + ".png", (err, done) => {
      if (!err) {
        res.redirect("/all-announcements");
      } else {
        console.log(err);
      }
    });
  });
});

///////EDIT activities/////////////////////                                         
router.get("/edit-activity/:id", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let activityId = req.params.id;
  let activity = await userHelper.getactivityDetails(activityId);
  console.log(activity);
  res.render("users/secretary/edit-activity", { admin: false, activity, user });
});

///////EDIT activities/////////////////////                                         
router.post("/edit-activity/:id", verifySignedIn, function (req, res) {
  let activityId = req.params.id;
  userHelper.updateactivity(activityId, req.body).then(() => {
    if (req.files) {
      let image = req.files.Image;
      if (image) {
        image.mv("./public/images/activity-images/" + activityId + ".png");
      }
    }
    res.redirect("/all-activities");
  });
});

///////DELETE activities/////////////////////                                         
router.get("/delete-activity/:id", verifySignedIn, function (req, res) {
  let activityId = req.params.id;
  userHelper.deleteactivity(activityId).then((response) => {
    fs.unlinkSync("./public/images/activity-images/" + activityId + ".png");
    res.redirect("/all-announcements");
  });
});



///////ALL contact/////////////////////                                         
router.get("/all-contacts", verifySignedIn, function (req, res) {
  let user = req.session.user;
  userHelper.getAllcontacts().then((contacts) => {
    res.render("users/secretary/all-contacts", { admin: false, contacts, user });
  });
});

///////ADD contacts/////////////////////                                         
router.get("/add-contact", verifySignedIn, function (req, res) {
  let user = req.session.user;
  res.render("users/secretary/add-contact", { admin: false, user });
});

///////ADD contacts/////////////////////                                         
router.post("/add-contact", function (req, res) {
  userHelper.addcontact(req.body, (id) => {
    res.redirect("/all-contacts");

  });
});

///////EDIT contacts/////////////////////                                         
router.get("/edit-contact/:id", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let contactId = req.params.id;
  let contact = await userHelper.getcontactDetails(contactId);
  console.log(contact);
  res.render("users/secretary/edit-contact", { admin: false, contact, user });
});

///////EDIT contacts/////////////////////                                         
router.post("/edit-contact/:id", verifySignedIn, function (req, res) {
  let contactId = req.params.id;
  userHelper.updatecontact(contactId, req.body).then(() => {
    if (req.files) {
      let image = req.files.Image;
      if (image) {
        image.mv("./public/images/contact-images/" + contactId + ".png");
      }
    }
    res.redirect("/all-contacts");
  });
});

///////DELETE contacts/////////////////////                                         
router.get("/delete-contact/:id", verifySignedIn, function (req, res) {
  let contactId = req.params.id;
  userHelper.deletecontact(contactId).then((response) => {
    res.redirect("/all-contacts");
  });
});

///////DELETE ALL contacts/////////////////////                                         
router.get("/delete-all-contacts", verifySignedIn, function (req, res) {
  userHelper.deleteAllcontacts().then(() => {
    res.redirect("/users/secretary/all-contacts");
  });
});





///////ALL event/////////////////////                                         
router.get("/all-events", verifySignedIn, function (req, res) {
  let user = req.session.user;
  userHelper.getAllevents().then((events) => {
    res.render("users/secretary/all-events", { admin: false, events, user });
  });
});

router.get("/calender", verifySignedIn, function (req, res) {
  let user = req.session.user;
  userHelper.getAllevents().then((events) => {
    res.render("users/secretary/calender", { admin: false, events, user });
  });
});

///////ADD events/////////////////////                                         
router.get("/add-event", verifySignedIn, function (req, res) {
  let user = req.session.user;
  res.render("users/secretary/add-event", { admin: false, user });
});

///////ADD events/////////////////////                                         
router.post("/add-event", function (req, res) {
  userHelper.addevent(req.body, (id) => {
    let image = req.files.Image;
    image.mv("./public/images/event-images/" + id + ".png", (err, done) => {
      if (!err) {
        res.redirect("/all-events");
      } else {
        console.log(err);
      }
    });
  });
});

///////EDIT events/////////////////////                                         
router.get("/edit-event/:id", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let eventId = req.params.id;
  let event = await userHelper.geteventDetails(eventId);
  console.log(event);
  res.render("users/secretary/edit-event", { admin: false, event, user });
});

///////EDIT events/////////////////////                                         
router.post("/edit-event/:id", verifySignedIn, function (req, res) {
  let eventId = req.params.id;
  userHelper.updateevent(eventId, req.body).then(() => {
    if (req.files) {
      let image = req.files.Image;
      if (image) {
        image.mv("./public/images/event-images/" + eventId + ".png");
      }
    }
    res.redirect("/all-events");
  });
});

///////DELETE events/////////////////////                                         
router.get("/delete-event/:id", verifySignedIn, function (req, res) {
  let eventId = req.params.id;
  userHelper.deleteevent(eventId).then((response) => {
    res.redirect("/all-events");
  });
});

///////DELETE ALL events/////////////////////                                         
router.get("/delete-all-events", verifySignedIn, function (req, res) {
  userHelper.deleteAllevents().then(() => {
    res.redirect("/users/secretary/all-events");
  });
});






///////ALL activities/////////////////////                                         
// router.get("/all-activities", verifySignedIn, function (req, res) {
//   let user = req.session.user;
//   // userHelper.getAllactivites().then((activites) => {
//   res.render("users/secretary/all-activities", { admin: false, user });
//   // });
// });


router.get("/resource-manager", verifySignedIn, async function (req, res, next) {
  let user = req.session.user;
  let bookings = await adminHelper.getAllbookings()
  console.log("boooooo", bookings);

  res.render("users/resource-manager/home", { admin: false, user, bookings });
});


router.get("/signout", function (req, res) {
  req.session.signedIn = false;
  req.session.user = null;
  res.redirect("/");
});

router.get("/edit-profile/:id", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let userId = req.session.user._id;
  let userProfile = await userHelper.getUserDetails(userId);
  res.render("users/edit-profile", { admin: false, userProfile, user });
});

router.post("/edit-profile/:id", verifySignedIn, async function (req, res) {
  try {
    const { Fname, Lname, Email, Phone, Address, District, Pincode } = req.body;
    let errors = {};

    // Validate first name
    if (!Fname || Fname.trim().length === 0) {
      errors.fname = 'Please enter your first name.';
    }

    if (!District || District.trim().length === 0) {
      errors.district = 'Please enter your first name.';
    }

    // Validate last name
    if (!Lname || Lname.trim().length === 0) {
      errors.lname = 'Please enter your last name.';
    }

    // Validate email format
    if (!Email || !/^\S+@\S+\.\S+$/.test(Email)) {
      errors.email = 'Please enter a valid email address.';
    }

    // Validate phone number
    if (!Phone) {
      errors.phone = "Please enter your phone number.";
    } else if (!/^\d{10}$/.test(Phone)) {
      errors.phone = "Phone number must be exactly 10 digits.";
    }


    // Validate pincode
    if (!Pincode) {
      errors.pincode = "Please enter your pincode.";
    } else if (!/^\d{6}$/.test(Pincode)) {
      errors.pincode = "Pincode must be exactly 6 digits.";
    }

    if (!Phone) {
      errors.phone = "Please enter your phone number.";
    } else if (!/^\d{10}$/.test(Phone)) {
      errors.phone = "Phone number must be exactly 10 digits.";
    } else {
      const existingPhone = await db.get()
        .collection(collections.USERS_COLLECTION)
        .findOne({ Phone });

      if (existingPhone) {
        errors.phone = "This phone number is already registered.";
      }
    }

    if (!Fname) errors.fname = "Please enter your first name.";
    if (!Lname) errors.lname = "Please enter your last name.";
    if (!Email) errors.email = "Please enter your email.";
    if (!Address) errors.address = "Please enter your address.";
    if (!District) errors.district = "Please enter your district.";

    // Validate other fields as needed...

    // If there are validation errors, re-render the form with error messages
    if (Object.keys(errors).length > 0) {
      let userProfile = await userHelper.getUserDetails(req.params.id);
      return res.render("users/edit-profile", {
        admin: false,
        userProfile,
        user: req.session.user,
        errors,
        Fname,
        Lname,
        Email,
        Phone,
        Address,
        District,
        Pincode,
      });
    }

    // Update the user profile
    await userHelper.updateUserProfile(req.params.id, req.body);

    // Fetch the updated user profile and update the session
    let updatedUserProfile = await userHelper.getUserDetails(req.params.id);
    req.session.user = updatedUserProfile;

    // Redirect to the profile page
    res.redirect("/profile");
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).send("An error occurred while updating the profile.");
  }
});





router.get('/place-order/:id', verifySignedIn, async (req, res) => {
  const eventId = req.params.id;

  // Validate the event ID
  if (!ObjectId.isValid(eventId)) {
    return res.status(400).send('Invalid event ID format');
  }

  let user = req.session.user;

  // Fetch the product details by ID
  let event = await userHelper.getEventDetails(eventId);

  // If no event is found, handle the error
  if (!event) {
    return res.status(404).send('Event not found');
  }

  // Render the place-order page with event details
  res.render('users/place-order', { user, event });
});

router.post('/place-order', async (req, res) => {
  let user = req.session.user;
  let eventId = req.body.eventId;

  // Fetch event details
  let event = await userHelper.getEventDetails(eventId);
  let totalPrice = event.Price; // Get the price from the event

  // Call placeOrder function
  userHelper.placeOrder(req.body, event, totalPrice, user)
    .then((orderId) => {
      if (req.body["payment-method"] === "COD") {
        res.json({ codSuccess: true });
      } else {
        userHelper.generateRazorpay(orderId, totalPrice).then((response) => {
          res.json(response);
        });
      }
    })
    .catch((err) => {
      console.error("Error placing order:", err);
      res.status(500).send("Internal Server Error");
    });
});



router.post("/verify-payment", async (req, res) => {
  console.log(req.body);
  userHelper
    .verifyPayment(req.body)
    .then(() => {
      userHelper.changePaymentStatus(req.body["order[receipt]"]).then(() => {
        res.json({ status: true });
      });
    })
    .catch((err) => {
      res.json({ status: false, errMsg: "Payment Failed" });
    });
});

router.get("/order-placed", verifySignedIn, async (req, res) => {
  let user = req.session.user;
  let userId = req.session.user._id;
  // le = await userHelper.g(userId);
  res.render("users/order-placed", { admin: false, user });
});

router.get("/orders", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let userId = req.session.user._id;
  // Fetch user orders
  let orders = await userHelper.getUserOrder(userId);
  let bookings = await userHelper.getBookingsByUserId(userId);

  res.render("users/orders", { admin: false, user, orders, bookings });
});

router.get("/view-ordered-events/:id", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let orderId = req.params.id;

  // Log the orderId to see if it's correctly retrieved
  console.log("Retrieved Order ID:", orderId);

  // Check if orderId is valid
  if (!ObjectId.isValid(orderId)) {
    console.error('Invalid Order ID format:', orderId);  // Log the invalid ID
    return res.status(400).send('Invalid Order ID');
  }

  try {
    let events = await userHelper.getOrderEvents(orderId);
    res.render("users/order-events", {
      admin: false,
      user,
      events,
    });
  } catch (err) {
    console.error('Error fetching ordered events:', err);
    res.status(500).send('Internal Server Error');
  }
});



router.get("/cancel-order/:id", verifySignedIn, function (req, res) {
  let orderId = req.params.id;
  userHelper.cancelOrder(orderId).then(() => {
    res.redirect("/orders");
  });
});

router.post("/search", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let userId = req.session.user._id;
  // le = await userHelper.g(userId);
  userHelper.searchProduct(req.body).then((response) => {
    res.render("users/search-result", { admin: false, user, response });
  });
});


router.get("/all-services", verifySignedIn, function (req, res) {
  let user = req.session.user;
  res.render("users/all-services", { admin: false, user });
});


///////all gallery/////////////////////     

router.get("/gallery", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let galleries = await userHelper.getAllgalleries()
  res.render("users/gallery", { admin: false, galleries, user });
});

router.get("/all-galleries", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let galleries = await userHelper.getAllgalleries()
  res.render("users/secretary/all-galleries", { admin: false, galleries, user });
});

///////ADD gallerys/////////////////////                                         
router.get("/add-gallery", verifySignedIn, function (req, res) {
  let user = req.session.user;
  res.render("users/secretary/add-gallery", { admin: false, user });
});

///////ADD gallerys/////////////////////                                         
router.post("/add-gallery", function (req, res) {
  userHelper.addgallery(req.body, (id) => {
    let image = req.files.Image;
    image.mv("./public/images/gallery-images/" + id + ".png", (err, done) => {
      if (!err) {
        res.redirect("/all-galleries");
      } else {
        console.log(err);
      }
    });
  });
});

///////DELETE gallerys/////////////////////                                         
router.get("/delete-gallery/:id", verifySignedIn, function (req, res) {
  let galleryId = req.params.id;
  userHelper.deletegallery(galleryId).then((response) => {
    res.redirect("/all-galleries");
  });
});







module.exports = router;
