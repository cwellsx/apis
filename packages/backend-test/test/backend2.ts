import { assert, log } from "backend-api";
import { DataSource } from "backend-app";
import { renameSync } from "fs";
import { AnyNodeType, Node, NodeType, RootNodeType } from "sut/contracts-ui";
import * as Id from "sut/id2";
import { bindImage } from "sut/image";
import { createSqlCore, getDbFilename } from "sut/openDataSource/createSqlCore";
import { createImageData } from "sut/presenter/createImageData";
import { Sql, ViewType } from "sut/sql2";
import { deleteFileSync } from "sut/utils";
import { createViewState, ViewState } from "sut/viewState";
import { printForest } from "sut/viewState/printForest";
import { Forest } from "sut/viewState/types";
import { fileWrite } from "./file";
import { fileCoreJson, fileViewState } from "./paths2";
import {
  listCallSizes,
  printCallFromAssemblies,
  printCallFromMethods,
  printCallFromNamespaces,
  printCallFromTypes,
} from "./printCalls";

const printLines = (filename: string, printed: string[]) => {
  log(filename);
  fileWrite(fileViewState(filename), printed.join("\r\n"));
};

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

const createTables = async (deleteDb: boolean): Promise<Sql.Tables> => {
  const dataSource: DataSource = { path: fileCoreJson, type: "coreJson" };
  if (deleteDb) {
    const filename = getDbFilename(dataSource);
    deleteFileSync(filename);
  }
  return await createSqlCore(dataSource);
};

describe("backend2", () => {
  it("loadCoreJson", async () => {
    const tables = await createTables(false);

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

    printTypeRefs(tables);

    tables.close();
  });
});

describe("testViewStates", function () {
  this.timeout(60000);

  const createImage = bindImage((urlPath) => urlPath);
  let tables: Sql.Tables;

  before(async function () {
    tables = await createTables(false); // runs once
  });

  after(function () {
    tables.close();
  });

  const viewTypes: ViewType[] = ["assemblies", "namespaces"];
  for (const viewType of viewTypes) {
    describe(`viewType: ${viewType}`, function () {
      let viewState: ViewState;
      //let forest: Forest;
      let suffix = 0;

      before(function () {
        // safe: runs after tables is assigned
        viewState = createViewState(tables, viewType);
        viewState.resetNodeStates();
        //forest = viewState.getGraphNodes().forest;
      });

      const getForest = (): Forest => viewState.getGraphNodes().forest;

      const printViewState = async () => {
        const graphNodes = viewState.getGraphNodes();
        const forest = graphNodes.forest;
        const printed = printForest(forest);
        const filenameRoot = `${viewType}-${suffix++}`;
        printLines(`${filenameRoot}.txt`, printed);

        const imageData = createImageData(graphNodes);
        const image = await createImage(imageData);
        assert(typeof image === "object");
        const filename = `${filenameRoot}.svg`;
        renameSync(image.imagePath, fileViewState(filename));
        log(filename);
      };

      it("initial state", async function () {
        await printViewState();
      });

      it("expand Core node", async function () {
        const forest = getForest();
        const node = getForestNode(forest, "Core", getRootNodeType(viewType));
        assert(!!node);
        viewState.setNodeState(node.nodeId, node.type, { isExpanded: true, isHidden: false });
        await printViewState();
        // close it again before the next test, because it's expensive to show so many
        // viewState.setNodeState(node.nodeId, node.type, { isExpanded: false, isHidden: false });
      });

      it("collapse Microsoft nodes", async function () {
        const forest = getForest();
        const node = getForestNode(forest, "Microsoft", NodeType.Group);
        assert(!!node);
        viewState.setNodeState(node.nodeId, node.type, { isExpanded: false, isHidden: false });
        await printViewState();
      });

      it("hide System.Collections node", async function () {
        const forest = getForest();
        const node = getForestNode(forest, "System.Collections", NodeType.Group);
        assert(!!node);
        viewState.setNodeState(node.nodeId, node.type, { isHidden: true, isExpanded: true });
        await printViewState();
      });

      it("expand Program node", async function () {
        // choose a type which exists in the Core assembly and in the Core namespace
        const forest = getForest();
        const node = getForestNode(forest, "Program", NodeType.Type);
        assert(!!node);
        viewState.setNodeState(node.nodeId, node.type, { isExpanded: true, isHidden: false });
        await printViewState();
      });
    });
  }
});
