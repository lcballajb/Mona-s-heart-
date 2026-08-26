import { createStore } from "./store-factory.mjs";
import { Worker } from "./worker.mjs";
import { createLogger } from "./observability.mjs";

const store = await createStore();
const worker = new Worker({
  store,
  handlers: {
    account_deletion: ({ reference }) =>
      store.completeDeletionRequest(reference),
  },
  concurrency: Number(process.env.WORKER_CONCURRENCY ?? 2),
  logger: createLogger(),
});
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, async () => {
    await worker.stop();
    process.exitCode = 0;
  });
await worker.start();
