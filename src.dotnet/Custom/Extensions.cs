using System;
using System.Collections.Generic;

namespace Custom
{
    public static class Extensions
    {
        public static void AssertSanity(this Node[] nodes)
        {
            var ids = new HashSet<string>();

            // verify Node.Id
            foreach (var node in nodes)
            {
                if (string.IsNullOrEmpty(node.Id))
                {
                    throw new Exception($"Missing node id: {node}");
                }
                if (!ids.Add(node.Id))
                {
                    throw new Exception($"Duplicate node id: {node}");
                }
            }

            // verify Dependency.Id
            foreach (var node in nodes)
            {
                foreach (var dependency in node.Dependencies)
                {
                    if (string.IsNullOrEmpty(dependency.Id))
                    {
                        throw new Exception($"Missing dependency id: {dependency}");
                    }
                    if (!ids.Contains(dependency.Id))
                    {
                        throw new Exception($"Unknown dependency id: {dependency}");
                    }
                }
            }
        }

        public static void Convert(Project[] projects)
        {

        }
    }
}
