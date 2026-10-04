Windows ATL (Active Template Library) is a brutal test case. It combines heavy preprocessor macros, COM interfaces, and deeply nested C++ template metaprogramming. You are 100% correct: Doxygen will fall apart here. You absolutely need a real compiler frontend.
However, clangd is built specifically to behave as an on-demand, interactive Language Server Protocol (LSP) tool. It indexes your files so it can quickly answer questions like "who calls this method?" when a user clicks it in an IDE. While clangd technically builds a project-wide index in memory, it is not designed to let you easily crawl or dump the entire whole-program call graph into an external database. Trying to scrape all calls out of clangd via massive batch JSON-RPC calls is slow and pushes the tool against its intended design. [1]
For your specific architecture—where you want to sweep the entire codebase upfront and dump all functions and their subroutines into SQLite—you should bypass clangd and look at tools built on the underlying Clang / LLVM LibTooling infrastructure. [2]
Three highly effective methods can pull a full, production-grade C++ call graph out of an ATL project without writing a parser.
------------------------------

## 1. The Clang AST Approach: clang-callgraph (Highly Recommended)

Instead of interactive queries, you can use a Python utility that leverages the official libclang Python bindings to walk the compiler's Abstract Syntax Tree (AST) directly. [3, 4]
A highly popular open-source bridge for this exact task is [clang-callgraph](https://github.com/Vermeille/clang-callgraph). [3]

-
- How it works: You point it at your project's compile_commands.json (which maps out exactly how your ATL code compiles). [3]
- What it does: It runs the Clang frontend over your files, automatically handles all macro expansion and template instantiation, and dumps the entire call graph. [3]
- Your Integration: The tool can be imported as a clean Python script. You can easily modify its internal cursor visitor loop to directly execute INSERT INTO call_edges... right into your SQLite database. [4]
-

## 2. The LLVM IR Approach: opt -dot-callgraph (The Backend Hack)

If you want 100% mathematical certainty that every single template instantiation, virtual table dispatch, and compiler-generated inline expansion is captured, you can extract it after the Clang frontend compiles the code to intermediate bytecode.
You instruct Clang to output LLVM Intermediate Representation (IR), and then pass it to LLVM's analysis engine: [5]

1.  Emit LLVM IR: Run clang++ -S -emit-llvm my_atl_project.cpp -o project.ll (using your CMake compilation flags).
2.  Extract the Call Graph: Run the LLVM optimizer tool with the analysis flag: opt -passes=dot-callgraph project.ll (or opt -analyze -dot-callgraph on older LLVM versions).
3.  The Result: This forces LLVM to spit out a native Graphviz .dot file representing the complete whole-program call graph. Since you already have logic to deal with Graphviz strings, you could parse this .dot file to populate your SQLite DB tables. [5]

## 3. The Specialized Academic Engine: MetaCG

If you want a pre-built tool tailored exactly to what you are doing, look at [MetaCG (Annotated Whole-Program Call-Graphs)](https://github.com/tudasc/MetaCG). [6]

-
- Built specifically by researchers who needed to analyze large C/C++ projects using Clang Tooling, MetaCG includes an explicit subsystem called CGCollector. [6]
- It processes your C++ source files via a compilation database and exports the entire program's structural call-graph layout into a unified, clean JSON format separating the graph structure from metadata. You can read this JSON file directly in your monorepo backend to populate your schema. [6]
-

---

## The Windows ATL Catch

Because ATL is a Microsoft-proprietary framework, it relies heavily on MSVC-specific compiler extensions, intrinsics, and specific Windows SDK headers.
If you want Clang to parse an ATL codebase on Windows successfully, you must ensure your compilation toolchain uses clang-cl (Clang's MSVC-compatible driver mode) rather than standard clang++. When generating your compilation database via CMake or your build system, ensure it targets clang-cl. This tells the underlying Clang parser to emulate Microsoft's compiler quirks, ensuring it won't crash when it encounters complex ATL macros or COM interface definitions. [7]
By pointing a batch tool like clang-callgraph or MetaCG at an MSVC-compatible compilation database, you can extract a perfectly resolved C++ call graph and load it straight into the SQLite architecture you already built for .NET. [3, 6]
When you're ready to start exploring the C++ data source:

-
- Can your ATL project be successfully compiled or exported into a compile_commands.json file using CMake or a tool like Bear?
- How do you plan to represent COM interfaces (IUnknown::QueryInterface, etc.) in the graph, since their actual target methods are resolved dynamically at runtime rather than statically in the source code?
-

[1] [https://github.com](https://github.com/clangd/clangd/discussions/1206)
[2] [https://jplehr.de](https://jplehr.de/2021/03/06/metacg-annotated-whole-program-call-graphs/)
[3] [https://github.com](https://github.com/Vermeille/clang-callgraph)
[4] [https://gist.github.com](https://gist.github.com/will62794/a8bd4f476caec112cb203638a6e42e81)
[5] [https://stackoverflow.com](https://stackoverflow.com/questions/5373714/how-to-generate-a-call-graph-for-c-code)
[6] [https://github.com](https://github.com/tudasc/MetaCG)
[7] [https://devblogs.microsoft.com](https://devblogs.microsoft.com/cppblog/exploring-clang-tooling-part-0-building-your-code-with-clang/)
