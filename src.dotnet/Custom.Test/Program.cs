﻿using System.Collections.Generic;
using System.IO;
//using Custom;

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
            var properties = new Dictionary<string, bool>(){ { "foo", true} };
            Node[] nodes =
            {
                new Node(Id: "first", Label: "", Layer: "", Tags: null, Details: null, Dependencies: new[]{new Dependency(Id: "second", Label: null, Details: null, Properties: properties) }),
                new Node(Id: "second", Label: "", Layer: "", Tags: null, Details: null, Dependencies: new Dependency[0])
            };

            nodes.Write(path);
        }

        static void Input(string coclassesPath, string interfacesPath)
        {
            Project projectA = new Project(@"foo\A", new string[] { "classA", "classB", "classC" });
            Project projectB = new Project(@"bar\B", new string[] { "classC" });
            Project projectC = new Project(@"bar\C", new string[0]);

            Interface interfaceA = new Interface(projectA.ProjectPath, "interfaceA", new string[] { "SelectA", "InsertA" });
            Interface interfaceB1 = new Interface(projectB.ProjectPath, "interfaceB1", new string[] { "SelectB1", "InsertB1" });
            Interface interfaceB2 = new Interface(projectB.ProjectPath, "interfaceB2", new string[] { "SelectB2", "InsertB2" });
            Interface interfaceC = new Interface(projectC.ProjectPath, "interfaceC", new string[] { "SelectC", "InsertC" });

            Coclass coclassA = new Coclass(projectA.ProjectPath, "classA", new Interface[] { interfaceA });
            Coclass coclassB = new Coclass(projectB.ProjectPath, "classB", new Interface[] { interfaceB1, interfaceB2 });
            Coclass coclassC = new Coclass(projectC.ProjectPath, "classC", new Interface[] { interfaceC });

            var (coclassNodes, interfaceNodes) = Custom.Input.Convert(
                new Project[] { projectA, projectB, projectC },
                new Coclass[] { coclassA, coclassB, coclassC },
                new Interface[] { interfaceA, interfaceB1, interfaceB2, interfaceC }
                );

            coclassNodes.Write(coclassesPath);
            interfaceNodes.Write(interfacesPath);
        }

        static void Write(this Node[] nodes, string path)
        {
            nodes.AssertSanity();
            var json = nodes.ToJson(true);
            File.WriteAllText(path, json);
        }
    }
}
