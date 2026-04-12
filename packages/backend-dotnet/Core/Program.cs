using System;
using System.IO;

using ElectronCgi.DotNet;

using Core.Output;
using Core.Serializer;
using Core.Application;
using Core.FullNames;

namespace Core
{
    class Program
    {
        static void Main(string[] args)
        {
            Test.SelfTest.Run();

            switch (args.Length)
            {
                case 0:
                    // No arguments, run the server
                    Logger.Log("Core starting");
                    Listen();
                    break;
                case 1:
                    // One argument, run the self-test or load assemblies
                    try
                    {
                        HandleArgument(args[0]);
                    }
                    catch (Exception e)
                    {
                        Console.WriteLine(e.ToString());
                    }   
                    break;
                default:
                    throw new ArgumentException("Expected no arguments in production or one argument for debugging as a standalone program");
            }
        }

        static void HandleArgument(string argument)
        {
            switch (argument)
            {
                case "--selfload":
                    SelfLoad();
                    Logger.Log("SelfLoad OK");
                    break;
                case "--selftest":
                    SelfTest();
                    Logger.Log("SelfTest OK");
                    break;
                default:
                    // Load assemblies from the specified directory
                    TestLoad(argument);
                    Logger.Log("TestLoad OK");
                    break;
            }
        }

        static void Listen()
        {
            var connection = new ConnectionBuilder()
                .WithLogging()
                .Build();

            connection.On<string, string>("when", directory =>
            {
                var response = App.GetDateModified(directory);
                Logger.Log(response);
                return response;
            });

            connection.On<string, string>("json", directory =>
            {
                var all = App.LoadAssemblies(directory);
                Logger.Log("returning json");
                return all.ToJson(false);
            });

            connection.Listen();
        }

        const string outputDirectory = @"output.new";

        static void FileWrite(string filename, string content) => File.WriteAllText(Path.Combine(outputDirectory, filename), content);

        static void WriteJsonToFiles(All all)
        {
            var allNames = new AllNames(all);

            Directory.CreateDirectory(outputDirectory);

            FileWrite("All.yaml", all.ToYaml(null));
            FileWrite("Assemblies.yaml", all.Assemblies.ToYaml(allNames));
            FileWrite("Methods.yaml", all.AssemblyMethods.ToYaml(allNames));
            FileWrite("Compiler.yaml", all.CompilerMethods.ToYaml(allNames));
            FileWrite("Microsoft.yaml", all.MicrosoftAssemblies.ToYaml(allNames));

            FileWrite("All.json", all.ToJson(true));
            FileWrite("FoundCalls.json", all.AssemblyMethods.ToJson(true));

            FileWrite("All2.json", all.ToJson(false));
            FileWrite("FoundCalls2.json", all.AssemblyMethods.ToJson(false));
        }

        static void SelfTest()
        {
            var all = App.LoadAssemblies(Directory.GetCurrentDirectory());

            // e.g. C:\Dev\apis\src.dotnet\Core\bin\Release\net8.0
            var exeDirectory = AppContext.BaseDirectory;

            var exeTestDirectory = exeDirectory.Replace(@"\Core\", @"\Core.Test\");

            all = App.LoadAssemblies(exeTestDirectory);

            var modeltextDirectory = @"C:\Users\Christopher\Source\Repos\modeltext\ModelTextHtml\ModelEditControl\bin\Debug";
            all = App.LoadAssemblies(modeltextDirectory);
        }

        static void SelfLoad() => TestLoad(AppContext.BaseDirectory);

        static void TestLoad(string directory)
        {
            // e.g. C:\Dev\apis\src.dotnet\Core\bin\Release\net8.0
            var exeDirectory = AppContext.BaseDirectory;
            var all = App.LoadAssemblies(directory);
            WriteJsonToFiles(all);
        }
    }
}
