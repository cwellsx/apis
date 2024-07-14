using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace Core.Test
{
    class AsyncDelegate
    {
		static void Significant()
        {
			Console.WriteLine("Hello world");
		}
		public Task StartAsync(CancellationToken cancellationToken)
		{
#pragma warning disable CS1998 // Async method lacks 'await' operators and will run synchronously
            return Task.Run(async delegate
#pragma warning restore CS1998 // Async method lacks 'await' operators and will run synchronously
            {
				try
				{
					Significant();
				}
				catch (OperationCanceledException)
				{
				}
			});
		}
	}
}
