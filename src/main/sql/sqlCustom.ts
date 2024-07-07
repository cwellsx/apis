import { Database } from "better-sqlite3";
import type { CustomError, CustomViewOptions, GraphFilter, NodeId, ViewType } from "../../shared-types";
import { nameNodeId } from "../../shared-types";
import { isAnyOtherCustomField, type CustomNode } from "../customJson";
import { log } from "../log";
import { defaultViewOptions } from "./defaultViewOptions";
import { SqlTable } from "./sqlTable";

type ConfigColumns = {
  name: string;
  value: string;
};

export class SqlCustom {
  save: (nodes: CustomNode[], errors: CustomError[], when: string) => void;
  shouldReload: (when: string) => boolean;
  viewState: {
    onSave: (
      when: string,
      customSchemaVersion: string,
      nodeIds: NodeId[],
      nodeProperties: string[],
      tags: string[]
    ) => void;
    set customViewOptions(viewOptions: CustomViewOptions);
    get customViewOptions(): CustomViewOptions;
    get viewType(): ViewType;
    set viewType(value: ViewType);
    get cachedWhen(): string;
    get customSchemaVersion(): string;
  };
  readErrors: () => CustomError[];
  readAll: () => CustomNode[];
  close: () => void;
  private readLeafVisible: () => NodeId[];
  private readGroupExpanded: (clusterBy: string[]) => NodeId[];
  private writeLeafVisible: (leafVisible: NodeId[]) => void;
  private writeGroupExpanded: (clusterBy: string[], groupExpanded: NodeId[]) => void;
  readGraphFilter: (clusterBy: string[]) => GraphFilter;
  writeGraphFilter: (clusterBy: string[], graphFilter: GraphFilter) => void;

  constructor(db: Database) {
    const customSchemaVersionExpected = "2024-06-05";

    // even though the CustomNode elements each have a unique id
    // don't bother to store the data in normalized tables
    // because there isn't much of the data (it's hand-written)
    // also a schema mismatch doesn't drop and recreate the table
    const configTable = new SqlTable<ConfigColumns>(db, "configCustom", "name", () => false, {
      name: "foo",
      value: "bar",
    });

    configTable.deleteAll();

    const done = () => {
      const result = db.pragma("wal_checkpoint(TRUNCATE)");
      log(`wal_checkpoint: ${JSON.stringify(result)}`);
    };

    this.save = (nodes: CustomNode[], errors: CustomError[], when: string): void => {
      configTable.insert({ name: "nodes", value: JSON.stringify(nodes) });
      configTable.insert({ name: "errors", value: JSON.stringify(errors) });

      const nodeProperties = new Set<string>();
      nodes.forEach((node) =>
        Object.keys(node)
          .filter(isAnyOtherCustomField)
          .forEach((key) => nodeProperties.add(key))
      );

      const tags = new Set<string>();
      nodes.forEach((node) => node.tags?.forEach((tag) => tags.add(tag)));

      this.viewState.onSave(
        when,
        customSchemaVersionExpected,
        nodes.map((node) => nameNodeId("customLeaf", node.id)),
        [...nodeProperties],
        [...tags]
      );
      done();
    };

    this.shouldReload = (when: string): boolean =>
      !this.viewState.cachedWhen ||
      customSchemaVersionExpected !== this.viewState.customSchemaVersion ||
      Date.parse(this.viewState.cachedWhen) < Date.parse(when);

    this.readErrors = (): CustomError[] => {
      const o = configTable.selectOne({ name: "errors" });
      if (!o) throw new Error("Errors not initialized");
      return JSON.parse(o.value) as CustomError[];
    };

    this.readAll = (): CustomNode[] => {
      const o = configTable.selectOne({ name: "nodes" });
      if (!o) throw new Error("Nodes not initialized");
      return JSON.parse(o.value) as CustomNode[];
    };

    const keyGroupExpended = (clusterBy: string[]): string =>
      "clusterBy" + [clusterBy.length] ? "-" + clusterBy.join("-") : "";
    this.readLeafVisible = (): NodeId[] => {
      const found = configTable.selectOne({ name: "leafVisible" });
      if (!found) throw new Error("readLeafVisible nodes not found");
      return JSON.parse(found.value);
    };
    this.readGroupExpanded = (clusterBy: string[]): NodeId[] => {
      const found = configTable.selectOne({ name: keyGroupExpended(clusterBy) });
      if (!found) return []; // not predefined so initially all closed
      return JSON.parse(found.value);
    };
    this.writeLeafVisible = (leafVisible: NodeId[]): void => {
      configTable.upsert({ name: "leafVisible", value: JSON.stringify(leafVisible) });
    };
    this.writeGroupExpanded = (clusterBy: string[], groupExpanded: NodeId[]): void => {
      configTable.upsert({ name: keyGroupExpended(clusterBy), value: JSON.stringify(groupExpanded) });
    };
    this.readGraphFilter = (clusterBy: string[]): GraphFilter => ({
      leafVisible: this.readLeafVisible(),
      groupExpanded: this.readGroupExpanded(clusterBy),
    });
    this.writeGraphFilter = (clusterBy: string[], graphFilter: GraphFilter): void => {
      this.writeLeafVisible(graphFilter.leafVisible);
      this.writeGroupExpanded(clusterBy, graphFilter.groupExpanded);
    };

    this.viewState = {
      onSave: (
        when: string,
        customSchemaVersion: string,
        nodeIds: NodeId[],
        nodeProperties: string[],
        tags: string[]
      ): void => {
        configTable.upsert({ name: "when", value: when });
        configTable.upsert({ name: "customSchemaVersion", value: customSchemaVersion });

        this.viewState.customViewOptions = {
          ...defaultViewOptions.customViewOptions,
          nodeProperties: nodeProperties.sort(),
          tags: tags.sort().map((tag) => ({ tag, shown: true })),
        };

        this.writeLeafVisible(nodeIds);
      },
      set customViewOptions(viewOptions: CustomViewOptions) {
        configTable.upsert({ name: "viewOptions", value: JSON.stringify(viewOptions) });
      },
      get customViewOptions(): CustomViewOptions {
        const o = configTable.selectOne({ name: "viewOptions" });
        if (!o) throw new Error("viewOptions not initialized");
        return JSON.parse(o.value) as CustomViewOptions;
      },
      get viewType(): ViewType {
        const o = configTable.selectOne({ name: "viewType" });
        if (!o) return "custom";
        return o.value as ViewType;
      },
      set viewType(value: ViewType) {
        configTable.upsert({ name: "viewType", value });
      },
      get cachedWhen(): string {
        const o = configTable.selectOne({ name: "when" });
        if (!o) return "";
        return o.value;
      },
      get customSchemaVersion(): string {
        const o = configTable.selectOne({ name: "customSchemaVersion" });
        if (!o) return "";
        return o.value;
      },
    };

    this.close = () => {
      done();
      db.close();
    };
  }
}
