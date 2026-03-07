import { app } from "./index.js";
import { createServer } from "http";
import ConnectDB from "./src/config/db.config.js";
import { initSocket } from "./socket.js";

const httpServer = createServer(app);

initSocket(httpServer);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log("Server is running on port: ", PORT);
  ConnectDB();
});
