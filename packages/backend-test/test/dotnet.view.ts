import { assert, log } from "backend-api";
import { renameSync } from "fs";
import { AnyNodeType, Node, NodeType, RootNodeType } from "sut/contracts-ui";
import { createImage } from "sut/image";
import { Sql, ViewType } from "sut/sql2";
import { createImageData } from "sut/viewModel/createImageData";
import { createViewState, GraphNodes, ViewState } from "sut/viewState";
import { printForest } from "sut/viewState/printForest";
import { createDotNetTables } from "./utils/createDotNetTables";
import { fileViewState } from "./utils/paths";
import { printTestLines } from "./utils/printTestLines";

const printLines = (filename: string, printed: string[]) => printTestLines(fileViewState, filename, printed);

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
        const printed = printForest(graphNodes.roots);
        const filenameRoot = `${viewType}-${suffix++}`;
        printLines(`${filenameRoot}.txt`, printed);

        assert(graphNodes.calls.length != 0);

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
