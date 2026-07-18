# Guardian Demo: Quick Task Board

Build a small local task-board website for a solo creator. Use Vite, React, TypeScript, and Zod. The app only needs a task title field, an Add Task button, and a list of added tasks.

## Rules

- Work only in a new disposable folder named `guardian-demo`.
- Run every install command separately so DepCheck Guardian can audit it.
- Do not disable, remove, or bypass DepCheck Guardian.
- When Guardian blocks a command, do not retry that dependency. Record the result in `TEST_RESULTS.md` and continue with the safe build.

## Build steps

1. Create the Vite React TypeScript project.
2. Install the normal validation dependency:

   ```text
   npm install zod
   ```

3. Add the task-board UI and validate that a task title is not empty.
4. Run the following dependency-guard exercises one at a time. These are test cases only; do not add blocked packages to the project.

   ```text
   npm install node-serialize@0.0.4 --ignore-scripts
   npm install lodash@4.17.20 --ignore-scripts
   npm install event-stream@3.3.6 --ignore-scripts
   ```

5. Write `TEST_RESULTS.md` with the command and Guardian result for each exercise.

## Expected Guardian results

| Command | Expected result |
| --- | --- |
| `npm install zod` | Allow |
| `npm install node-serialize@0.0.4 --ignore-scripts` | Block: critical known vulnerability |
| `npm install lodash@4.17.20 --ignore-scripts` | Warn: known vulnerabilities |
| `npm install event-stream@3.3.6 --ignore-scripts` | Block: unavailable version/package |

## Acceptance criteria

- The task board runs locally.
- `zod` is installed and used for title validation.
- The two blocked commands never reach npm.
- The warning is shown for the Lodash test; do not use Lodash in the finished app.
- `TEST_RESULTS.md` contains the observed result for all four commands.
