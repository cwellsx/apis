using Core.Output.Public;
using ElectronCgi.DotNet;
using System;
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
                var result = AssemblyLoader.LoadAssemblies(directory);
                Logger.Log("returning json");
                return result.ToJson(false);
            });

            connection.Listen();
        }

        static void WriteJsonToFiles(All all)
        {
            File.WriteAllText("Core.json", all.Assemblies.ToJson(true));
            File.WriteAllText("Found.json", all.AssemblyMethods.ToJson(true));
            File.WriteAllText("All.json", all.ToJson(true));
            File.WriteAllText("All2.json", all.ToJson(false));
        }

        static void SelfTest()
        {
            var directory = Directory.GetCurrentDirectory();
            var result = AssemblyLoader.LoadAssemblies(directory);
            var allMethodDetails = result.AssemblyMethods.Values.SelectMany(dictionary => dictionary.Values);
            var allCallDetails = allMethodDetails.SelectMany(methodDetails => methodDetails.Calls);
            var allErrors = allCallDetails.Where(callDetails => callDetails.Error != null).ToArray();
            if (allErrors.Length > 1)
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

            if (directory == "--selftest" || true)
            {
                SelfTest();
                Logger.Log("SelfTest OK");
                return;
            }

            directory = @"C:\Users\Christopher\Source\Repos\apis\src.dotnet\Core\bin\Debug\net5.0";
            directory = @"C:\Users\Christopher\Source\Repos\apis\src.dotnet\Core.Test\bin\Debug\net5.0";

            var result = AssemblyLoader.LoadAssemblies(directory);
            WriteJsonToFiles(result);
        }
    }
}
