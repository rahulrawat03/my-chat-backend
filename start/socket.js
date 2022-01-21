const http = require("http");
const socketIo = require("socket.io");
const winston = require("winston");
const config = require("config");

module.exports = function (app) {
  const server = http.createServer(app);
  const io = socketIo(server, {
    cors: {
      origin: config.get("frontendConnection"),
    },
  });

  const members = [];
  const membersId = new Set();

  io.on("connection", (socket) => {
    socket.on("chat", ({ userId }) => {
      addMember(members, membersId, userId, socket.id);
    });

    socket.on("message", (payload) => {
      const socketsId = getSocketsId(members, membersId, payload.receiversId);
      socketsId.forEach((socketId) => io.to(socketId).emit("message", payload));
    });

    socket.on("notification", (payload) => {
      const [socketId] = getSocketsId(members, membersId, [payload.receiverId]);

      io.to(socketId).emit("notification", payload);
    });

    socket.on("addConversation", (payload) => {
      const socketsId = getSocketsId(members, membersId, payload.membersId);

      socketsId.forEach((socketId) =>
        io.to(socketId).emit("addConversation", payload)
      );
    });

    socket.on("removeConversation", (payload) => {
      const socketsId = getSocketsId(members, membersId, payload.membersId);

      socketsId.forEach((socketId) =>
        io.to(socketId).emit("removeConversation", payload)
      );
    });

    socket.on("messageCount", (payload) => {
      const socketsId = getSocketsId(members, membersId, payload.membersId);

      socketsId.forEach((socketId) =>
        io.to(socketId).emit("messageCount", payload)
      );
    });

    socket.on("disconnect", () => {
      removeMember(members, membersId, socket.id);
    });
  });

  const port = process.env.PORT || 1001;
  return server.listen(port, () => {
    winston.info(`Listening at port ${port}`);
  });
};

function addMember(members, membersId, userId, socketId) {
  if (membersId.has(userId)) {
    const member = members.find((m) => m.userId === userId);
    member.socketId = socketId;
    return;
  }

  members.push({ userId, socketId });
  membersId.add(userId);
}

function removeMember(members, membersId, socketId) {
  const index = members.findIndex((m) => m.socketId === socketId);
  if (index === -1) return;
  const { userId } = members[index];

  members.splice(index, 1);
  membersId.delete(userId);
}

function getSocketsId(members, membersId, receiversId) {
  const socketsId = [];

  for (let receiverId of receiversId) {
    if (membersId.has(receiverId)) {
      const { socketId } = members.find((m) => m.userId === receiverId);
      socketsId.push(socketId);
    }
  }

  return socketsId;
}
