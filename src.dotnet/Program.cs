﻿using ElectronCgi.DotNet;
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
                var (assemblyReader, methodReader) = AssemblyLoader.LoadAssemblies(args[0], prettyPrint: true);
                File.WriteAllText("Core.json", assemblyReader.ToJson(true));
                File.WriteAllText("Methods.json", methodReader.ToJson(true));
                methodReader.Verify(assemblyReader.Assemblies);
                methodReader.InterConnect();
                return;
            }

            Console.Error.WriteLine("Core starting");

            var connection = new ConnectionBuilder()
                .WithLogging()
                .Build();

            connection.On<string, string>("when", directory =>
            {
                var response = AssemblyLoader.GetDateModified(directory);
                Console.Error.WriteLine(response);
                return response;
            });

            connection.On<string, string>("json", directory =>
            {
                var (assemblyReader, methodReader) = AssemblyLoader.LoadAssemblies(directory, false);
                Console.Error.WriteLine("returning json");
                return assemblyReader.ToJson(false);
            });

            connection.Listen();
        }
    }
}
