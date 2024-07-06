using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Core.Test
{
    class DelegateParameter
    {
        static bool IsMicrosoftPath(string path) => path == "Microsoft";

        static IEnumerable<string> GetPaths() => System.IO.Directory.GetDirectories(".").Where(path => !IsMicrosoftPath(path));

        public void Test()
        {
            GetPaths();
        }
    }
}
