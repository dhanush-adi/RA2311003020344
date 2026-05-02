// src/scheduler.ts — Vehicle Maintenance Scheduler
// Custom 0/1 Knapsack DP algorithm (no external algorithm libraries)
// Fetches depots and vehicles from evaluation API, computes optimal assignment

import * as dotenv from "dotenv";
dotenv.config();

import axios from "axios";

interface Depot {
  ID: number;
  MechanicHours: number;
}

interface Vehicle {
  TaskID: string;
  Duration: number;
  Impact: number;
}

interface DepotResult {
  depotId:               number;
  mechanicHoursTotal:    number;
  mechanicHoursConsumed: number;
  maximizedImpact:       number;
  assignedTaskCount:     number;
  assignedTasks:         Vehicle[];
}

/**
 * 0/1 Knapsack via bottom-up dynamic programming.
 * No sorting libraries, no greedy shortcuts — pure DP.
 *
 * @param tasks         — array of vehicles (items with weight=Duration, value=Impact)
 * @param hoursBudget   — mechanic hours available (knapsack capacity)
 * @returns selected tasks and total impact
 */
function knapsackSchedule(
  tasks: Vehicle[],
  hoursBudget: number
): { chosenTasks: Vehicle[]; maxImpact: number; hoursConsumed: number } {
  const itemCount = tasks.length;

  // Build DP table: rows = items (0..n), cols = hour budget (0..W)
  const dpTable: number[][] = [];
  for (let row = 0; row <= itemCount; row++) {
    dpTable[row] = new Array(hoursBudget + 1).fill(0);
  }

  // Fill table bottom-up
  for (let itemIdx = 1; itemIdx <= itemCount; itemIdx++) {
    const currentTask = tasks[itemIdx - 1];
    for (let hrs = 0; hrs <= hoursBudget; hrs++) {
      // Option A: skip this task
      dpTable[itemIdx][hrs] = dpTable[itemIdx - 1][hrs];
      // Option B: include this task (if it fits)
      if (currentTask.Duration <= hrs) {
        const impactIfIncluded =
          dpTable[itemIdx - 1][hrs - currentTask.Duration] + currentTask.Impact;
        if (impactIfIncluded > dpTable[itemIdx][hrs]) {
          dpTable[itemIdx][hrs] = impactIfIncluded;
        }
      }
    }
  }

  // Backtrack to reconstruct chosen items
  const chosenTasks: Vehicle[] = [];
  let remainHrs = hoursBudget;
  for (let itemIdx = itemCount; itemIdx > 0; itemIdx--) {
    if (dpTable[itemIdx][remainHrs] !== dpTable[itemIdx - 1][remainHrs]) {
      const selectedTask = tasks[itemIdx - 1];
      chosenTasks.push(selectedTask);
      remainHrs -= selectedTask.Duration;
    }
  }

  return {
    chosenTasks,
    maxImpact:     dpTable[itemCount][hoursBudget],
    hoursConsumed: hoursBudget - remainHrs,
  };
}

function printDepotResult(result: DepotResult): void {
  console.log(`\n  Depot ${result.depotId}`);
  console.log(`  ├─ Available Hours : ${result.mechanicHoursTotal}`);
  console.log(`  ├─ Hours Used      : ${result.mechanicHoursConsumed}`);
  console.log(`  ├─ Max Impact      : ${result.maximizedImpact}`);
  console.log(`  └─ Assigned Tasks  : ${result.assignedTaskCount}`);
  result.assignedTasks.forEach((t, i) => {
    const prefix = i === result.assignedTasks.length - 1 ? "     └─" : "     ├─";
    console.log(`${prefix} ${t.TaskID.substring(0, 18)}... | Duration: ${t.Duration}h | Impact: ${t.Impact}`);
  });
}

async function runScheduler(): Promise<void> {
  const evalToken = process.env.EVAL_AUTH_TOKEN ?? "";
  const evalBase  = process.env.EVAL_API_BASE   ?? "http://20.207.122.201/evaluation-service";

  if (!evalToken) {
    console.error("ERROR: EVAL_AUTH_TOKEN not set in environment");
    process.exit(1);
  }

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Vehicle Maintenance Scheduler — Affordmed Evaluation");
  console.log("  Algorithm: 0/1 Knapsack DP (custom, no external libraries)");
  console.log("═══════════════════════════════════════════════════════════\n");

  console.log("Fetching depot and vehicle data from evaluation API...");

  const [depotsResp, vehiclesResp] = await Promise.all([
    axios.get<{ depots: Depot[] }>(`${evalBase}/depots`, {
      headers: { Authorization: `Bearer ${evalToken}` }, timeout: 10000,
    }),
    axios.get<{ vehicles: Vehicle[] }>(`${evalBase}/vehicles`, {
      headers: { Authorization: `Bearer ${evalToken}` }, timeout: 10000,
    }),
  ]);

  const depots   = depotsResp.data.depots;
  const vehicles = vehiclesResp.data.vehicles;

  console.log(`Loaded ${depots.length} depots and ${vehicles.length} vehicles.\n`);
  console.log("Running optimisation...\n");

  const allResults: DepotResult[] = [];

  for (const depot of depots) {
    const { chosenTasks, maxImpact, hoursConsumed } = knapsackSchedule(vehicles, depot.MechanicHours);
    allResults.push({
      depotId:               depot.ID,
      mechanicHoursTotal:    depot.MechanicHours,
      mechanicHoursConsumed: hoursConsumed,
      maximizedImpact:       maxImpact,
      assignedTaskCount:     chosenTasks.length,
      assignedTasks:         chosenTasks,
    });
  }

  console.log("══════════ SCHEDULING RESULTS ══════════");
  allResults.forEach(printDepotResult);

  const grandTotal = allResults.reduce((acc, r) => acc + r.maximizedImpact, 0);
  console.log(`\n══════════ SUMMARY ══════════`);
  console.log(`Total Depots Scheduled : ${allResults.length}`);
  console.log(`Combined Max Impact    : ${grandTotal}`);
  console.log(`\nFull JSON:\n`);
  console.log(JSON.stringify({ depots: allResults, grandTotalImpact: grandTotal }, null, 2));
}

runScheduler().catch((err: unknown) => {
  console.error("Scheduler failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
