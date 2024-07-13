using Core.Output.Public;
using ElectronCgi.DotNet;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace Core
{
    class Program
    {
        static void Main(string[] args)
        {
            if (args.Length > 0)
            {
                try
                {
                    HandleArgs(args);
                }
                catch (Exception e)
                {
                    Console.WriteLine(e.ToString());
                }
            }
            else
            {
                Logger.Log("Core starting");
                Listen();
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

            var coreTestDirectory =
#if DEBUG
            @"C:\Users\Christopher\Source\Repos\apis\src.dotnet\Core.Test\bin\Debug\net5.0";
#else
            @"C:\Users\Christopher\Source\Repos\apis\src.dotnet\Core.Test\bin\Debug\net5.0";
#endif
            allErrors = GetAllErrors(coreTestDirectory);
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

        static void HandleArgs(string[] args)
        {
            if (args.Length != 1)
            {
                throw new Exception("Expect no arguments in production or one argument for debugging as a standalone program");
            }
            var directory = args[0];

            if (directory == "--selftest"
                //|| true
                )
            {
                SelfTest();
                Logger.Log("SelfTest OK");
                return;
            }

            directory = @"C:\Users\Christopher\Source\Repos\apis\src.dotnet\Core\bin\Debug\net5.0";
            // directory = @"C:\Users\Christopher\Source\Repos\apis\src.dotnet\Core.Test\bin\Debug\net5.0";

            var (all, assemblyMethodDetails) = AssemblyLoader.LoadAssemblies(directory);
            WriteJsonToFiles(all, assemblyMethodDetails);
        }
    }
}
