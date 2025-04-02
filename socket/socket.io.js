// Description: Twilio OTP verification
const { Server } = require("socket.io");

// Socket Instance
let io = null;

// Socket Connection
const connectSocket = (server) => {
  io = new Server(server);

  io.on("connection", (socket) => {
    console.log(`connection****${socket.id}****connection*****connection** iOOOOOOOOOOOOOOOOOO*******`);
    
    // Listen for the 'hide' event from the client
    // socket.on('hide', (data) => {
    //   socket.broadcast.emit('hide');
    //   console.log(`New message from : ${data}`);
    //   console.log("hide*************** iOOOOOOOOOOOOOOOOOO*******");
    // });

    
  });

  return io;
};

// Socket Emit
module.exports = connectSocket;
