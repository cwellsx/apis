using System;
using System.Linq;

namespace Core.Test
{
    internal class DisplayCacheExample
    {
        public void Run()
        {
            int captured = 42;
            // Captured variable → compiler emits <>c__DisplayClass0_0
            // The display class method will itself call into a cached lambda in <>c
            var data = new[] { captured, captured + 1 };
            var doubled = data.Select(x => x * 2).ToArray();

            Console.WriteLine(string.Join(",", doubled));
        }
    }
}
