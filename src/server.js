import express from "express";
import http from "http";
import { Server } from "socket.io";
import { instrument } from "@socket.io/admin-ui";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));

app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));

const expressServer = http.createServer(app);
const io = new Server(expressServer, {
  cors: {
    origin: ["https://admin.socket.io", "http://localhost:3000"],
    credentials: true,
  },
});
instrument(io, {
  auth: false,
});

function publicRooms() {
  const sids = io.sockets.adapter.sids;
  const rooms = io.sockets.adapter.rooms;
  const publicRooms = [];
  rooms.forEach((_, key) => {
    if (sids.get(key) === undefined) {
      publicRooms.push(key);
    }
  });
  return publicRooms;
}

function countRoom(roomName) {
  return io.sockets.adapter.rooms.get(roomName)?.size;
}

io.on("connection", (socket) => {
  socket["nickname"] = "anon";

  socket.onAny((event) => {
    console.log("핸드쉐이크 쿼리 : ", socket.handshake.query);
    console.log("소켓 어댑터 : ", io.sockets.adapter);
    console.log("룸 : ", io.sockets.adapter.rooms.get("Y24BSXjFwY0yvM7IAAAB"));
    console.log(`socket event : ${event}`);
  });

  socket.on("enter_room", (roomName, nickName, callback) => {
    socket["nickname"] = nickName;
    socket.join(roomName);
    callback();
    socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName));
    io.sockets.emit("room_change", publicRooms());
  });

  socket.on("disconnecting", () => {
    socket.rooms.forEach((room) => {
      socket.to(room).emit("bye", socket.nickname, countRoom(room) - 1);
    });
  });

  socket.on("disconnect", () => {
    io.sockets.emit("room_change", publicRooms());
  });

  socket.on("new_message", (msg, room, callback) => {
    socket.to(room).emit("new_message", `${socket.nickname} : ${msg}`);
    callback();
  });

  socket.on("nickname", (nickname) => (socket["nickname"] = nickname));
});

expressServer.listen(8000, () => console.log("서버 구동..."));
