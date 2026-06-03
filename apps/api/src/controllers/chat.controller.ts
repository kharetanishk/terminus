import { Request, Response } from "express";
import { userMessageValidation } from "../validation/chat.validation.js";

export function chatController(req: Request, res: Response) {
  const parseD = userMessageValidation.safeParse(req.body);
  if (!parseD.success) {
    const error = parseD.error.flatten((e) => e.message).fieldErrors;
    return res.status(400).json({
      message: `invalid usermessage`,
      error,
    });
  }

  //todo  when the message parse it will call
  //the agent
}
