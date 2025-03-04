var db = require("../config/connection");
var collections = require("../config/collections");
const bcrypt = require("bcrypt");
const objectId = require("mongodb").ObjectID;
const Razorpay = require("razorpay");
const ObjectId = require('mongodb').ObjectId; // Required to convert string to ObjectId


var instance = new Razorpay({
  key_id: "rzp_test_8NokNgt8cA3Hdv",
  key_secret: "xPzG53EXxT8PKr34qT7CTFm9",
});

module.exports = {


  storeBooking: (bookingData) => {
    return new Promise(async (resolve, reject) => {
      try {
        const facilitiesCollection = db.get().collection(collections.FACILITIE_COLLECTION);
        const bookingsCollection = db.get().collection(collections.FACILITIE_BOOKINGS);

        // Convert userId to ObjectId
        if (bookingData.userId) {
          bookingData.userId = new ObjectId(bookingData.userId);
        }

        // Get the current availability of the facility
        let facility = await facilitiesCollection.findOne({ title: bookingData.title });

        if (!facility) {
          return reject("Facility not found");
        }

        let newAvailability = facility.availability - parseInt(bookingData.count);

        if (newAvailability < 0) {
          return reject("Not enough availability left");
        }

        // Insert the booking into FACILITIE_BOOKINGS
        let booking = await bookingsCollection.insertOne(bookingData);

        // Update the availability in FACILITIE_COLLECTION
        await facilitiesCollection.updateOne(
          { title: bookingData.title },
          { $set: { availability: newAvailability } }
        );

        resolve(booking);
      } catch (error) {
        reject(error);
      }
    });
  },


  cancelBooking: (bookingId, crackedCount) => {
    return new Promise(async (resolve, reject) => {
      try {
        const dbInstance = db.get();
        const bookingsCollection = dbInstance.collection(collections.FACILITIE_BOOKINGS);
        const facilitiesCollection = dbInstance.collection(collections.FACILITIE_COLLECTION);

        // Find the booking details
        let booking = await bookingsCollection.findOne({ _id: new ObjectId(bookingId) });

        if (!booking) {
          return reject("Booking not found");
        }

        let restoredCount = booking.count - crackedCount; // Restore only non-cracked items

        // Update facility availability
        await facilitiesCollection.updateOne(
          { title: booking.title },
          { $inc: { availability: restoredCount, cracked: crackedCount } } // Increase cracked count
        );

        // Remove the booking
        await bookingsCollection.deleteOne({ _id: new ObjectId(bookingId) });

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },


  getBookingsByUserId: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const bookingsCollection = db.get().collection(collections.FACILITIE_BOOKINGS);

        // Fetch bookings based on userId
        let bookings = await bookingsCollection.find({ userId: new ObjectId(userId) }).toArray();

        resolve(bookings);
      } catch (error) {
        reject(error);
      }
    });
  },


  ///////ADD galleries/////////////////////                                         
  addgallery: (gallery, callback) => {
    console.log(gallery);
    gallery.Price = parseInt(gallery.Price);
    db.get()
      .collection(collections.GALLERY_COLLECTION)
      .insertOne(gallery)
      .then((data) => {
        console.log(data);
        callback(data.ops[0]._id);
      });
  },

  ///////GET ALL galleries/////////////////////                                            
  getAllgalleries: () => {
    return new Promise(async (resolve, reject) => {
      let galleries = await db
        .get()
        .collection(collections.GALLERY_COLLECTION)
        .find()
        .toArray();
      resolve(galleries);
    });
  },

  ///////ADD galleries DETAILS/////////////////////                                            
  getgalleryDetails: (galleryId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.GALLERY_COLLECTION)
        .findOne({
          _id: objectId(galleryId)
        })
        .then((response) => {
          resolve(response);
        });
    });
  },

  ///////DELETE galleries/////////////////////                                            
  deletegallery: (galleryId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.GALLERY_COLLECTION)
        .removeOne({
          _id: objectId(galleryId)
        })
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },


  ///////ADD facilities/////////////////////                                         
  addfacilitie: (facilitie, callback) => {
    console.log(facilitie);
    facilitie.Price = parseInt(facilitie.Price);
    db.get()
      .collection(collections.FACILITIE_COLLECTION)
      .insertOne(facilitie)
      .then((data) => {
        console.log(data);
        callback(data.ops[0]._id);
      });
  },

  ///////GET ALL facilities/////////////////////                                            
  getAllfacilities: () => {
    return new Promise(async (resolve, reject) => {
      let facilities = await db
        .get()
        .collection(collections.FACILITIE_COLLECTION)
        .find()
        .toArray();
      resolve(facilities);
    });
  },

  ///////ADD facilities DETAILS/////////////////////                                            
  getfacilitieDetails: (facilitieId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.FACILITIE_COLLECTION)
        .findOne({
          _id: objectId(facilitieId)
        })
        .then((response) => {
          resolve(response);
        });
    });
  },

  ///////DELETE facilities/////////////////////                                            
  deletefacilitie: (facilitieId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.FACILITIE_COLLECTION)
        .removeOne({
          _id: objectId(facilitieId)
        })
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },

  ///////UPDATE facilities/////////////////////                                            
  updatefacilitie: (facilitieId, facilitieDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.FACILITIE_COLLECTION)
        .updateOne(
          {
            _id: objectId(facilitieId)
          },
          {
            $set: {
              Name: facilitieDetails.Name,
              Category: facilitieDetails.Category,
              Price: facilitieDetails.Price,
              Description: facilitieDetails.Description,
            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },


  ///////DELETE ALL facilities/////////////////////                                            
  deleteAllfacilities: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.FACILITIE_COLLECTION)
        .remove({})
        .then(() => {
          resolve();
        });
    });
  },






  ///////ADD facilities/////////////////////                                         
  addactivity: async (activity, callback) => {
    try {
      console.log(activity);
      activity.Price = parseInt(activity.Price);

      let dbInstance = db.get();

      // Insert activity into the database
      let activityResult = await dbInstance
        .collection(collections.ACTIVITY_COLLECTION)
        .insertOne(activity);

      let activityId = activityResult.insertedId;

      // Fetch all users
      let users = await dbInstance.collection(collections.USERS_COLLECTION).find({}).toArray();

      // Prepare notification object
      let notifications = users.map((user) => ({
        userId: user._id,
        message: `New Announcement: ${activity.Title}`,
        activityId: activityId,
        createdAt: new Date(),
        isRead: false,
      }));

      // Insert notifications into NOTIFICATION_COLLECTION
      await dbInstance.collection(collections.NOTIFICATIONS_COLLECTION).insertMany(notifications);

      callback(activityId);
    } catch (error) {
      console.log("Error adding activity:", error);
    }
  },
  ///////GET ALL activities/////////////////////                                            
  getAllactivities: () => {
    return new Promise(async (resolve, reject) => {
      let activities = await db
        .get()
        .collection(collections.ACTIVITY_COLLECTION)
        .find()
        .toArray();
      resolve(activities);
    });
  },

  ///////ADD activities DETAILS/////////////////////                                            
  getactivityDetails: (activityId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ACTIVITY_COLLECTION)
        .findOne({
          _id: objectId(activityId)
        })
        .then((response) => {
          resolve(response);
        });
    });
  },

  ///////DELETE activities/////////////////////                                            
  deleteactivity: (activityId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ACTIVITY_COLLECTION)
        .removeOne({
          _id: objectId(activityId)
        })
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },

  ///////UPDATE activities/////////////////////                                            
  updateactivity: (activityId, activityDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ACTIVITY_COLLECTION)
        .updateOne(
          {
            _id: objectId(activityId)
          },
          {
            $set: {
              Name: activityDetails.Name,
              Category: activityDetails.Category,
              Price: activityDetails.Price,
              Description: activityDetails.Description,
            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },


  ///////DELETE ALL activities/////////////////////                                            
  deleteAllactivities: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ACTIVITY_COLLECTION)
        .remove({})
        .then(() => {
          resolve();
        });
    });
  },



  ///////ADD contacts/////////////////////                                         
  addcontact: (contact, callback) => {
    console.log(contact);
    contact.Price = parseInt(contact.Price);
    db.get()
      .collection(collections.CONTACT_COLLECTION)
      .insertOne(contact)
      .then((data) => {
        console.log(data);
        callback(data.ops[0]._id);
      });
  },

  ///////GET ALL contacts/////////////////////                                            
  getAllcontacts: () => {
    return new Promise(async (resolve, reject) => {
      let contacts = await db
        .get()
        .collection(collections.CONTACT_COLLECTION)
        .find()
        .toArray();
      resolve(contacts);
    });
  },

  ///////ADD contacts DETAILS/////////////////////                                            
  getcontactDetails: (contactId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.CONTACT_COLLECTION)
        .findOne({
          _id: objectId(contactId)
        })
        .then((response) => {
          resolve(response);
        });
    });
  },

  ///////DELETE contacts/////////////////////                                            
  deletecontact: (contactId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.CONTACT_COLLECTION)
        .removeOne({
          _id: objectId(contactId)
        })
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },

  ///////UPDATE contacts/////////////////////                                            
  updatecontact: (contactId, contactDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.CONTACT_COLLECTION)
        .updateOne(
          {
            _id: objectId(contactId)
          },
          {
            $set: {
              Name: contactDetails.Name,
              Category: contactDetails.Category,
              Price: contactDetails.Price,
              Description: contactDetails.Description,
            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },


  ///////DELETE ALL contacts/////////////////////                                            
  deleteAllcontacts: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.CONTACT_COLLECTION)
        .remove({})
        .then(() => {
          resolve();
        });
    });
  },







  ///////ADD events/////////////////////                                         
  addevent: (event, callback) => {
    console.log(event);
    event.Price = parseInt(event.Price);
    db.get()
      .collection(collections.EVENT_COLLECTION)
      .insertOne(event)
      .then((data) => {
        console.log(data);
        callback(data.ops[0]._id);
      });
  },

  ///////GET ALL events/////////////////////                                            
  getAllevents: () => {
    return new Promise(async (resolve, reject) => {
      let events = await db
        .get()
        .collection(collections.EVENT_COLLECTION)
        .find()
        .toArray();
      resolve(events);
    });
  },

  ///////ADD events DETAILS/////////////////////                                            
  geteventDetails: (eventId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.EVENT_COLLECTION)
        .findOne({
          _id: objectId(eventId)
        })
        .then((response) => {
          resolve(response);
        });
    });
  },

  ///////DELETE events/////////////////////                                            
  deleteevent: (eventId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.EVENT_COLLECTION)
        .removeOne({
          _id: objectId(eventId)
        })
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },

  ///////UPDATE events/////////////////////                                            
  updateevent: (eventId, eventDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.EVENT_COLLECTION)
        .updateOne(
          {
            _id: objectId(eventId)
          },
          {
            $set: {
              Name: eventDetails.Name,
              Category: eventDetails.Category,
              Price: eventDetails.Price,
              Description: eventDetails.Description,
            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },


  ///////DELETE ALL events/////////////////////                                            
  deleteAllevents: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.EVENT_COLLECTION)
        .remove({})
        .then(() => {
          resolve();
        });
    });
  },




  getnotificationById: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Fetch notifications based on userId (converted to ObjectId)
        const notifications = await db.get()
          .collection(collections.NOTIFICATIONS_COLLECTION)
          .find({ userId: ObjectId(userId) }) // Filter by logged-in userId
          .toArray();

        resolve(notifications);
      } catch (error) {
        reject(error);
      }
    });
  },

  addfamily: (family) => {
    return new Promise(async (resolve, reject) => {
      try {
        family.userId = new ObjectId(family.userId); // Ensure it's an ObjectId

        await db.get()
          .collection(collections.FAMILY)
          .insertOne(family);

        resolve(); // Successfully added
      } catch (error) {
        reject(error); // Handle errors
      }
    });
  },

  getFamilyByUserId: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const family = await db.get()
          .collection(collections.FAMILY)
          .find({ userId: new ObjectId(userId) }) // Ensure `userId` is an ObjectId
          .toArray();

        resolve(family); // Return array of family members
      } catch (error) {
        reject(error); // Handle errors
      }
    });
  },





  addFeedback: (feedback) => {
    return new Promise(async (resolve, reject) => {
      try {
        await db.get()
          .collection(collections.FEEDBACK_COLLECTION)
          .insertOne(feedback);
        resolve(); // Resolve the promise on success
      } catch (error) {
        reject(error); // Reject the promise on error
      }
    });
  },


  createOrder: async (amount, currency = 'INR') => {
    try {
      const options = {
        amount: amount * 100, // Amount in paise
        currency,
        receipt: `order_rcptid_${Date.now()}`,
      };

      const order = await instance.orders.create(options);
      return order; // Return the created order object
    } catch (error) {
      throw error; // Handle errors
    }
  },



  getFeedbackByEventId: (eventId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const feedbacks = await db.get()
          .collection(collections.FEEDBACK_COLLECTION)
          .find({ eventId: ObjectId(eventId) }) // Convert eventId to ObjectId
          .toArray();

        resolve(feedbacks);
      } catch (error) {
        reject(error);
      }
    });
  },


  getBuilderById: (builderId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const builder = await db.get()
          .collection(collections.BUILDER_COLLECTION)
          .findOne({ _id: ObjectId(builderId) });
        resolve(builder);
      } catch (error) {
        reject(error);
      }
    });
  },








  ///////GET ALL event/////////////////////     

  getAllevents: () => {
    return new Promise(async (resolve, reject) => {
      let events = await db
        .get()
        .collection(collections.EVENT_COLLECTION)
        .find()
        .toArray();
      resolve(events);
    });
  },

  getEventById: (eventId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const event = await db.get()
          .collection(collections.EVENT_COLLECTION)
          .findOne({ _id: ObjectId(eventId) }); // Convert eventId to ObjectId
        resolve(event);
      } catch (error) {
        reject(error);
      }
    });
  },

  // getAllevents: (builderId) => {
  //   return new Promise(async (resolve, reject) => {
  //     let events = await db
  //       .get()
  //       .collection(collections.EVENT_COLLECTION)
  //       .find({ builderId: objectId(builderId) }) // Filter by builderId
  //       .toArray();
  //     resolve(events);
  //   });
  // },

  /////// event DETAILS/////////////////////                                            
  geteventDetails: (eventId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.EVENT_COLLECTION)
        .findOne({
          _id: objectId(eventId)
        })
        .then((response) => {
          resolve(response);
        });
    });
  },

  getAllProducts: () => {
    return new Promise(async (resolve, reject) => {
      let products = await db
        .get()
        .collection(collections.PRODUCTS_COLLECTION)
        .find()
        .toArray();
      resolve(products);
    });
  },

  doSignup: (userData) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Hash the password
        userData.Password = await bcrypt.hash(userData.Password, 10);
        userData.approved = false; // Set approved to false initially
        userData.role = 'Residence'; // Set approved to false initially

        // Set default values
        userData.isDisable = false;  // User is not disabled by default
        userData.createdAt = new Date();  // Set createdAt to the current date and time

        // Insert the user into the database
        db.get()
          .collection(collections.USERS_COLLECTION)
          .insertOne(userData)
          .then((data) => {
            // Resolve with the inserted user data
            resolve(data.ops[0]);
          })
          .catch((err) => {
            // Reject with any error during insertion
            reject(err);
          });
      } catch (err) {
        reject(err);  // Reject in case of any error during password hashing
      }
    });
  },

  // doSignin: (userData) => {
  //   return new Promise(async (resolve, reject) => {
  //     let response = {};

  //     // Find user by email
  //     let user = await db
  //       .get()
  //       .collection(collections.USERS_COLLECTION)
  //       .findOne({ Email: userData.Email });

  //     // If user exists, check if the account is disabled
  //     if (user) {
  //       if (user.isDisable) {
  //         // If the account is disabled, return the msg from the user collection
  //         response.status = false;
  //         response.msg = user.msg || "Your account has been disabled.";
  //         return resolve(response);
  //       }


  //       // Compare passwords
  //       bcrypt.compare(userData.Password, user.Password).then((status) => {
  //         if (status) {
  //           console.log("Login Success");
  //           response.user = user;
  //           response.status = true;
  //           resolve(response);  // Successful login
  //         } else {
  //           console.log("Login Failed");
  //           resolve({ status: false });  // Invalid password
  //         }
  //       });
  //     } else {
  //       console.log("Login Failed");
  //       resolve({ status: false });  // User not found
  //     }
  //   });
  // },


  // doSignin: (userData) => {
  //   return new Promise(async (resolve, reject) => {
  //     let response = {};
  //     let user = await db
  //       .get()
  //       .collection(collections.USERS_COLLECTION)
  //       .findOne({ Email: userData.Email });
  //     if (user) {
  //       if (user.rejected) {
  //         console.log("User is rejected");
  //         resolve({ status: "rejected" });
  //       } else {
  //         bcrypt.compare(userData.Password, user.Password).then((status) => {
  //           if (status) {
  //             if (user.approved) {
  //               console.log("Login Success");
  //               response.user = user;
  //               response.status = true;
  //             } else {
  //               console.log("User not approved");
  //               response.status = "pending";
  //             }
  //             resolve(response);
  //           } else {
  //             console.log("Login Failed - Incorrect Password");
  //             resolve({ status: false });
  //           }
  //         });
  //       }
  //     } else {
  //       console.log("Login Failed - Email not found");
  //       resolve({ status: false });
  //     }
  //   });
  // },


  doSignin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let response = {};
      let user = await db
        .get()
        .collection(collections.USERS_COLLECTION)
        .findOne({ Email: userData.Email });

      if (!user) {
        console.log("Login Failed - Email not found");
        return resolve({ status: false });
      }

      if (user.rejected) {
        console.log("User is rejected");
        return resolve({ status: "rejected" });
      }

      bcrypt.compare(userData.Password, user.Password).then((status) => {
        if (!status) {
          console.log("Login Failed - Incorrect Password");
          return resolve({ status: false });
        }

        if (!user.approved) {
          console.log("User not approved");
          return resolve({ status: "pending" });
        }

        console.log("Login Success");
        response.user = user;
        response.status = true;
        resolve(response);
      });
    });
  },

  getUserDetails: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.USERS_COLLECTION)
        .findOne({ _id: objectId(userId) })
        .then((user) => {
          resolve(user);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },

  updateUserProfile: (userId, userDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.USERS_COLLECTION)
        .updateOne(
          { _id: objectId(userId) },
          {
            $set: {
              Fname: userDetails.Fname,
              Lname: userDetails.Lname,
              Email: userDetails.Email,
              Phone: userDetails.Phone,
              Address: userDetails.Address,
              District: userDetails.District,
              Pincode: userDetails.Pincode,
            },
          }
        )
        .then((response) => {
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  },


  getTotalAmount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let total = await db
        .get()
        .collection(collections.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: objectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collections.PRODUCTS_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $multiply: ["$quantity", "$product.Price"] } },
            },
          },
        ])
        .toArray();
      console.log(total[0].total);
      resolve(total[0].total);
    });
  },




  getEventDetails: (eventId) => {
    return new Promise((resolve, reject) => {
      if (!ObjectId.isValid(eventId)) {
        reject(new Error('Invalid event ID format'));
        return;
      }

      db.get()
        .collection(collections.EVENT_COLLECTION)
        .findOne({ _id: ObjectId(eventId) })
        .then((event) => {
          if (!event) {
            reject(new Error('Event not found'));
          } else {
            // Assuming the event has a builderId field
            resolve(event);
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  },




  placeOrder: (order, event, total, user) => {
    return new Promise(async (resolve, reject) => {
      try {
        console.log(order, event, total);
        let status = order["payment-method"] === "COD" ? "placed" : "pending";

        // Get the event document to check the current seat value
        const eventDoc = await db.get()
          .collection(collections.EVENT_COLLECTION)
          .findOne({ _id: objectId(event._id) });

        // Check if the event exists and the seat field is present
        if (!eventDoc || !eventDoc.seat) {
          return reject(new Error("Event not found or seat field is missing."));
        }

        // Convert seat from string to number and check availability
        let seatCount = Number(eventDoc.seat);
        if (isNaN(seatCount) || seatCount <= 0) {
          return reject(new Error("Seat is not available."));
        }

        // Create the order object
        let orderObject = {
          deliveryDetails: {
            Fname: order.Fname,
            Lname: order.Lname,
            Email: order.Email,
            Phone: order.Phone,
            Address: order.Address,
            District: order.District,
            State: order.State,
            Pincode: order.Pincode,
            selecteddate: order.selecteddate,
          },
          userId: objectId(order.userId),
          user: user,
          paymentMethod: order["payment-method"],
          event: event,
          totalAmount: total,
          status: status,
          date: new Date(),
          builderId: event.builderId, // Store the builder's ID
        };

        // Insert the order into the database
        const response = await db.get()
          .collection(collections.ORDER_COLLECTION)
          .insertOne(orderObject);

        // Decrement the seat count
        seatCount -= 1; // Decrement the seat count

        // Convert back to string and update the event seat count
        await db.get()
          .collection(collections.EVENT_COLLECTION)
          .updateOne(
            { _id: objectId(event._id) },
            { $set: { seat: seatCount.toString() } } // Convert number back to string
          );

        resolve(response.ops[0]._id);
      } catch (error) {
        console.error("Error placing order:", error);
        reject(error);
      }
    });
  },


  getUserOrder: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let orders = await db
          .get()
          .collection(collections.ORDER_COLLECTION)
          .find({ userId: ObjectId(userId) }) // Use 'userId' directly, not inside 'orderObject'
          .toArray();

        resolve(orders);
      } catch (error) {
        reject(error);
      }
    });
  },

  getOrderEvents: (orderId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let events = await db
          .get()
          .collection(collections.ORDER_COLLECTION)
          .aggregate([
            {
              $match: { _id: objectId(orderId) }, // Match the order by its ID
            },
            {
              $project: {
                // Include event, user, and other relevant fields
                event: 1,
                user: 1,
                paymentMethod: 1,
                totalAmount: 1,
                status: 1,
                date: 1,
                deliveryDetails: 1, // Add deliveryDetails to the projection

              },
            },
          ])
          .toArray();

        resolve(events[0]); // Fetch the first (and likely only) order matching this ID
      } catch (error) {
        reject(error);
      }
    });
  },

  generateRazorpay: (orderId, totalPrice) => {
    return new Promise((resolve, reject) => {
      var options = {
        amount: totalPrice * 100, // amount in the smallest currency unit
        currency: "INR",
        receipt: "" + orderId,
      };
      instance.orders.create(options, function (err, order) {
        console.log("New Order : ", order);
        resolve(order);
      });
    });
  },

  verifyPayment: (details) => {
    return new Promise((resolve, reject) => {
      const crypto = require("crypto");
      let hmac = crypto.createHmac("sha256", "xPzG53EXxT8PKr34qT7CTFm9");

      hmac.update(
        details["payment[razorpay_order_id]"] +
        "|" +
        details["payment[razorpay_payment_id]"]
      );
      hmac = hmac.digest("hex");

      if (hmac == details["payment[razorpay_signature]"]) {
        resolve();
      } else {
        reject();
      }
    });
  },

  changePaymentStatus: (orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(orderId) },
          {
            $set: {
              "orderObject.status": "placed",
            },
          }
        )
        .then(() => {
          resolve();
        });
    });
  },

  cancelOrder: (orderId) => {
    return new Promise(async (resolve, reject) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .removeOne({ _id: objectId(orderId) })
        .then(() => {
          resolve();
        });
    });
  },

  searchProduct: (details) => {
    console.log(details);
    return new Promise(async (resolve, reject) => {
      db.get()
        .collection(collections.PRODUCTS_COLLECTION)
        .createIndex({ Name: "text" }).then(async () => {
          let result = await db
            .get()
            .collection(collections.PRODUCTS_COLLECTION)
            .find({
              $text: {
                $search: details.search,
              },
            })
            .toArray();
          resolve(result);
        })

    });
  },
};
