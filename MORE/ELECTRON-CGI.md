Yes, I know electron-cgi. It was a neat abstraction over child_process that let Electron/Node and .NET talk via JSON-RPC over stdin/stdout. However, the underlying mechanism was never particularly complicated. For your use case, I would not hesitate to implement it directly.

In fact, what you're describing is essentially:

Node starts a .NET process.
Node writes a request (possibly JSON) to stdin.
.NET writes a JSON response to stdout.
Node waits for process exit and parses the JSON.
Node ensures cleanup if the Electron process exits.

That is entirely straightforward using Node's built-in child_process APIs.

Simplest pattern
import { spawn } from "child_process";

export async function runDotNet<T>(exePath: string): Promise<T> {
return new Promise((resolve, reject) => {
const child = spawn(exePath, [], {
stdio: ["ignore", "pipe", "pipe"],
});

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", data => {
            stdout += data.toString();
        });

        child.stderr.on("data", data => {
            stderr += data.toString();
        });

        child.on("error", reject);

        child.on("close", code => {
            if (code !== 0) {
                reject(
                    new Error(
                        `Exit code ${code}\n${stderr}`
                    )
                );
                return;
            }

            try {
                resolve(JSON.parse(stdout));
            }
            catch (e) {
                reject(e);
            }
        });
    });

}

Usage:

const result = await runDotNet<MyResponse>("mytool.exe");

.NET:

var result = new
{
Success = true,
Message = "Hello"
};

Console.WriteLine(
JsonSerializer.Serialize(result));

For a single request / single response this is almost enough.

The bigger question: one-shot process or long-running process?

There are two architectures.

Option 1: Spawn, wait, exit
Node
|
spawn
v
.NET
|
JSON
v
Node

Benefits:

Extremely simple.
No protocol to design.
No state synchronisation.
No orphaned process concerns if you await completion.
Crashes are isolated.

Drawback:

Startup cost on every request.

For most desktop apps this is perfectly acceptable unless you're calling .NET dozens of times per second.

Option 2: Persistent helper process
Electron
|
stdin/stdout
|
.NET daemon

You launch .NET once on startup.

Node sends:

{
"command": "analyse",
"data": ...
}

.NET replies:

{
"requestId": 123,
"result": ...
}

This is basically what electron-cgi was doing.

Benefits:

Faster.
Process startup paid once.

Drawbacks:

Need framing.
Need request IDs.
Need shutdown handling.
Need timeout handling.

Unless performance measurements justify it, I'd start with Option 1.

Robustness considerations

A few things I'd definitely add.

Timeout

Never wait forever:

const timer = setTimeout(() => {
child.kill();
reject(new Error("Timeout"));
}, 30000);

Clear it when the process exits.

Kill child if Electron dies
app.on("before-quit", () => {
child.kill();
});

For a long-running helper.

Don't mix logs with stdout

This is a classic mistake.

If stdout contains:

Starting...
{"success":true}
Finished.

JSON parsing becomes impossible.

Use:

Console.Error.WriteLine("diagnostic log");

for logging.

Reserve stdout for protocol messages.

Packages I'd consider today

Honestly, for a request/response pattern I'd reach for no package at all.

Node's:

import { spawn } from "child_process";

is mature and heavily used.

The value of a package is mostly:

request IDs
framing
JSON-RPC
reconnect logic

If you do want a protocol, I'd look at:

vscode-jsonrpc
node-json-rpc
raw JSON-RPC implementations

because the protocol is standardised and maintained.

In fact VS Code extensions frequently communicate with language servers via JSON-RPC over stdin/stdout. That's a very similar architecture.

What I'd do

Given your previous comments, I suspect your .NET code is doing some heavy metadata analysis and GraphViz generation rather than servicing hundreds of requests per second.

I'd probably implement:

Electron
|
spawn await
|
dotnet tool
|
JSON on stdout

with zero dependencies.

A couple of hundred lines of TypeScript would give you:

strongly typed requests/responses
timeout support
clean error handling
process cleanup

and you'd have one less unmaintained package in your dependency graph.

For the one-request/one-response case, I'd actually regard this as pretty trivial to write well using only child_process.spawn() and System.Text.Json.

---

Good question. Yes, for a one-shot child process, the code I showed is already continuously draining stdout and stderr as data arrives:

child.stdout.on("data", data => {
stdout += data.toString();
});

Node reads from the pipe whenever data becomes available. It does not wait until the process exits before reading.

So this:

.NET -> stdout pipe -> Node

will continue to flow while the .NET process is running.

The situation you're thinking of is real though. If the parent never reads the child's stdout, eventually the OS pipe buffer fills and the child blocks on write.

For example, this is dangerous:

const child = spawn(...);

// do not read stdout

await once(child, "close");

because the .NET side might be trying to write 10 MB of JSON while nobody is consuming it.

The version I showed does not have that problem because both:

child.stdout.on("data", ...)
child.stderr.on("data", ...)

are attached immediately after spawning.

A few practical limits remain.

String concatenation

If your JSON is hundreds of MB:

stdout += chunk.toString();

becomes inefficient.

I'd do:

const chunks: Buffer[] = [];

child.stdout.on("data", chunk => {
chunks.push(chunk);
});

then:

const json = Buffer.concat(chunks).toString("utf8");

at the end.

This avoids repeatedly reallocating larger and larger strings.

How big is "big"?

For desktop app IPC:

100 KB JSON: trivial
1 MB JSON: trivial
10 MB JSON: generally fine
100 MB JSON: start thinking harder
1 GB JSON: wrong architecture

For the sort of metadata-analysis tool you've been discussing recently, I would expect the result to be somewhere between a few KB and a few MB. That's well within the comfort zone of this approach.

Even simpler: use execFile

Node already has a helper for the classic "run a process and capture its output" use case:

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const { stdout } = await execFileAsync(
"mytool.exe",
["arg1"]
);

const result = JSON.parse(stdout);

However there is a catch:

maxBuffer

defaults to a limited size.

For large JSON you must increase it:

await execFileAsync(
"mytool.exe",
[],
{
maxBuffer: 50 * 1024 * 1024
}
);

Personally I'd probably use spawn() rather than execFile() because:

no hidden buffer limits
explicit handling of stdout/stderr
scales naturally if output grows

One .NET-specific suggestion: if the payload might become large, write the JSON with

await JsonSerializer.SerializeAsync(
Console.OpenStandardOutput(),
result);

rather than:

Console.WriteLine(
JsonSerializer.Serialize(result));

The former streams directly to stdout and avoids constructing one giant string in managed memory before writing it. For small payloads it doesn't matter, but it's a nice habit if you're moving lots of metadata around.

So overall: yes, reading stdout via the "data" event is already the correct way to avoid pipe-buffer deadlock. For robustness I'd change the sample to accumulate Buffer chunks rather than repeatedly appending to a string.
