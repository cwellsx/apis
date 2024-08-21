using System.Collections.Generic;
using System.IO;

namespace Custom.Test
{
    static class Program
    {
        static void Main()
        {
            var outputDir = @"..\..\..\Output";
            outputDir = Path.GetFullPath(outputDir);
            Directory.CreateDirectory(outputDir);

            Trivial(Path.Combine(outputDir, "trivial.json"));
            Input(Path.Combine(outputDir, "coclasses.json"), Path.Combine(outputDir, "interfaces.json"));
        }

        static void Trivial(string path)
        {
            var properties = new Dictionary<string, bool>() { { "foo", true } };
            Node[] nodes =
            {
                new Node(Id: "first", Label: "", Layer: "", Tags: null, Details: null, Dependencies: new[]{ new Dependency(Id: "second", Label: null, Details: null, Properties: properties) }, Shape: null),
                new Node(Id: "second", Label: "", Layer: "", Tags: null, Details: null, Dependencies: new Dependency[0], Shape: null)
            };

            nodes.Write(path);
        }

        static void Input(string coclassesPath, string interfacesPath)
        {
            Project projectA = new Project(@"foo\foo\A\A.vcxproj", new ProjectDependency[]
            {
                new ProjectDependency("classA", "creates"),
                new ProjectDependency("classA", "uses"),
                new ProjectDependency("classB", "uses"),
                new ProjectDependency("classC", "uses"),
            });
            Project projectB = new Project(@"foo\bar\B\B.vcxproj", new ProjectDependency[] { new ProjectDependency("classC", "uses") });
            Project projectC = new Project(@"foo\bar\C\C.vcxproj", new ProjectDependency[0]);
            Project projectD = new Project(@"foo\D\D.vcxproj", new ProjectDependency[]
            {
                new ProjectDependency("classA", "uses"),
            });

            Interface interfaceA = new Interface(projectA.ProjectDir, "interfaceA", new string[] { "SelectA", "InsertA" });
            Interface interfaceB1 = new Interface(projectB.ProjectDir, "interfaceB1", new string[] { "SelectB1", "InsertB1" });
            Interface interfaceB2 = new Interface(projectB.ProjectDir, "interfaceB2", new string[] { "SelectB2", "InsertB2" });
            Interface interfaceC = new Interface(projectC.ProjectDir, "interfaceC", new string[] { "SelectC", "InsertC" });

            Coclass coclassA = new Coclass(projectA.ProjectDir, "classA", new Interface[] { interfaceA });
            Coclass coclassB = new Coclass(projectB.ProjectDir, "classB", new Interface[] { interfaceB1, interfaceB2 });
            Coclass coclassC = new Coclass(projectC.ProjectDir, "classC", new Interface[] { interfaceC });

            var (coclassNodes, interfaceNodes) = Custom.Input.Convert(
                new Project[] { projectA, projectB, projectC, projectD },
                new Coclass[] { coclassA, coclassB, coclassC },
                new Interface[] { interfaceA, interfaceB1, interfaceB2, interfaceC }
                );

            coclassNodes.Write(coclassesPath);
            interfaceNodes.Write(interfacesPath);
        }

        static void Write(this Node[] nodes, string path)
        {
            var json = nodes.ToJson(true);
            File.WriteAllText(path, json);
        }
    }
}
