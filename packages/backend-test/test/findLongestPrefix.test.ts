import * as assert from "assert";
import { findLongestPrefix } from "sut/utils";

// findLongestPrefix finds the nearest ancestor of a name, comparing names as sequences of segments.
// There are two ways a label matches: it equals the name, or the name continues with the separator.
// So "Foo" is an ancestor of "Foo.Bar" but not of "FooBar" or "Foo.Baz", and every name matches itself.
// The compiler can't check the rule, so the interesting cases are the near misses.
// The three call sites are: getNamespaceMap (namespaces, "."), makeNodes findParent (groups and
// assemblies, ".") and createCustomViewState (layers, "/").

// the shape of a Schema.Namespace record -- findLongestPrefix returns the item, so callers can read its id
type Named = { id: number; name: string };

const named = (...names: string[]): Named[] => names.map((name, id) => ({ id, name }));

// what the namespace and group call sites do: find the parent by name, and report the name found
const find = (name: string, names: string[], separator?: string): string | undefined =>
  findLongestPrefix(name, named(...names), (item) => item.name, separator)?.name;

describe("findLongestPrefix", () => {
  describe('namespaces and groups -- names separated by "."', () => {
    // System.Collections.Generic is a namespace inside System.Collections, and both are inside System
    // so of the two matches, the longest wins
    it("finds the nearest enclosing name, not the outermost", () => {
      assert.strictEqual(find("System.Collections.Generic", ["System", "System.Collections"]), "System.Collections");
    });

    // the loop in getNamespaceMap visits names in sorted order
    // so the answer must not depend on where in the array the longest match happens to be
    it("returns the same answer whatever the order of the items", () => {
      assert.strictEqual(find("Microsoft.Win32.Registry", ["Microsoft", "Microsoft.Win32"]), "Microsoft.Win32");
      assert.strictEqual(find("Microsoft.Win32.Registry", ["Microsoft.Win32", "Microsoft"]), "Microsoft.Win32");
    });

    // the bug this function was written to fix: names which merely begin with the same letters
    // are not related, so MicrosoftOffice is not inside Microsoft
    it("does not match a name which only begins with the same letters", () => {
      assert.strictEqual(find("MicrosoftOffice", ["Microsoft"]), undefined);
    });

    // the same mistake one level down: Foo.BarBaz begins with the characters of Foo.Bar,
    // but the next character is part of a segment rather than a separator, so it is a sibling
    it("does not match when the common prefix ends mid-segment", () => {
      assert.strictEqual(find("Foo.BarBaz", ["Foo.Bar"]), undefined);
    });

    // Foo.Baz and Foo.Bar share ancestry but neither contains the other
    it("does not match a sibling segment", () => {
      assert.strictEqual(find("Foo.Baz", ["Foo.Bar"]), undefined);
    });

    // a top-level namespace has no parent, whatever other names are present
    it("finds no parent for a top-level name", () => {
      assert.strictEqual(find("Foo", ["FooBar", "FooBaz"]), undefined);
    });

    // the label is longer than the name so it cannot be a prefix of it -- an assembly whose
    // namespaces have no types directly in them has no entry for its own name
    it("does not match a label longer than the name", () => {
      assert.strictEqual(find("Foo", ["Foo.Bar"]), undefined);
    });

    // the list is empty when every namespace in the assembly is top-level
    it("finds no parent when there are no items", () => {
      assert.strictEqual(find("Foo.Bar", []), undefined);
    });

    // .NET names are case sensitive, so the match is ordinal and never case folded
    it("matches case sensitively", () => {
      assert.strictEqual(find("foo.Bar", ["Foo"]), undefined);
    });

    // a name can equal a label: System is a group (because System.Collections, System.Core and
    // System.Xml are assemblies) and System is also an assembly, which belongs inside that group
    // findParent relies on this -- it is only handed the items of earlier layers, never its own
    it("matches a name equal to a label", () => {
      assert.strictEqual(find("System", ["System", "System.Collections"]), "System");
    });

    // getNamespaceMap must never parent a namespace to itself, so it removes the item it is
    // asking about before calling -- this is that idiom, and the reason the equality case matters
    it("is made to exclude the item itself when the name equals a label", () => {
      const namespaces = named("Foo", "Foo.Bar");
      const self = namespaces[0];
      const others = namespaces.filter((candidate) => candidate !== self);
      assert.strictEqual(
        findLongestPrefix(self.name, others, (item) => item.name),
        undefined
      );
    });

    // unrelated families which differ after the first segment do not interfere
    it("ignores decoy names from other families", () => {
      assert.strictEqual(
        find("Microsoft.Win32.Registry", ["Microsoft", "Microsoft.Win32", "Microsoft.Windows.SDK"]),
        "Microsoft.Win32"
      );
    });

    // an assembly name matches its group by segment, which is how getGroupNames builds groups
    it("matches an assembly name to its group", () => {
      assert.strictEqual(find("System.Collections.Immutable", ["System", "System.Collections"]), "System.Collections");
    });
  });

  describe('custom layers -- names separated by "/"', () => {
    // the custom view passes "/" to makeNodes because its layer ids are slash separated,
    // as in the test which expands DataCaptor/Core/ClientLayer/ClientLayerMng
    it("finds the nearest enclosing layer", () => {
      assert.strictEqual(
        find("DataCaptor/Core/ClientLayer", ["DataCaptor", "DataCaptor/Core"], "/"),
        "DataCaptor/Core"
      );
    });

    // one level of nesting is enough to be a parent
    it("finds a parent one level up", () => {
      assert.strictEqual(find("DataCaptor/Core", ["DataCaptor"], "/"), "DataCaptor");
    });

    // without the separator argument the default dot applies and every custom layer would become
    // a root -- which is why createCustomViewState passes the separator through makeNodes
    it("finds no parent when the dot separator is used", () => {
      assert.strictEqual(find("DataCaptor/Core", ["DataCaptor"]), undefined);
    });

    // the mirror image: a dotnet name does not match when the slash separator is used
    it("does not match dotnet names when the separator is a slash", () => {
      assert.strictEqual(find("A.B", ["A"], "/"), undefined);
    });
  });

  describe("contract", () => {
    // callers need the item, not the label -- getNamespaceMap reads the id of the item returned
    it("returns the item itself", () => {
      const items = named("Foo");
      assert.strictEqual(
        findLongestPrefix("Foo.Bar", items, (item) => item.name),
        items[0]
      );
    });

    // the label is whatever the caller says it is -- a Node uses "label" and a namespace uses "name"
    it("compares the label the caller chooses", () => {
      const nodes = [{ label: "Foo", name: "not the label" }];
      assert.strictEqual(findLongestPrefix("Foo.Bar", nodes, (item) => item.label)?.label, "Foo");
    });

    // the separator defaults to a dot, which is what getNamespaceMap and the dotnet makeNodes rely on
    it("defaults the separator to a dot", () => {
      assert.strictEqual(findLongestPrefix("Foo.Bar", named("Foo"), (item) => item.name)?.name, "Foo");
    });
  });
});
