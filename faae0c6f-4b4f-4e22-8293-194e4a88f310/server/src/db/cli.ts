/** `npm run db:migrate | db:seed | db:reset` */
import fs from "node:fs";
import { migrate, openDatabase } from "./database.js";
import { seed } from "./seed.js";
import { env } from "../config/env.js";

const command = process.argv[2];

function open() {
  const db = openDatabase(env.databaseFile);
  migrate(db);
  return db;
}

switch (command) {
  case "migrate": {
    const db = open();
    console.log(`Database ready at ${env.databaseFile}`);
    db.close();
    break;
  }
  case "seed": {
    const db = open();
    const result = seed(db);
    if (result.skipped) {
      console.log("Database already contains demonstration records - nothing to seed. Use `npm run db:reset` to rebuild.");
    } else {
      console.log(
        `Seeded demonstration data: ${result.users} users, ${result.products} products, ` +
          `${result.orders} orders, ${result.productionOrders} production orders, ${result.purchaseOrders} purchase orders.`,
      );
      console.log("Demo password for every account: Stockgap#2026");
    }
    db.close();
    break;
  }
  case "reset": {
    for (const suffix of ["", "-wal", "-shm", "-journal"]) {
      const file = env.databaseFile + suffix;
      if (fs.existsSync(file)) fs.rmSync(file);
    }
    const db = open();
    const result = seed(db);
    console.log(`Database reset and reseeded (${result.users} users). Demo password: Stockgap#2026`);
    db.close();
    break;
  }
  default:
    console.log("Usage: tsx src/db/cli.ts <migrate|seed|reset>");
    process.exitCode = 1;
}
