using System;

namespace Core.Test
{
    internal class DisplayClassExample
    {
        public void Run()
        {
            int captured = 42;
            Action a = () => Console.WriteLine(captured);
            a();
        }
    }
}
