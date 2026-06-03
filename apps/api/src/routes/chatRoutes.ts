import { Router } from "express";
import { chatController } from "../controllers/chat.controller.js";

const chatRouter: Router = Router();

chatRouter.post("/chat", chatController);

export default chatRouter;
