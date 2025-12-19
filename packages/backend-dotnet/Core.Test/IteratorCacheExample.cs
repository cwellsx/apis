using System.Collections.Generic;
using System.Linq;

namespace Core.Test
{
    internal class IteratorCacheExample
    {
        public IEnumerable<int> GetNumbers()
        {
            var data = new[] { 1, 2, 3 };
            // LINQ inside iterator → compiler emits <GetNumbers>d__0
            // which calls into <>c.<GetNumbers>b__0_0
            var doubled = data.Select(x => x * 2).ToArray();

            foreach (var d in doubled)
                yield return d;
        }
    }
}
