using System;
using System.Collections;
using System.Collections.Generic;

/*
 * This isn't called at run-time.
 * It's an example so that if we use this Core.exe to load its own binaries then the output includes a generic class.
 */

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
