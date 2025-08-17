using Core.Output.Public;
using ElectronCgi.DotNet;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http.Headers;

namespace Core
{
    class Program
    {
        static void Main(string[] args)
        {
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
                var response = AssemblyLoader.GetDateModified(directory);
                Logger.Log(response);
                return response;
            });

            connection.On<string, string>("json", directory =>
            {
                var (all, assemblyMethodDetails) = AssemblyLoader.LoadAssemblies(directory);
                Logger.Log("returning json");
                return all.ToJson(false);
            });

            connection.Listen();
        }

        static void WriteJsonToFiles(All all, Dictionary<string, Dictionary<int, MethodDetails>> assemblyMethodDetails)
        {
            File.WriteAllText("Core.json", all.Assemblies.ToJson(true));
            File.WriteAllText("FoundCallDetails.json", assemblyMethodDetails.ToJson(true));
            File.WriteAllText("FoundCalls.json", all.AssemblyMethods.ToJson(true));

            File.WriteAllText("All2.json", all.ToJson(false));
            File.WriteAllText("FoundCallDetails2.json", assemblyMethodDetails.ToJson(false));
            File.WriteAllText("FoundCalls2.json", all.AssemblyMethods.ToJson(false));
        }

        static void SelfTest()
        {
            MethodCall[] GetAllErrors(string directory)
            {
                var (all, assemblyMethodDetails) = AssemblyLoader.LoadAssemblies(directory);
                var allMethodDetails = all.AssemblyMethods.Values.SelectMany(dictionary => dictionary.Values);
                var allCallDetails = allMethodDetails.SelectMany(methodDetails => methodDetails.Called ?? Array.Empty<MethodCall>());
                return allCallDetails.Where(callDetails => callDetails.Error != null).ToArray();
            }

            var allErrors = GetAllErrors(Directory.GetCurrentDirectory());
            if (allErrors.Length > 1)
            {
                throw new Exception("New errors found");
            }

            // e.g. C:\Dev\apis\src.dotnet\Core\bin\Release\net8.0
            var exeDirectory = AppContext.BaseDirectory;

            var exeTestDirectory = exeDirectory.Replace(@"\Core\", @"\Core.Test\");

            allErrors = GetAllErrors(exeTestDirectory);
            if (allErrors.Length > 0)
            {
                throw new Exception("New errors found");
            }

            var modeltextDirectory = @"C:\Users\Christopher\Source\Repos\modeltext\ModelTextHtml\ModelEditControl\bin\Debug";
            allErrors = GetAllErrors(modeltextDirectory);
            if (allErrors.Length > 0)
            {
                throw new Exception("New errors found");
            }
        }

        static void SelfLoad() => TestLoad(AppContext.BaseDirectory);

        static void TestLoad(string directory)
        {
            // e.g. C:\Dev\apis\src.dotnet\Core\bin\Release\net8.0
            var exeDirectory = AppContext.BaseDirectory;
            var (all, assemblyMethodDetails) = AssemblyLoader.LoadAssemblies(directory);
            WriteJsonToFiles(all, assemblyMethodDetails);
        }
    }
}
