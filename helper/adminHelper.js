var db = require("../config/connection");
var collections = require("../config/collections");
var bcrypt = require("bcrypt");
const objectId = require("mongodb").ObjectID;
const { ObjectId } = require('mongodb'); // Import ObjectId for MongoDB

module.exports = {


  deleteExpiredActivities: async () => {
    try {
      let today = new Date().toISOString().split("T")[0]; // Get today's date (YYYY-MM-DD)

      // Delete all activities where date < today's date
      const result = await db.get()
        .collection(collections.ACTIVITY_COLLECTION)
        .deleteMany({ date: { $lt: today } });

      console.log(`Deleted ${result.deletedCount} expired activities.`);
    } catch (error) {
      console.error("Error deleting expired activities:", error);
    }
  },


  ///////GET ALL booking/////////////////////                                            
  getAllbookings: () => {
    return new Promise(async (resolve, reject) => {
      let bookings = await db
        .get()
        .collection(collections.FACILITIE_BOOKINGS)
        .find()
        .toArray();
      resolve(bookings);
    });
  },


  ///////ADD officer/////////////////////                                         
  addofficer: (officer, callback) => {
    // Add createdAt field with the current timestamp
    officer.createdAt = new Date();

    console.log(officer);
    db.get()
      .collection(collections.OFFICERS_COLLECTION)
      .insertOne(officer)
      .then((data) => {
        console.log(data);
        callback(data.ops[0]._id); // For MongoDB driver < v4.0
      })
      .catch((err) => {
        console.error('Error inserting officer:', err);
      });
  },


  ///////GET ALL officer/////////////////////                                            
  getAllofficers: () => {
    return new Promise(async (resolve, reject) => {
      let officers = await db
        .get()
        .collection(collections.OFFICERS_COLLECTION)
        .find()
        .toArray();
      resolve(officers);
    });
  },

  ///////ADD officer DETAILS/////////////////////                                            
  getofficerDetails: (officerId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.OFFICERS_COLLECTION)
        .findOne({
          _id: objectId(officerId)
        })
        .then((response) => {
          resolve(response);
        });
    });
  },

  ///////DELETE officer/////////////////////                                            
  deleteofficer: (officerId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.OFFICERS_COLLECTION)
        .removeOne({
          _id: objectId(officerId)
        })
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },

  ///////UPDATE officer/////////////////////                                            
  updateofficer: (officerId, officerDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.OFFICERS_COLLECTION)
        .updateOne(
          {
            _id: objectId(officerId)
          },
          {
            $set: {
              name: officerDetails.name,
              type: officerDetails.type,
              email: officerDetails.email,
              phone: officerDetails.phone,
              address: officerDetails.address,
              username: officerDetails.username,
              password: officerDetails.password,

            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },


  ///////DELETE ALL officer/////////////////////                                            
  deleteAllofficers: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.OFFICERS_COLLECTION)
        .remove({})
        .then(() => {
          resolve();
        });
    });
  },



  ///////ADD builder/////////////////////                                         
  addnotification: (notification, callback) => {
    console.log(notification);

    // Convert userId to ObjectId if it's present
    if (notification.userId) {
      notification.userId = new objectId(notification.userId);
    }

    // Add createdAt field with the current timestamp
    notification.createdAt = new Date();

    db.get()
      .collection(collections.NOTIFICATIONS_COLLECTION)
      .insertOne(notification)
      .then((data) => {
        console.log(data);
        callback(data.ops[0]._id);
      })
      .catch((err) => {
        console.error("Error inserting notification:", err);
        callback(null);  // Handle error case by passing null
      });
  },


  ///////GET ALL Notifications/////////////////////                                            
  getAllnotifications: () => {
    return new Promise(async (resolve, reject) => {
      try {
        // Fetch all notifications and join with users collection to get Fname
        let notifications = await db
          .get()
          .collection(collections.NOTIFICATIONS_COLLECTION)
          .aggregate([
            {
              $lookup: {
                from: collections.USERS_COLLECTION,  // Name of the users collection
                localField: "userId",  // Field in notifications collection (userId)
                foreignField: "_id",  // Field in users collection (_id)
                as: "userDetails",  // Name of the array where user data will be stored
              },
            },
            {
              $unwind: {
                path: "$userDetails",  // Flatten the userDetails array
                preserveNullAndEmptyArrays: true,  // If user not found, keep notification
              },
            },
          ])
          .toArray();

        // Map over the notifications and add user first name (Fname)
        notifications = notifications.map(notification => ({
          ...notification,
          userFname: notification.userDetails ? notification.userDetails.Fname : 'Unknown',  // Fname of user or 'Unknown' if no user found
        }));

        resolve(notifications);
      } catch (err) {
        reject(err);
      }
    });
  },

  deletenotification: (notificationId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.NOTIFICATIONS_COLLECTION)
        .removeOne({
          _id: objectId(notificationId)
        })
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },

  ///////ADD builder/////////////////////                                         
  addbuilder: (builder, callback) => {
    console.log(builder);
    builder.Price = parseInt(builder.Price);
    db.get()
      .collection(collections.BUILDER_COLLECTION)
      .insertOne(builder)
      .then((data) => {
        console.log(data);
        callback(data.ops[0]._id);
      });
  },

  ///////GET ALL builder/////////////////////                                            
  getAllbuilders: () => {
    return new Promise(async (resolve, reject) => {
      let builders = await db
        .get()
        .collection(collections.BUILDER_COLLECTION)
        .find()
        .toArray();
      resolve(builders);
    });
  },

  ///////ADD builder DETAILS/////////////////////                                            
  getbuilderDetails: (builderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.BUILDER_COLLECTION)
        .findOne({
          _id: objectId(builderId)
        })
        .then((response) => {
          resolve(response);
        });
    });
  },

  ///////DELETE builder/////////////////////                                            
  deletebuilder: (builderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.BUILDER_COLLECTION)
        .removeOne({
          _id: objectId(builderId)
        })
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },

  ///////UPDATE builder/////////////////////                                            
  updatebuilder: (builderId, builderDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.BUILDER_COLLECTION)
        .updateOne(
          {
            _id: objectId(builderId)
          },
          {
            $set: {
              Name: builderDetails.Name,
              Category: builderDetails.Category,
              Price: builderDetails.Price,
              Description: builderDetails.Description,
            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },


  ///////DELETE ALL builder/////////////////////                                            
  deleteAllbuilders: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.BUILDER_COLLECTION)
        .remove({})
        .then(() => {
          resolve();
        });
    });
  },


  addAd: (ad, callback) => {
    console.log(ad);
    ad.Price = parseInt(ad.Price);
    db.get()
      .collection(collections.ADS_COLLECTION)
      .insertOne(ad)
      .then((data) => {
        console.log(data);
        callback(data.ops[0]._id);
      });
  },


  addProduct: (product, callback) => {
    console.log(product);
    product.Price = parseInt(product.Price);
    product.userId = new ObjectId(product.userId); // Ensure userId is stored as ObjectId

    db.get()
      .collection(collections.PRODUCTS_COLLECTION)
      .insertOne(product)
      .then((data) => {
        console.log(data);
        callback(data.insertedId); // Corrected: `insertedId` instead of `data.ops[0]._id`
      })
      .catch((err) => {
        console.error("Error adding product:", err);
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

  doSignup: (adminData) => {
    return new Promise(async (resolve, reject) => {
      if (adminData.Code == "admin123") {
        adminData.Password = await bcrypt.hash(adminData.Password, 10);
        db.get()
          .collection(collections.ADMIN_COLLECTION)
          .insertOne(adminData)
          .then((data) => {
            resolve(data.ops[0]);
          });
      } else {
        resolve({ status: false });
      }
    });
  },

  doSignin: (adminData) => {
    return new Promise(async (resolve, reject) => {
      let response = {};
      let admin = await db
        .get()
        .collection(collections.ADMIN_COLLECTION)
        .findOne({ Email: adminData.Email });
      if (admin) {
        bcrypt.compare(adminData.Password, admin.Password).then((status) => {
          if (status) {
            console.log("Login Success");
            response.admin = admin;
            response.status = true;
            resolve(response);
          } else {
            console.log("Login Failed");
            resolve({ status: false });
          }
        });
      } else {
        console.log("Login Failed");
        resolve({ status: false });
      }
    });
  },

  getProductDetails: (productId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PRODUCTS_COLLECTION)
        .findOne({ _id: objectId(productId) })
        .then((response) => {
          resolve(response);
        });
    });
  },

  deleteProduct: (productId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PRODUCTS_COLLECTION)
        .removeOne({ _id: objectId(productId) })
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },



  deleteAd: (adId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ADS_COLLECTION)
        .removeOne({ _id: objectId(adId) })
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },

  updateProduct: (productId, productDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PRODUCTS_COLLECTION)
        .updateOne(
          { _id: objectId(productId) },
          {
            $set: {
              Name: productDetails.Name,
              Category: productDetails.Category,
              Price: productDetails.Price,
              Description: productDetails.Description,
            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },

  deleteAllProducts: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PRODUCTS_COLLECTION)
        .remove({})
        .then(() => {
          resolve();
        });
    });
  },

  getAllUsers: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const users = await db
          .get()
          .collection(collections.USERS_COLLECTION)
          .find()
          .sort({ createdAt: -1 })  // Sort by createdAt in descending order
          .toArray();

        resolve(users);
      } catch (err) {
        reject(err);  // Handle any error during fetching
      }
    });
  },


  getUserRegistrationData: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const userRegistrations = await db
          .get()
          .collection(collections.USERS_COLLECTION)
          .aggregate([
            {
              $project: {
                date: {
                  $dateToString: { format: "%Y-%m", date: "$createdAt" } // ✅ Group by Year-Month
                }
              }
            },
            {
              $group: {
                _id: "$date",
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } } // Sort by date (ascending)
          ])
          .toArray();

        resolve(userRegistrations);
      } catch (err) {
        reject(err);
      }
    });
  },




  getFilteredUsers: (fromDate, toDate) => {
    return new Promise(async (resolve, reject) => {
      try {
        let query = {};

        if (fromDate && toDate) {
          query.createdAt = {
            $gte: new Date(fromDate), // Greater than or equal to fromDate
            $lte: new Date(toDate)    // Less than or equal to toDate
          };
        }

        const users = await db
          .get()
          .collection(collections.USERS_COLLECTION)
          .find(query)
          .sort({ createdAt: -1 })  // Sort by latest date
          .toArray();

        resolve(users);
      } catch (err) {
        reject(err);
      }
    });
  },

  getUserPayments: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const payments = await db
          .get()
          .collection(collections.USERS_COLLECTION)
          .aggregate([
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                },
                totalAmount: { $sum: { $toInt: "$amount" } }, // Convert amount to number
                count: { $sum: 1 }  // Count number of users per day
              }
            },
            { $sort: { _id: 1 } }  // Sort by date (oldest first)
          ])
          .toArray();

        // ✅ Calculate Grand Total
        const grandTotal = payments.reduce((sum, payment) => sum + payment.totalAmount, 0);

        resolve({ payments, grandTotal });  // ✅ Return both payments and grandTotal
      } catch (err) {
        reject(err);
      }
    });
  },


  getParticiation: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const payments = await db
          .get()
          .collection(collections.ORDER_COLLECTION)
          .aggregate([
            {
              $group: {
                _id: "$event.title",  // Group by event title
                totalAmount: { $sum: { $toInt: "$totalAmount" } }, // Total amount per event
                totalParticipants: { $sum: 1 }  // Count number of orders (participants) per event
              }
            },
            { $sort: { totalParticipants: -1 } }  // Sort by most participants
          ])
          .toArray();

        // ✅ Calculate Grand Total
        const grandTotal = payments.reduce((sum, payment) => sum + payment.totalAmount, 0);

        resolve({ payments, grandTotal });  // ✅ Return both event-based payments and grand total
      } catch (err) {
        reject(err);
      }
    });
  },



  getUserPaymentsOrder: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const payments = await db
          .get()
          .collection(collections.ORDER_COLLECTION)
          .aggregate([
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$date" }
                },
                totalAmount: { $sum: { $toInt: "$totalAmount" } }, // Convert amount to number
                count: { $sum: 1 }  // Count number of orders per day
              }
            },
            { $sort: { _id: 1 } }  // Sort by date (oldest first)
          ])
          .toArray();

        // ✅ Calculate Grand Total
        const grandTotal = payments.reduce((sum, payment) => sum + payment.totalAmount, 0);

        resolve({ payments, grandTotal });  // ✅ Return both payments and grandTotal
      } catch (err) {
        reject(err);
      }
    });
  },


  getAllTempUsers: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const tempusers = await db
          .get()
          .collection(collections.TEMPUSERS_COLLECTION)
          .find()
          .sort({ createdAt: -1 })  // Sort by createdAt in descending order
          .toArray();

        resolve(tempusers);
      } catch (err) {
        reject(err);  // Handle any error during fetching
      }
    });
  },

  ///////ADD officer DETAILS/////////////////////                                            
  getuserDetails: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.USERS_COLLECTION)
        .findOne({
          _id: objectId(userId)
        })
        .then((response) => {
          resolve(response);
        });
    });
  },

  ///////UPDATE officer/////////////////////                                            
  updateuser: (userId, userDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.USERS_COLLECTION)
        .updateOne(
          {
            _id: objectId(userId)
          },
          {
            $set: {
              role: userDetails.role,
            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },


  removeUser: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.USERS_COLLECTION)
        .removeOne({ _id: objectId(userId) })
        .then(() => {
          resolve();
        });
    });
  },

  blockUser: (userId) => {
    return new Promise((resolve, reject) => {
      try {
        // Convert the userId to ObjectId if it's not already
        const objectId = new ObjectId(userId);

        // Use updateOne to set isDisable to true
        db.get().collection(collections.USERS_COLLECTION).updateOne(
          { _id: objectId }, // Find user by ObjectId
          { $set: { isDisable: true } }, // Set the isDisable field to true
          (err, result) => {
            if (err) {
              reject(err); // Reject if there's an error
            } else {
              resolve(result); // Resolve if the update is successful
            }
          }
        );
      } catch (err) {
        reject(err); // Catch any error in case of an invalid ObjectId format
      }
    });
  },

  removeAllUsers: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.USERS_COLLECTION)
        .remove({})
        .then(() => {
          resolve();
        });
    });
  },

  getAllOrders: (fromDate, toDate) => {
    return new Promise(async (resolve, reject) => {
      try {
        let query = {};

        // If fromDate and toDate are provided, filter orders by the date range
        if (fromDate && toDate) {
          // Add one day to toDate and set it to midnight
          const adjustedToDate = new Date(toDate);
          adjustedToDate.setDate(adjustedToDate.getDate() + 1);

          query = {
            date: {
              $gte: new Date(fromDate), // Orders from the start date
              $lt: adjustedToDate       // Orders up to the end of the toDate
            }
          };
        }

        let orders = await db.get()
          .collection(collections.ORDER_COLLECTION)
          .find(query)
          .toArray();

        resolve(orders);
      } catch (error) {
        reject(error);
      }
    });
  },


  getOrdersByDateRange: (fromDate, toDate) => {
    return new Promise(async (resolve, reject) => {
      try {
        const orders = await db.get()
          .collection(collections.ORDER_COLLECTION)
          .find({
            createdAt: {
              $gte: new Date(fromDate), // Greater than or equal to the fromDate
              $lte: new Date(toDate)    // Less than or equal to the toDate
            }
          })
          .toArray();
        resolve(orders);
      } catch (error) {
        reject(error);
      }
    });
  },

  changeStatus: (status, orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(orderId) },
          {
            $set: {
              "orderObject.status": status,
            },
          }
        )
        .then(() => {
          resolve();
        });
    });
  },

  cancelOrder: (orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .removeOne({ _id: objectId(orderId) })
        .then(() => {
          resolve();
        });
    });
  },

  cancelAllOrders: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .remove({})
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



  getAllOrdersEvent: (fromDate, toDate) => {
    return new Promise(async (resolve, reject) => {
      try {
        let matchStage = {};

        if (fromDate && toDate) {
          const adjustedToDate = new Date(toDate);
          adjustedToDate.setDate(adjustedToDate.getDate() + 1);

          matchStage.date = {
            $gte: new Date(fromDate),
            $lt: adjustedToDate
          };
        }


        let orders = await db.get()
          .collection(collections.ORDER_COLLECTION)
          .aggregate([
            { $match: matchStage }, // ✅ Filter by date if provided
            { $sort: { "event.title": 1, "date": 1 } } // ✅ Sort by Event Title (A-Z) and Date (Oldest First)
          ])
          .toArray();

        resolve(orders);
      } catch (error) {
        reject(error);
      }
    });
  },

}
