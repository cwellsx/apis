using ElectronCgi.DotNet;
using System;

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
                var assemblyReader = AssemblyLoader.LoadAssemblies(args[0]);
                assemblyReader.WriteJsonToFiles();
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
                var assemblyReader = AssemblyLoader.LoadAssemblies(directory);
                Logger.Log("returning json");
                return assemblyReader.ToJson(false);
            });

            connection.Listen();
        }
    }
}
