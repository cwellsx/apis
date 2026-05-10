global using static Core.Assertions;
using System.Diagnostics.CodeAnalysis;

namespace Core
{
    internal static class Assertions
    {
        internal static void Assert([DoesNotReturnIf(false)] bool condition, string message)
        {
            if (!condition)
            {
                throw new System.Exception(message);
            }
        }

        internal static void Assert([DoesNotReturnIf(false)] bool condition)
        {
            if (!condition)
            {
                throw new System.Exception();
            }
        }
    }
}
