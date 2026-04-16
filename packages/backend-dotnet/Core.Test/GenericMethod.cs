using System;

namespace Core.Test
{
    public class GenericMethod
    {
        class Foo<T>
        {
            internal class Bar
            {
                internal void Show<U>(T t, U u)
                {
                    Console.WriteLine($"T: {t}, U: {u}");
                }
            }
        }

        public static void Test()
        {
            var bar = new Foo<int>.Bar();
            bar.Show(42, "Hello");
        }
    }
}
