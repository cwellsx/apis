using Core.Output.Public;
using ElectronCgi.DotNet;
using System;
using System.IO;

namespace Core
{
    class Program
    {
        static void Main(string[] args)
        {
            if (args.Length > 0)
            {
                if (args.Length != 1)
                {
                    throw new Exception("Expect no arguments in production or one argument for debugging as a standalone program");
                }
                try
                {
                    var result = AssemblyLoader.LoadAssemblies(args[0]);
                    WriteJsonToFiles(result);
                }
                catch (Exception e)
                {
                    Console.WriteLine(e.ToString());
                }
                return;
            }

            Logger.Log("Core starting");

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
    }
}
