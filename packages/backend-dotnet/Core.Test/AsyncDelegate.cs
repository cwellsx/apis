using System;
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
            return Task.Run(async delegate
            {
				try
				{
					await Task.Delay(10);
					Significant();
				}
				catch (OperationCanceledException)
				{
				}
			});
		}
	}
}
