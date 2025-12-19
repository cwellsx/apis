using System;
using System.Linq;
using System.Threading.Tasks;

namespace Core.Test
{
    internal class AsyncCacheExample
    {
        public async Task RunAsync()
        {
            // LINQ inside async → compiler emits a state machine (<RunAsync>d__0)
            // and caches the lambda in <>c
            var data = new[] { 1, 2, 3 };
            var doubled = data.Select(x => x * 2).ToArray();

            await Task.Delay(10);
            Console.WriteLine(string.Join(",", doubled));
        }
    }
}
