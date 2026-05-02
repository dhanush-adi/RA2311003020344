# Vehicle Maintenance Scheduler

An optimization utility to maximize maintenance impact across multiple depots.

## Algorithm
- **Type**: 0/1 Knapsack Dynamic Programming.
- **Complexity**: O(N * W) where N is the number of tasks and W is the mechanic hours budget.
- **Implementation**: Pure TypeScript, zero external dependencies for the algorithm logic.

## Logic
1. Fetches `depots` and `vehicles` (tasks) from the Affordmed Evaluation API.
2. For each depot, it calculates the optimal set of tasks that fit within the `MechanicHours` limit.
3. Maximizes the sum of "Impact" scores.

## Setup
1. `npm install`
2. Create `.env` with `EVAL_AUTH_TOKEN`.
3. `npm start` to run the optimizer.
