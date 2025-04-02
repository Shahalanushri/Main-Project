var express = require("express");
var userHelper = require("../helper/userHelper");
var adminHelper = require("../helper/adminHelper");
const crypto = require('crypto');
const Razorpay = require("razorpay");
var fs = require("fs");
const path = require("path");
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
  let activities = await userHelper.getAllactivities();
  let ads = await userHelper.getAllAds();
  userHelper.getAllevents().then((events) => {
    res.render("users/home", { admin: false, activities, events, user, ads });
  });
});



router.get("/all-ann", verifySignedIn, function (req, res) {
  let user = req.session.user;
  userHelper.getAllactivities().then((activities) => {
    res.render("users/all-ann", { admin: false, activities, user });
  });
});

//avilabilty
router.get("/check-pool-availability", async (req, res) => {
  const { timeSlot, personCount } = req.query;

  if (!timeSlot || !personCount) {
    return res.status(400).json({ error: "Time slot and person count are required" });
  }

  const result = await userHelper.checkSlotAvailability(timeSlot);

  if (result.availableSlots < personCount) {
    return res.json({ availableSlots: result.availableSlots, message: "Not enough slots available" });
  }

  res.json({ availableSlots: result.availableSlots, message: "Slots available" });
});

router.get("/check-hall-availability", async (req, res) => {
  const { timeSlot} = req.query;

  if (!timeSlot) {
    return res.status(400).json({ error: "Time slot and person count are required" });
  }

  const result = await userHelper.checkHallSlotAvailability(timeSlot);

  console.log(result,"lllllllll")

  if (result.availableSlots =="booked") {
    return res.json({ availableSlots: result.availableSlots, message: "Not enough slots available" });
  }

  res.json({ availableSlots: result.availableSlots, message: "Slots available" });
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

router.get("/tempvalidation", async function (req, res, next) {
  let user = req.session.user;
  res.render("users/tempvalidation", { admin: false, layout: 'empty', user });
});



router.get("/continue/:id", async function (req, res, next) {
  let user = req.session.user;
  let userId = req.session.user._id;
  let userProfile = await userHelper.getUserDetails(userId);
  res.render("users/continue", { admin: false, layout: 'empty', user, userProfile });
});


router.get("/tempcontinue/:id", async function (req, res, next) {
  let user = req.session.user;
  let userId = req.session.user._id;
  let userProfile = await userHelper.getUserDetailsTEMP(userId);
  res.render("users/tempcontinue", { admin: false, layout: 'empty', user, userProfile });
});



router.post("/tempcontinue/:id", verifySignedIn, async function (req, res) {
  try {
    const { Fname, Lname, Email, Phone, Address, District, Pincode } = req.body;
    let errors = {};

    // Validate first name
    if (!Fname || Fname.trim().length === 0) {
      errors.fname = 'Please enter your first name.';
    }

    // if (!District || District.trim().length === 0) {
    //   errors.district = 'Please enter your first name.';
    // }

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
    // if (!Pincode) {
    //   errors.pincode = "Please enter your pincode.";
    // } else if (!/^\d{6}$/.test(Pincode)) {
    //   errors.pincode = "Pincode must be exactly 6 digits.";
    // }

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
      return res.render("users/tempcontinue", {
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
    await userHelper.updateUserProfileTEMP(req.params.id, req.body);

    // Fetch the updated user profile and update the session
    let updatedUserProfile = await userHelper.getUserDetailsTEMP(req.params.id);
    req.session.user = updatedUserProfile;

    // Redirect to the profile page
    res.redirect("/temppayment");
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).send("An error occurred while updating the profile.");
  }
});


router.post("/continue/:id", verifySignedIn, async function (req, res) {
  try {
    const { Fname, Lname, Email, Phone, Address, District, Pincode } = req.body;
    let errors = {};

    // Validate first name
    if (!Fname || Fname.trim().length === 0) {
      errors.fname = 'Please enter your first name.';
    }

    // if (!District || District.trim().length === 0) {
    //   errors.district = 'Please enter your first name.';
    // }

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
    // if (!Pincode) {
    //   errors.pincode = "Please enter your pincode.";
    // } else if (!/^\d{6}$/.test(Pincode)) {
    //   errors.pincode = "Pincode must be exactly 6 digits.";
    // }

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


router.get("/temppayment", async function (req, res, next) {
  let user = req.session.user;
  res.render("users/temppayment", { admin: false, user, layout: 'empty' });
});


router.post('/create-ordertemp', async (req, res) => {
  try {
    const userId = req.session.user._id; // Retrieve userId from session
    const amount = 500; // Registration Fee amount

    const order = await userHelper.createOrder(amount);

    const updatedUser = await db
      .get()
      .collection(collections.TEMPUSERS_COLLECTION)
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



router.post('/tempverify', async (req, res) => {
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
        .collection(collections.TEMPUSERS_COLLECTION)
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



router.get("/tempuser", function (req, res) {
  res.render("users/tempuser", { admin: false, layout: 'empty' });
});

router.post("/tempuser", async function (req, res) {
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
    return res.render("users/tempuser", {
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
  userHelper.dotempSignup(req.body).then((response) => {
    req.session.signedIn = true;
    req.session.user = response;
    res.redirect("/tempvalidation");
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
    }
    // ✅ Check if the account is disabled
    else if (response.status === false && response.msg) {
      req.session.signInErr = response.msg;
      return res.redirect("/signin");
    }
    else if (response.status && response.user) {
      req.session.signedIn = true;
      req.session.user = response.user;

      // Redirect based on role
      switch (response.user.role) {
        case "President":
          return res.redirect("/president");
        case "Treasurer":
          return res.redirect("/treasurer");
        case "Business-owner":
          return res.redirect("/business-owner");
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






router.get("/tempsignin", function (req, res) {
  if (req.session.signedIn) {
    res.redirect("/home");
  } else {
    res.render("users/tempsignin", {
      admin: false,
      layout: 'empty',
      signInErr: req.session.signInErr,
    });
    req.session.signInErr = null;
  }
});


router.post("/tempsignin", function (req, res) {
  const { Email, Password } = req.body;

  if (!Email || !Password) {
    req.session.signInErr = "Please fill in all fields.";
    return res.render("users/tempsignin", {
      admin: false,
      layout: "empty",
      signInErr: req.session.signInErr,
      email: Email,
      password: Password,
    });
  }

  userHelper.doTempSignin(req.body).then((response) => {
    if (response.status === "pending") {
      req.session.signInErr = "User is not approved by admin.";
      return res.redirect("/tempsignin");
    } else if (response.status === "rejected") {
      req.session.signInErr = "This user is rejected by admin.";
      return res.redirect("/tempsignin");
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
        case "Temp-Residence":  // If user is a resident, go to /home
        default:
          return res.redirect("/home");
      }
    } else {
      req.session.signInErr = "Invalid Email/Password";
      return res.render("users/tempsignin", {
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

router.get("/registration", verifySignedIn, async function (req, res, next) {
  try {
    let user = req.session.user;
    let { fromDate, toDate } = req.query; // Get filter values from query parameters

    let users = await adminHelper.getFilteredUsers(fromDate, toDate);
    let { payments, grandTotal } = await adminHelper.getUserPayments(); // ✅ Get grand total

    res.render("users/registration", {
      admin: false,
      user,
      users,
      payments,
      grandTotal,  // ✅ Pass to HBS
      fromDate,
      toDate
    });
  } catch (err) {
    next(err);
  }
});



router.get("/event", verifySignedIn, async function (req, res, next) {
  try {
    let user = req.session.user;
    let { fromDate, toDate } = req.query;

    let orders = await adminHelper.getAllOrdersEvent(fromDate, toDate);
    let { payments, grandTotal } = await adminHelper.getUserPaymentsOrder();

    res.render("users/event", {
      admin: false,
      user,
      orders,  // ✅ Sorted Orders
      payments,
      grandTotal,
      fromDate,
      toDate
    });
  } catch (err) {
    next(err);
  }
});



router.get("/business-owner", verifySignedIn, async function (req, res, next) {
  let user = req.session.user;
  res.render("users/business-owner/home", { admin: false, user });
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

router.post("/book-now-pool", async (req, res) => {
  try {
    console.log(req.body, "poooollll")

    let bookingData = {
      title: "Pool",
      desc: req.body.desc,
      timeSlot: req.body.timeSlot,
      price: req.body.price,
      userId: req.body.userId,
      username: req.body.username,
      useremail: req.body.useremail,
      userphone: req.body.userphone,
      useraddress: req.body.useraddress,
      count: req.body.personCount,
      date: new Date()
    };
    console.log(bookingData, "bookdata")

    // Store booking data in the database
    await userHelper.storeBookingPool(bookingData);

    res.send("<script>alert('Booking Confirmed!'); window.location.href='/facilities';</script>"); // Redirect after success
  } catch (error) {
    console.error("Error in booking:", error);
    res.status(500).send("Something went wrong. Please try again.", error);
  }
});

router.post("/book-now-hall", async (req, res) => {
  try {
    console.log(req.body, "poooollll")

    let bookingData = {
      title: "Hall",
      desc: req.body.desc,
      timeSlot: req.body.timeSlot,
      price: req.body.price,
      userId: req.body.userId,
      username: req.body.username,
      useremail: req.body.useremail,
      userphone: req.body.userphone,
      useraddress: req.body.useraddress,
      date: new Date()
    };
    console.log(bookingData, "bookdata")

    // Store booking data in the database
    await userHelper.storeBookingHall(bookingData);

    res.send("<script>alert('Booking Confirmed!'); window.location.href='/facilities';</script>"); // Redirect after success
  } catch (error) {
    console.error("Error in booking:", error);
    res.status(500).send("Something went wrong. Please try again.", error);
  }
});

router.get("/reset-pool-availability", async (req, res) => {
  try {
    await userHelper.resetPoolAvailability();
    res.redirect("/facilities")
    console.log("Pool availability reset successfully");
  } catch (error) {
    res.status(500).json({ success: false, message: "Error resetting pool availability", error });
  }
});

router.get("/reset-hall-availability", async (req, res) => {
  try {
    await userHelper.resetHallAvailability();
    res.redirect("/facilities")
    console.log("Hall availability reset successfully");
  } catch (error) {
    res.status(500).json({ success: false, message: "Error resetting pool availability", error });
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


router.get("/alerts", verifySignedIn, function (req, res) {
  let user = req.session.user;
  userHelper.getAllcontacts().then((contacts) => {
    res.render("users/alerts", { admin: false, contacts, user });
  });
});



router.get("/emergency", verifySignedIn, function (req, res) {
  let user = req.session.user;
  userHelper.getAllcontacts().then((contacts) => {
    res.render("users/emergency", { admin: false, contacts, user });
  });
});



router.get("/main", verifySignedIn, function (req, res) {
  let user = req.session.user;
  userHelper.getAllmcontacts().then((mcontacts) => {
    res.render("users/main", { admin: false, mcontacts, user });
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





///////ALL mcontact/////////////////////                                         
router.get("/all-mcontacts", verifySignedIn, function (req, res) {
  let user = req.session.user;
  userHelper.getAllmcontacts().then((mcontacts) => {
    res.render("users/secretary/all-mcontacts", { admin: false, mcontacts, user });
  });
});

///////ADD mcontacts/////////////////////                                         
router.get("/add-mcontact", verifySignedIn, function (req, res) {
  let user = req.session.user;
  res.render("users/secretary/add-mcontact", { admin: false, user });
});

///////ADD mcontacts/////////////////////                                         
router.post("/add-mcontact", function (req, res) {
  userHelper.addmcontact(req.body, (id) => {
    res.redirect("/all-mcontacts");

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


///////DELETE contacts/////////////////////                                         
router.get("/delete-mcontact/:id", verifySignedIn, function (req, res) {
  let contactId = req.params.id;
  userHelper.mdeletecontact(contactId).then((response) => {
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
    if (req.files && req.files.Image) {
      let image = req.files.Image;
      image.mv("./public/images/event-images/" + id + ".png", (err) => {
        if (err) {
          console.log(err);
        }
      });
    }
    res.redirect("/all-events"); // Redirect whether or not an image exists
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
  try {
    let user = req.session.user;
    let eventId = req.body.eventId;
    let numberOfSeats = parseInt(req.body.noseat) || 1; // Get the number of seats (default: 1)

    // Fetch event details
    let event = await userHelper.getEventDetails(eventId);
    let totalPrice = event.Price * numberOfSeats; // Multiply price by number of seats

    // Call placeOrder function with updated total price
    userHelper.placeOrder(req.body, event, totalPrice, user)
      .then((orderId) => {
        if (req.body["payment-method"] === "COD") {
          res.json({ codSuccess: true });
        } else {
          // Generate Razorpay order with correct total amount
          userHelper.generateRazorpay(orderId, totalPrice).then((response) => {
            res.json(response);
          });
        }
      })
      .catch((err) => {
        console.error("Error placing order:", err);
        res.status(500).send("Internal Server Error");
      });

  } catch (error) {
    console.error("Error in place-order route:", error);
    res.status(500).send("Internal Server Error");
  }
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



router.get("/cancel-booking/:id", verifySignedIn, function (req, res) {
  let bookingId = req.params.id;
  userHelper.cancelBooking(bookingId).then(() => {
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


router.get("/view-poll", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let polls = await userHelper.getAllApolls();
  let voteCounts = await userHelper.getPollVoteCounts(); // Aggregated vote counts

  res.render("users/view-poll", {
    admin: false,
    polls,
    user,
    voteCounts: JSON.stringify(voteCounts), // Pass as JSON string to HBS
  });
});



router.get("/view-survey", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let allSurveys = await userHelper.surveys();

  let filteredSurveys = allSurveys.filter(survey => {
    const opt = survey.responses?.option_0?.toLowerCase()?.trim();
    return opt === "yes";
  });

  res.render("users/view-survey", {
    admin: false,
    surveys: filteredSurveys,
    user
  });
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
  console.log("dsds", galleries);

  res.render("users/secretary/all-galleries", { admin: false, galleries, user });
});

///////ADD gallerys/////////////////////                                         
router.get("/add-gallery", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let events = await userHelper.getAllevents();
  res.render("users/secretary/add-gallery", { admin: false, user, events });
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






///////ALL event/////////////////////                                         
router.get("/all-polls", verifySignedIn, function (req, res) {
  let user = req.session.user;
  userHelper.getAllpolls().then((polls) => {
    res.render("users/secretary/all-polls", { admin: false, polls, user });
  });
});


///////ADD polls/////////////////////                                   
router.get("/add-poll", verifySignedIn, function (req, res) {
  let user = req.session.user;
  res.render("users/secretary/add-poll", { admin: false, user });
});

/////// ADD POLL /////////////////////
router.post("/add-poll", function (req, res) {
  console.log("Received Data:", req.body); // Check what is received

  let { title, date, content, desc } = req.body;
  let options = req.body["options[]"] || req.body.options; // Handle both formats

  if (!options) {
    console.log("Error: Options are undefined!");
    return res.render("users/secretary/add-poll", {
      admin: false,
      user: req.session.user,
      errorMessage: "Options are missing! Please try again."
    });
  }

  if (!Array.isArray(options)) {
    options = [options]; // Convert single option to an array
  }

  options = options.map(opt => opt.trim()).filter(opt => opt !== ""); // Trim and remove empty values

  console.log("Filtered Options before saving:", options);

  if (options.length === 0) {
    return res.render("users/secretary/add-poll", {
      admin: false,
      user: req.session.user,
      errorMessage: "At least one valid option is required!"
    });
  }

  // ✅ Add createdAt field
  let pollData = { title, date, content, desc, options, createdAt: new Date() };

  console.log("Final Data to Save:", pollData);

  userHelper.addpoll(pollData, (id) => {
    res.redirect("/all-polls");
  });
});



router.get("/delete-poll/:id", verifySignedIn, function (req, res) {
  let pollId = req.params.id;
  userHelper.deletepoll(pollId).then((response) => {
    res.redirect("/all-polls");
  });
});



router.get("/survey", verifySignedIn, function (req, res) {
  let user = req.session.user;
  userHelper.getAllsurvey().then((survey) => {
    res.render("users/survey", { admin: false, survey, user });
  });
});

router.post("/submit-survey/:id", (req, res) => {
  let user = req.session.user;
  const surveyId = req.params.id;
  const responses = req.body; // Captures all Yes/No choices

  console.log("Survey Responses:", responses);

  // Store responses in DB with createdAt field
  db.get()
    .collection(collections.SURVEY_ANS_COLLECTION)
    .insertOne({ surveyId, responses, user, createdAt: new Date() }) // Add createdAt
    .then(() => res.redirect("/all-services"))
    .catch((err) => console.error("Error saving responses:", err));
});





router.get("/poll", verifySignedIn, function (req, res) {
  let user = req.session.user;
  userHelper.getAllpolls().then((poll) => {
    res.render("users/poll", { admin: false, poll, user });
  });
});

router.post("/submit-poll/:id", (req, res) => {
  let user = req.session.user;
  const pollId = req.params.id;
  const responses = req.body; // Captures all Yes/No choices

  console.log("Poll Responses:", responses);

  // Store responses in DB (modify as needed)
  db.get()
    .collection(collections.POLL_ANS_COLLECTION)
    .insertOne({ pollId, responses, user, createdAt: new Date() })
    .then(() => res.redirect("/all-services"))
    .catch((err) => console.error("Error saving responses:", err));
});







///////ALL SURVEY/////////////////////                                         
router.get("/all-survey", verifySignedIn, function (req, res) {
  let user = req.session.user;
  userHelper.getAllsurvey().then((survey) => {
    res.render("users/secretary/all-survey", { admin: false, survey, user });
  });
});


///////ADD polls/////////////////////                                   
router.get("/add-survey", verifySignedIn, function (req, res) {
  let user = req.session.user;
  res.render("users/secretary/add-survey", { admin: false, user });
});

/////// ADD SURVEY /////////////////////
router.post("/add-survey", function (req, res) {
  console.log("Received Data:", req.body); // Check what is received

  let { title, date, content, desc } = req.body;
  let options = req.body["options[]"] || req.body.options; // Handle both formats

  if (!options) {
    console.log("Error: Options are undefined!");
    return res.render("users/secretary/add-survey", {
      admin: false,
      user: req.session.user,
      errorMessage: "Options are missing! Please try again."
    });
  }

  if (!Array.isArray(options)) {
    options = [options]; // Convert single option to an array
  }

  options = options.map(opt => opt.trim()).filter(opt => opt !== ""); // Trim and remove empty values

  console.log("Filtered Options before saving:", options);

  if (options.length === 0) {
    return res.render("users/secretary/add-survey", {
      admin: false,
      user: req.session.user,
      errorMessage: "At least one valid option is required!"
    });
  }

  // ✅ Add createdAt field
  let surveyData = { title, date, content, desc, options, createdAt: new Date() };

  console.log("Final Data to Save:", surveyData);

  userHelper.addsurvey(surveyData, (id) => {
    res.redirect("/all-survey");
  });
});



router.get("/delete-survey/:id", verifySignedIn, function (req, res) {
  let surveyId = req.params.id;
  userHelper.deletesurvey(surveyId).then((response) => {
    res.redirect("/all-survey");
  });
});




router.get("/business", verifySignedIn, function (req, res) {
  let user = req.session.user;
  adminHelper.getAllProducts().then((products) => {
    res.render("users/business", { admin: false, products, user });
  });
});


// router.get("/all-products", verifySignedIn, function (req, res) {
//   let user = req.session.user;
//   res.render("users/business-owner/all-products", { admin: false, user });
// });



router.get("/all-products", verifySignedIn, function (req, res) {
  let user = req.session.user;

  userHelper.getAllProductsByid(user._id).then((products) => {
    res.render("users/all-products", { admin: false, products, user });
  });
});


router.get("/add-product", verifySignedIn, function (req, res) {
  let user = req.session.user;
  res.render("users/add-product", { admin: false, user });
});

router.post("/add-product", function (req, res) {
  let userId = req.session.user ? req.session.user._id : null; // Get userId from session

  if (!userId) {
    return res.status(401).send("Unauthorized: User not logged in.");
  }

  let productData = { ...req.body, userId }; // Add userId to product data

  adminHelper.addProduct(productData, (id) => {
    let image = req.files.Image;
    image.mv("./public/images/product-images/" + id + ".png", (err, done) => {
      if (!err) {
        res.redirect("/all-products");
      } else {
        console.log(err);
      }
    });
  });
});



router.get("/delete-product/:id", verifySignedIn, function (req, res) {
  let productId = req.params.id;
  adminHelper.deleteProduct(productId).then((response) => {
    fs.unlinkSync("./public/images/product-images/" + productId + ".png");
    res.redirect("/all-products");
  });
});








router.get("/all-ads", verifySignedIn, function (req, res) {
  let user = req.session.user;
  userHelper.getAllAds().then((ads) => {
    res.render("users/all-ads", { admin: false, ads, user });
  });
});


router.get("/add-ad", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let products = await adminHelper.getAllProducts();
  res.render("users/add-ad", { admin: false, user, products });
});

router.post("/add-ad", function (req, res) {
  adminHelper.addAd(req.body, (id) => {
    let image = req.files.Image;
    image.mv("./public/images/ad-images/" + id + ".png", (err, done) => {
      if (!err) {
        res.redirect("/all-ads");
      } else {
        console.log(err);
      }
    });
  });
});


router.get("/delete-ad/:id", verifySignedIn, function (req, res) {
  let adId = req.params.id;
  adminHelper.deleteAd(adId).then((response) => {
    fs.unlinkSync("./public/images/ad-images/" + adId + ".png");
    res.redirect("/all-ads");
  });
});



module.exports = router;
