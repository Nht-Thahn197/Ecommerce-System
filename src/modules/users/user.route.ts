import { Router } from "express";
import { getUsers } from "./user.controller";

const router = Router();

router.get("/", getUsers);

export default router;