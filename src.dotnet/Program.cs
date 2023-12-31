using ElectronCgi.DotNet;
using System;

namespace Core
{
    class Program
    {
        static void Main(string[] args)
        {
            if (args.Length>0)
            {
                if (args.Length!=1)
                {
                    throw new Exception("Expect no arguments in production or one argument for debugging as a standalone program");
                }
                var result = AssemblyLoader.LoadAssemblies(args[0]);
                return;
            }

            Console.Error.WriteLine("Core starting");
             
            var connection = new ConnectionBuilder()
                .WithLogging()
                .Build();

            connection.On<string, string>("greeting", name => {
                var response = "Hello " + name;
                Console.Error.WriteLine(response);
                return response;
            });

            connection.On<string, string>("when", directory => {
                var response = AssemblyLoader.GetDateModified(directory);
                Console.Error.WriteLine(response);
                return response;
            });

            connection.On<string, string>("json", directory => {
                var response = AssemblyLoader.LoadAssemblies(directory);
                Console.Error.WriteLine("returning json");
                return response;
            });

            connection.Listen();
        }
    }
}
