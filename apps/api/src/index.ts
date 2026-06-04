import express from "express";
import cors from "cors";
import chatRouter from "./routes/chatRoutes.js";
import { config } from "./config/config.js";

const PORT = config.PORT;
const app = express();

app.use(express.json());
app.use(cors());

//routes
app.use("/api/v1", chatRouter);

app.listen(PORT, () => {
  console.log(`the api is listening in port : ${PORT}`);
});
