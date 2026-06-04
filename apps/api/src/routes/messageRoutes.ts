import { Router } from "express";
import { messageController } from "../controllers/message.controller.js";

const messageRouter: Router = Router();
messageRouter.post("/message", messageController);
export default messageRouter;
