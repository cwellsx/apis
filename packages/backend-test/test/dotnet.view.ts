import { assert, log } from "backend-api";
import * as fs from "fs";
import { AnyNodeType, Node, NodeType, RootNodeType } from "sut/contracts-ui";
import { createImage } from "sut/image/renderImage";
import { Sql, ViewType } from "sut/sql2";
import type { GraphNodes, ViewState } from "sut/types";
import { stringify } from "sut/utils";
import { createViewState } from "sut/viewState";
import { printForest } from "sut/viewState/printForest";
import { createDotNetTables } from "./utils/createDotNetTables";
import { fileExample, fileViewState } from "./utils/paths";
import { printTestLines } from "./utils/printTestLines";

const printLines = (filename: string, printed: string[]) => printTestLines(fileViewState, filename, printed);

// The example files are copied into the repository, so that what the renderer is given is versioned and can
// be read without running anything -- see ui/README.md. Only the first view of a type is copied: it is the
// initial state, which has both open and closed nodes, and it is small enough to read end to end.
const copyExample = (viewType: ViewType): void => {
  const from = `${viewType}-0`;
  const extensions = ["dot", "svg", "txt"];
  extensions.forEach((extension) =>
    fs.copyFileSync(fileViewState(`${from}.${extension}`), fileExample(`example-${viewType}.${extension}`))
  );
};

const getRootNodeType = (viewType: ViewType): RootNodeType => {
  switch (viewType) {
    case "calls":
    case "references":
      return NodeType.Assembly;
  }
};

const getForestNode = (
  viewState: ViewState,
  name: string,
  rootNodeType: AnyNodeType
): [GraphNodes, Node | undefined] => {
  const graphNodes = viewState.getGraphNodes();
  return [graphNodes, graphNodes.findNode((value) => value.type == rootNodeType && value.label == name)];
};

describe("testViewStates", function () {
  this.timeout(60000);

  let tables: Sql.Tables;

  before(async function () {
    tables = await createDotNetTables(false); // runs once
  });

  after(function () {
    tables.close();
  });

  const viewTypes: ViewType[] = ["calls"];
  for (const viewType of viewTypes) {
    //continue;
    describe(`viewType: ${viewType}`, function () {
      let viewState: ViewState;
      //let forest: Forest;
      let suffix = 0;

      before(function () {
        // safe: runs after tables is assigned
        const view = tables.views.selectOne({ viewType });
        assert(!!view);
        viewState = createViewState(tables, view.viewType, view.id);
        viewState.resetNodeStates();
        //forest = viewState.getGraphNodes().forest;
      });

      const printViewState = async () => {
        const graphNodes = viewState.getGraphNodes();
        const printed = printForest(graphNodes.imageData.roots);
        const filenameRoot = `${viewType}-${suffix++}`;
        printLines(`${filenameRoot}.txt`, printed);

        assert(graphNodes.imageData.edges.length != 0);

        const result = await createImage(graphNodes.imageData, false);
        assert(typeof result === "object");

        fs.writeFileSync(fileViewState(`${filenameRoot}.svg`), result.svg);
        fs.writeFileSync(fileViewState(`${filenameRoot}.dot`), result.dotText);
        fs.writeFileSync(fileViewState(`${filenameRoot}.map`), result.mapXml);
        fs.writeFileSync(fileViewState(`${filenameRoot}.json`), stringify(graphNodes.imageData));

        log(`${filenameRoot}.svg`);

        if (filenameRoot === `${viewType}-0`) copyExample(viewType);
      };

      it("initial state", async function () {
        await printViewState();
      });

      it("expand Core node", async function () {
        const [graphNodes, node] = getForestNode(viewState, "Core", getRootNodeType(viewType));
        assert(!!node);
        viewState.setNodeState(node.nodeId, node.type, { isExpanded: true }, graphNodes);
        await printViewState();
        // close it again before the next test, because it's expensive to show so many
        // viewState.setNodeState(node.nodeId, node.type, { isExpanded: false, isHidden: false });
      });

      it("export .NET Framework node", async function () {
        const [graphNodes, node] = getForestNode(viewState, ".NET Framework", NodeType.Group);
        assert(!!node);
        viewState.setNodeState(node.nodeId, node.type, { isExpanded: true }, graphNodes);
        await printViewState();
      });

      it("collapse Microsoft nodes", async function () {
        const [graphNodes, node] = getForestNode(viewState, "Microsoft", NodeType.Group);
        assert(!!node);
        viewState.setNodeState(node.nodeId, node.type, { isExpanded: false }, graphNodes);
        await printViewState();
      });

      it("hide System.Collections node", async function () {
        const [graphNodes, node] = getForestNode(viewState, "System.Collections", NodeType.Group);
        assert(!!node);
        viewState.setNodeState(node.nodeId, node.type, { isHidden: true }, graphNodes);
        await printViewState();
      });

      it("expand Core namespace", async function () {
        // choose a type which exists in the Core assembly and in the Core namespace
        const [graphNodes, node] = getForestNode(viewState, "Core", NodeType.Namespace);
        assert(!!node);
        viewState.setNodeState(node.nodeId, node.type, { isExpanded: true, isHidden: false }, graphNodes);
        await printViewState();
      });

      it("expand Program node", async function () {
        // choose a type which exists in the Core assembly and in the Core namespace
        const [graphNodes, node] = getForestNode(viewState, "Program", NodeType.Type);
        assert(!!node);
        viewState.setNodeState(node.nodeId, node.type, { isExpanded: true, isHidden: false }, graphNodes);
        await printViewState();
      });
    });
  }
});
