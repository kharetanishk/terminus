import express from "express";
import cors from "cors";
import chatRouter from "./routes/chatRoutes.js";
import { config } from "./config/config.js";

const PORT = config.PORT;
const ALLOWED_ORIGIN = "http://localhost:5173";
const app = express();

app.use(express.json());

// Express 5: bare "*" is invalid in path-to-regexp v8; use a regex catch-all
app.options(/.*/, (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.sendStatus(204);
});

app.use(
  cors({
    origin: ALLOWED_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }),
);

//routes
app.use("/api/v1", chatRouter);

app.listen(PORT, () => {
  console.log(`the api is listening in port : ${PORT}`);
});
