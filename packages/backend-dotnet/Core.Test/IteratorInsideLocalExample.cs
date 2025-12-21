using System.Collections.Generic;

namespace Core.Test
{
    internal class IteratorInsideLocalExample
    {
        IEnumerable<int> Foo()
        {
            IEnumerable<int> Local()
            {
                yield return 1;
            }
            return Local();
        }
    }
}
