using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Core.Test
{
    public class StaticInitializer
    {
        static string _foo = Foo();
        static int[] _bar = new int[] { 1, 2, 3 };
        static string Foo() => "foo";

        public static string Test()
        {
            return _foo;
        }
    }
}
