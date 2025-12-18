using System.Collections.Generic;

namespace Core.Test
{
    internal class IteratorExample
    {
        public IEnumerable<int> GetNumbers()
        {
            yield return 1;
            yield return 2;
            yield return 3;
        }
    }
}
