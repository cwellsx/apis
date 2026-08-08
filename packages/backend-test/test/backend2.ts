import { assert, log } from "backend-api";
import { DataSource } from "backend-app";
import { renameSync } from "fs";
import { AnyNodeType, Node, NodeType, RootNodeType } from "sut/contracts-ui";
import * as Id from "sut/id2";
import { bindImage } from "sut/image";
import { createImageData } from "sut/presenter/createImageData";
import { Sql } from "sut/sql2";
import { createSqlCore } from "sut/sql2/createSqlCore";
import type { ViewType } from "sut/viewState";
import { createViewState } from "sut/viewState";
import { Forest, printForest } from "sut/viewState/forest";
import { fileWrite } from "./file";
import { fileCoreJson, fileViewState } from "./paths2";
import {
  listCallSizes,
  printCallFromAssemblies,
  printCallFromMethods,
  printCallFromNamespaces,
  printCallFromTypes,
} from "./printCalls";

const printLines = (filename: string, printed: string[]) => fileWrite(fileViewState(filename), printed.join("\r\n"));

const getRootNodeType = (viewType: ViewType): RootNodeType => {
  switch (viewType) {
    case "assemblies":
    case "references":
      return NodeType.Assembly;
    case "namespaces":
      return NodeType.Namespace;
  }
};

const getForestNode = (forest: Forest, name: string, rootNodeType: AnyNodeType): Node | undefined =>
  forest.allNodes.find((value) => value.type == rootNodeType && value.label == name);

const testViewState = async (viewType: ViewType, tables: Sql.Tables): Promise<void> => {
  const createImage = bindImage((urlPath) => urlPath);

  const viewState = createViewState(tables, viewType);
  let suffix = 0;

  const printViewState = async (): Promise<Forest> => {
    const graphNodes = viewState.getGraphNodes();
    const forest = graphNodes.forest;
    const printed = printForest(forest);
    printLines(`${viewType}-${suffix++}.txt`, printed);

    const imageData = createImageData(graphNodes);
    const image = await createImage(imageData);
    assert(typeof image === "object");
    renameSync(image.imagePath, fileViewState(`${viewType}-${suffix}.svg`));
    return forest;
  };

  let forest = await printViewState();

  let node = getForestNode(forest, "Core", getRootNodeType(viewType));
  assert(!!node);
  viewState.setNodeState(node.nodeId, node.type, { isExpanded: true });
  forest = await printViewState();

  node = getForestNode(forest, "Microsoft", NodeType.Group);
  assert(!!node);
  viewState.setNodeState(node.nodeId, node.type, { isExpanded: false });
  forest = await printViewState();

  node = getForestNode(forest, "System.Collections", NodeType.Group);
  assert(!!node);
  viewState.setNodeState(node.nodeId, node.type, { isHidden: true });
  forest = await printViewState();

  // choose a type which exists in the Core assembly and in the Core namespace
  node = getForestNode(forest, "Program", NodeType.Type);
  assert(!!node);
  viewState.setNodeState(node.nodeId, node.type, { isExpanded: true });
  forest = await printViewState();

  const graphNodes = viewState.getGraphNodes();
};

const printTypeRefs = (tables: Sql.Tables): void => {
  type NamedOwner = { ownerId: Id.AnyOwnerId; fullName: string };
  const namedOwners = tables.signatureTypes
    .join(tables.fullNames, "id", "ownerId")
    .selectAll<NamedOwner>({ ownerId: "signatureTypes.ownerId", fullName: "fullNames.fullName" });

  const printNamedOwners = (name: string, predicate: (id: Id.AnyOwnerId) => boolean) =>
    printLines(
      `fullnames.${name}.txt`,
      namedOwners
        .filter((value) => predicate(value.ownerId))
        .map((value) => value.fullName)
        .sort()
    );

  printNamedOwners("typeSpec", Id.isOwnerTypeSpecId);
  printNamedOwners("methodSpec", Id.isOwnerMethodSpecId);
  printNamedOwners("methodDef", Id.isOwnerMethodDefId);
};

const assertCalls = (tables: Sql.Tables): void => {
  const assembly = tables.assemblies.selectOne({ name: "Core" });
  assert(!!assembly);
  const typeName = tables.typeNames.selectOne({ assemblyId: assembly.id, name: "App" });
  assert(!!typeName);
  const methodName = tables.methodNames.selectOne({ typeId: typeName.id, name: "LoadAssemblies" });
  assert(!!methodName);

  const assertCalls = (where: Partial<Sql.Call>): void => {
    const found = tables.calls.selectWhere(where);
    assert(found.length > 0);
  };

  const assemblyId = Id.toBigAssemblyId(assembly.id);
  assertCalls({ fromId: assemblyId });
  assertCalls({ fromId: typeName.id });
  assertCalls({ fromId: methodName.id });

  assertCalls({ toId: methodName.id });
  assertCalls({ toId: typeName.id });
  assertCalls({ toId: assemblyId });
};

describe("backend2", () => {
  it("loadCoreJson", async () => {
    const dataSource: DataSource = { path: fileCoreJson, type: "coreJson" };
    const { tables } = await createSqlCore(dataSource);

    assertCalls(tables);

    printLines("callsFromMethods.md", printCallFromMethods(tables, "Core"));
    printLines("callsFromTypes.md", printCallFromTypes(tables, "Core"));
    printLines("callsFromNamespaces.md", printCallFromNamespaces(tables, "Core"));
    printLines("callsFromAssemblies.md", printCallFromAssemblies(tables, "Core"));

    const result = listCallSizes(tables, "Core");

    const logCount = (methodName: string, lines: string[]) => log(`${methodName}: ${lines.length} records`);
    logCount("methods", result.methods);
    logCount("type", result.types);
    logCount("namespaces", result.namespaces);
    logCount("assemblies", result.assemblies);

    printLines("listFromMethods.md", result.methods);
    printLines("listFromTypes.md", result.types);
    printLines("listFromNamespaces.md", result.namespaces);
    printLines("listFromAssemblies.md", result.assemblies);

    const difference = (bigger: Set<string>, smaller: Set<string>): string[] =>
      [...bigger].filter((value) => !smaller.has(value));

    printLines("diffFromAssemblies.md", difference(result.setAssemblies, result.setTypes));
    printLines("diffFromNamespaces.md", difference(result.setNamespaces, result.setTypes));

    assert(
      result.setTypes.size == result.setMethods.size && difference(result.setMethods, result.setTypes).length == 0
    );

    await testViewState("assemblies", tables);
    await testViewState("namespaces", tables);

    printTypeRefs(tables);

    tables.close();
  });
});
