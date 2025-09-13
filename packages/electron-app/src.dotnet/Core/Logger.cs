using System;

namespace Core
{
    static class Logger
    {
        // write to stderr not stdout because ElectronCgi.DotNet uses stdout for its I/O
        internal static void Log(string message) => Console.Error.WriteLine(message);
        internal static void Log(Exception ex) => Console.Error.WriteLine(ex.ToString());
    }
}
