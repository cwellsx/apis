using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace Custom
{
    public record Project(string ProjectPath, string[] Dependencies);
    public record Coclass(string ProjectPath, string CoclassName, Interface[] Interfaces);
    public record Interface(string ProjectPath, string InterfaceName, string[] Details);

    public static class Input
    {
        public static (Node[] coclassNodes, Node[] interfaceNodes) Convert(Project[] projects, Coclass[] coclasses, Interface[] interfaces)
        {
            var mapCoclasses = coclasses.ToDictionary(coclass => coclass.CoclassName);
            //var mapInterfaces = interfaces.ToDictionary(@interface => @interface.InterfaceName);

            var coclassNodes = coclasses.Select(ToNode)
                .Concat(projects.Select(project => project.ToNode(CoclassDependencies(project.Dependencies, mapCoclasses))))
                .ToArray();

            var interfaceNodes = interfaces.Select(ToNode)
                .Concat(projects.Select(project => project.ToNode(InterfaceDependencies(project.Dependencies, mapCoclasses))))
                .ToArray();

            return (coclassNodes, interfaceNodes);
        }

        static Dependency[] CoclassDependencies(string[] coclassNames, Dictionary<string, Coclass> mapCoclasses)
        {
            return coclassNames.Select(coclassName => mapCoclasses[coclassName].ToDependency()).ToArray();
        }

        static Dependency[] InterfaceDependencies(string[] coclassNames, Dictionary<string, Coclass> mapCoclasses)
        {
            return coclassNames.SelectMany(coclassName => mapCoclasses[coclassName].Interfaces.Select(@interface => @interface.ToDependency())).ToArray();
        }

        static Dependency ToDependency(this Coclass coclass) => new Dependency(
            Id: coclass.CoclassName,
            Label: coclass.CoclassName,
            Details: coclass.ToDetails(),
            Properties: null
            );

        static Dependency ToDependency(this Interface @interface) => new Dependency(
            Id: @interface.InterfaceName,
            Label: @interface.InterfaceName,
            Details: @interface.ToDetails().ToArray(),
            Properties: null
            );

        static Node ToNode(Coclass coclass) => new Node(
            Id: coclass.CoclassName,
            Label: null,
            Layer: coclass.ProjectPath,
            Tags: null,
            Details: coclass.ToDetails(),
            Dependencies: new Dependency[0]
            );

        static Node ToNode(Interface @interface) => new Node(
            Id: @interface.InterfaceName,
            Label: null,
            Layer: @interface.ProjectPath,
            Tags: null,
            Details: @interface.ToDetails().ToArray(),
            Dependencies: new Dependency[0]
            );

        static Node ToNode(this Project project, Dependency[] dependencies) => new Node(
            Id: project.ProjectPath,
            Label: Path.GetFileName(project.ProjectPath),
            Layer: Path.GetDirectoryName(project.ProjectPath) ?? throw new Exception(),
            Tags: null,
            Details: null,
            Dependencies: dependencies
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
