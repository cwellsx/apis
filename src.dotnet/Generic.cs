using System;
using System.Collections;
using System.Collections.Generic;

namespace Core
{
    abstract class Generic<T> : IEnumerable<T>
    {
        public abstract IEnumerator<T> GetEnumerator();

        IEnumerator IEnumerable.GetEnumerator()
        {
            throw new NotImplementedException();
        }
    }

    class GenericString : Generic<string>
    {
        public override IEnumerator<string> GetEnumerator()
        {
            throw new NotImplementedException();
        }
    }
}
