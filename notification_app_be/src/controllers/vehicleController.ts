// src/controllers/vehicleController.ts — Handles vehicle scheduling API endpoint

import { Request, Response } from "express";
import axios from "axios";
import { EvalDepot, EvalVehicle, DepotScheduleResult } from "../types";
import { createLogger } from "../../../logging_middleware/src";

const schedLogger = createLogger(
  "backend",
  process.env.EVAL_AUTH_TOKEN,
  process.env.EVAL_API_BASE
);

/**
 * Custom 0/1 Knapsack using dynamic programming — NO external libraries.
 * Maximises total Impact score within the mechanic-hours budget per depot.
 * Time: O(n * W) | Space: O(n * W) where W = available mechanic hours
 */
function runKnapsackDP(
  vehicles: EvalVehicle[],
  budgetHours: number
): { selectedVehicles: EvalVehicle[]; totalImpact: number; hoursUsed: number } {
  const n = vehicles.length;
  // dp[i][w] = max impact using first i vehicles with w hours budget
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(budgetHours + 1).fill(0));

  for (let taskIdx = 1; taskIdx <= n; taskIdx++) {
    const vehicle = vehicles[taskIdx - 1];
    for (let hourBudget = 0; hourBudget <= budgetHours; hourBudget++) {
      // Don't take this vehicle
      dp[taskIdx][hourBudget] = dp[taskIdx - 1][hourBudget];
      // Take this vehicle (if it fits)
      if (vehicle.Duration <= hourBudget) {
        const withThisVehicle = dp[taskIdx - 1][hourBudget - vehicle.Duration] + vehicle.Impact;
        if (withThisVehicle > dp[taskIdx][hourBudget]) {
          dp[taskIdx][hourBudget] = withThisVehicle;
        }
      }
    }
  }

  // Backtrack to find which vehicles were selected
  const selectedVehicles: EvalVehicle[] = [];
  let remainingHours = budgetHours;
  for (let taskIdx = n; taskIdx > 0; taskIdx--) {
    if (dp[taskIdx][remainingHours] !== dp[taskIdx - 1][remainingHours]) {
      selectedVehicles.push(vehicles[taskIdx - 1]);
      remainingHours -= vehicles[taskIdx - 1].Duration;
    }
  }

  const totalImpact = dp[n][budgetHours];
  const hoursUsed   = budgetHours - remainingHours;

  return { selectedVehicles, totalImpact, hoursUsed };
}

/** GET /api/v1/vehicles/schedule */
export async function handleVehicleSchedule(req: Request, res: Response): Promise<void> {
  try {
    const authToken = process.env.EVAL_AUTH_TOKEN ?? "";
    const apiBase   = process.env.EVAL_API_BASE   ?? "http://20.207.122.201/evaluation-service";

    schedLogger.info("service", "Vehicle scheduling requested — fetching depots and vehicles from eval API");

    // Fetch depots and vehicles from evaluation API
    const [depotsResp, vehiclesResp] = await Promise.all([
      axios.get<{ depots: EvalDepot[] }>(`${apiBase}/depots`, {
        headers: { Authorization: `Bearer ${authToken}` }, timeout: 8000,
      }),
      axios.get<{ vehicles: EvalVehicle[] }>(`${apiBase}/vehicles`, {
        headers: { Authorization: `Bearer ${authToken}` }, timeout: 8000,
      }),
    ]);

    const depots   = depotsResp.data.depots;
    const vehicles = vehiclesResp.data.vehicles;

    schedLogger.info("service", `Fetched ${depots.length} depots and ${vehicles.length} vehicles`);

    // Run independent knapsack per depot
    const scheduleResults: DepotScheduleResult[] = depots.map((depot) => {
      schedLogger.debug("service", `Running knapsack for depot=${depot.ID} hours=${depot.MechanicHours}`);
      const { selectedVehicles, totalImpact, hoursUsed } = runKnapsackDP(vehicles, depot.MechanicHours);
      schedLogger.info(
        "service",
        `Depot ${depot.ID}: scheduled ${selectedVehicles.length} tasks, impact=${totalImpact}, hours=${hoursUsed}/${depot.MechanicHours}`
      );
      return {
        depotId:                depot.ID,
        mechanicHoursAvailable: depot.MechanicHours,
        hoursUsed,
        totalImpact,
        scheduledTasks: selectedVehicles,
      };
    });

    const grandTotalImpact = scheduleResults.reduce((sum, r) => sum + r.totalImpact, 0);
    schedLogger.info("service", `Vehicle scheduling complete. Grand total impact: ${grandTotalImpact}`);

    res.json({
      success: true,
      data: {
        grandTotalImpact,
        depotSchedules: scheduleResults,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    schedLogger.error("controller", `vehicleSchedule failed: ${msg}`);
    res.status(500).json({ success: false, error: msg });
  }
}
