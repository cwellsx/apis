using System;
using System.IO;
using System.Collections.Generic;
using System.Linq;

namespace Custom
{
    internal static class Extensions
    {
        internal static void AssertSanity(this Node[] nodes)
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

        internal static void AssertSanity(Project[] projects)
        {
            var hashSet = new HashSet<string>();
            foreach (var project in projects)
            {
                if (string.IsNullOrEmpty(Path.GetExtension(project.ProjectPath)))
                {
                    throw new Exception($"Expected path including project filename: {project.ProjectPath}");
                }
                if (!hashSet.Add(project.ProjectDir))
                {
                    throw new Exception($"Expected unique project directory: {project.ProjectDir}");
                }
            }
        }

        internal static void AssertSanity(Project[] projects, IEnumerable<string> projectDirs)
        {
            var hashSet = projects.Select(project => Path.GetDirectoryName(project.ProjectPath)).ToHashSet();

            foreach (var projectDir in projectDirs)
            {
                if (!hashSet.Contains(projectDir))
                {
                    throw new Exception($"Expected matching project directory: {projectDir}");
                }
            }
        }
    }
}
