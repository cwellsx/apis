using System;
using System.Linq;

namespace Core.Test
{
    internal class LambdaCacheExample
    {
        public void Run()
        {
            var data = new[] { 1, 2, 3 };
            // The compiler will cache this lambda in a <>c class
            var doubled = data.Select(x => x * 2).ToArray();
            Console.WriteLine(string.Join(",", doubled));
        }
    }
}
