// src/routes/vehicleRoutes.ts — Vehicle scheduling routes

import { Router } from "express";
import { handleVehicleSchedule } from "../controllers/vehicleController";

const vehicleRouter = Router();

// GET /api/v1/vehicles/schedule — fetch + schedule vehicles from eval API
vehicleRouter.get("/schedule", handleVehicleSchedule);

export { vehicleRouter };
