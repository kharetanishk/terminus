import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import chatRouter from "./routes/chatRoutes.js";

const PORT = process.env.PORT ?? "3001";
const app = express();

app.use(express.json());
app.use(cors());

//routes
app.use("/api/v1", chatRouter);

app.listen(PORT, () => {
  console.log(`the api is listening in port : ${PORT}`);
});
