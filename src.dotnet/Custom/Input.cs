using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace Custom
{
    public record Project(string ProjectPath, ProjectDependency[] Dependencies)
    {
        public string ProjectDir => GetDirectoryName(ProjectPath);
        public string Layer => ProjectDir;

        static string GetDirectoryName(string path) => Path.GetDirectoryName(path) ?? throw new Exception();
    }
    public record Coclass(string ProjectDir, string CoclassName, Interface[] Interfaces);
    public record Interface(string ProjectDir, string InterfaceName, string[] Details);

    public record ProjectDependency(string CoclassName, string Action);

    public static class Input
    {
        public static (Node[] coclassNodes, Node[] interfaceNodes) Convert(Project[] projects, Coclass[] coclasses, Interface[] interfaces)
        {
            Extensions.AssertSanity(projects);
            Extensions.AssertSanity(projects, coclasses.Select(coclass => coclass.ProjectDir));
            Extensions.AssertSanity(projects, interfaces.Select(@interface => @interface.ProjectDir));

            var mapCoclasses = coclasses.ToDictionary(coclass => coclass.CoclassName);

            var coclassNodes = coclasses.Select(ToNode)
                .Concat(projects.Select(project => project.ToNode(CoclassDependencies(project.Dependencies, mapCoclasses))))
                .ToArray();

            var interfaceNodes = interfaces.Select(ToNode)
                .Concat(projects.Select(project => project.ToNode(InterfaceDependencies(project.Dependencies, mapCoclasses))))
                .ToArray();

            Extensions.AssertSanity(coclassNodes);
            Extensions.AssertSanity(interfaceNodes);

            return (coclassNodes, interfaceNodes);
        }

        static Dependency[] CoclassDependencies(ProjectDependency[] dependencies, Dictionary<string, Coclass> mapCoclasses)
        {
            return dependencies.Select(dependency => mapCoclasses[dependency.CoclassName].ToDependency(dependency.Action)).ToArray();
        }

        static Dependency[] InterfaceDependencies(ProjectDependency[] dependencies, Dictionary<string, Coclass> mapCoclasses)
        {
            return dependencies.SelectMany(dependency => mapCoclasses[dependency.CoclassName].Interfaces.Select(@interface => @interface.ToDependency(dependency.Action))).ToArray();
        }

        static Dictionary<string, bool> ToProperties(string action) => new Dictionary<string, bool>() { { action, true } };

        static Dependency ToDependency(this Coclass coclass, string Action) => new Dependency(
            Id: coclass.CoclassName,
            Label: $"{Action} {coclass.CoclassName}",
            Details: coclass.ToDetails(),
            Properties: ToProperties(Action)
            );

        static Dependency ToDependency(this Interface @interface, string Action) => new Dependency(
            Id: @interface.InterfaceName,
            Label: @interface.InterfaceName,
            Details: @interface.ToDetails().ToArray(),
            Properties: ToProperties(Action)
            );

        static Node ToNode(Coclass coclass) => new Node(
            Id: coclass.CoclassName,
            Label: null,
            Layer: coclass.ProjectDir,
            Tags: null,
            Details: coclass.ToDetails(),
            Dependencies: new Dependency[0],
            Shape: "component"
            );

        static Node ToNode(Interface @interface) => new Node(
            Id: @interface.InterfaceName,
            Label: null,
            Layer: @interface.ProjectDir,
            Tags: null,
            Details: @interface.ToDetails().ToArray(),
            Dependencies: new Dependency[0],
            Shape: "component"
            );

        static Node ToNode(this Project project, Dependency[] dependencies) => new Node(
            Id: project.ProjectDir,
            Label: Path.GetFileNameWithoutExtension(project.ProjectPath),
            Layer: project.Layer,
            Tags: null,
            Details: null,
            Dependencies: dependencies,
            Shape: "folder"
            );

        static string[] ToDetails(this Coclass coclass) => coclass.Interfaces.Select(ToDetails).ToArray().JoinDetails();

        static List<string> ToDetails(this Interface @interface)
        {
            var list = new List<string>();
            list.Add($"**{@interface.InterfaceName}**");
            list.Add("");
            list.Add("```");
            list.AddRange(@interface.Details);
            list.Add("```");
            return list;
        }

        static string[] JoinDetails(this List<string>[] details)
        {
            if (details.Length == 1)
            {
                return details[0].ToArray();
            }
            var all = new List<string>();
            foreach (var list in details)
            {
                if (all.Count != 0)
                {
                    // simply an empty line as a separator
                    all.Add("");
                }
                all.AddRange(list);
            }
            return all.ToArray();
        }
    }
}
