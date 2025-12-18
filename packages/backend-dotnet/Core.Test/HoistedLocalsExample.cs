using System;

namespace Core.Test
{
    internal class HoistedLocalsExample
    {
        public void Run(object o)
        {
            if (o is int x)
            {
                Console.WriteLine(x);
            }
        }
    }
}
