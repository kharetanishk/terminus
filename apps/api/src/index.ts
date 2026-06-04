import express from "express";
import cors from "cors";
import chatRouter from "./routes/chatRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import { config } from "./config/config.js";

const PORT = config.PORT;
const ALLOWED_ORIGIN = config.ALLOWED_ORIGIN;

const corsOptions = {
  origin: ALLOWED_ORIGIN,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  optionsSuccessStatus: 204,
};

const app = express();

// CORS first — preflight must succeed before any other middleware
app.use(cors(corsOptions));

// Express 5: named splat for catch-all OPTIONS (regex /.*/ does not match routes)
app.options("/{*path}", cors(corsOptions));

// Fallback: ensure every response (including errors) has CORS headers
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());

app.use("/api/v1", chatRouter);
app.use("/api/v1", messageRouter);

app.listen(PORT, () => {
  console.log(`the api is listening in port : ${PORT}`);
});
