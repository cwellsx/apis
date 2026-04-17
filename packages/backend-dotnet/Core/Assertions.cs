global using static Core.Assertions;

namespace Core
{
    internal static class Assertions
    {
        internal static void Assert(bool condition, string message)
        {
            if (!condition)
            {
                throw new System.Exception(message);
            }
        }

        internal static void Assert(bool condition)
        {
            if (!condition)
            {
                throw new System.Exception();
            }
        }
    }
}
