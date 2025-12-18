using System;

namespace Core.Test
{
    internal class AnonymousExample
    {
        public void MakePerson()
        {
            var person = new { Name = "Alice", Age = 30 };
            Console.WriteLine(person.Name);
        }
    }
}
