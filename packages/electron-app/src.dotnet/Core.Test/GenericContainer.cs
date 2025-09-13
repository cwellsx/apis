using System.Collections.Generic;

using IOutput = System.Int32;

/*
 * The purpose of this is to implement a complicated generic call which is difficult for MethodFinder to resolve:
 * - So that it can be debugged (by decompiling this and stepping through the MethodFinder implementation)
 * - To act as a regression-test in future
 */

namespace Core.Test
{
    public class GenericContainer
    {
        internal class ArrayT<T>
        {
            // the Convert type is difficult because its generic parameter is declared by its containing class
            internal delegate IOutput Convert(T child);
            List<IOutput> m_children;

            internal ArrayT(Convert convert, IEnumerable<T> children)
            {
                m_children = new List<IOutput>();
                if (children != null)
                {
                    foreach (T child in children)
                    {
                        if (child == null)
                            continue;
                        m_children.Add(convert(child));
                    }
                }
            }

            public IEnumerable<IOutput> children
            {
                get { return m_children; }
            }
        }

        private static IOutput Create(string child)
        {
            return child.Length;
        }

        public static void Test()
        {
            var strings = new string[] { "Hello", "World" };
            var array = new ArrayT<string>(Create, strings);
        }
    }
}
