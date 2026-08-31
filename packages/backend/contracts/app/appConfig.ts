import { AppOptions } from "../ui";
import { DataSource } from "./dataSource";

export type RecentColumns = DataSource & { when: number };

// types.ts (or above class)
export type AppConfig = { recent(): RecentColumns[]; dataSource?: DataSource; appOptions: AppOptions; close(): void };
