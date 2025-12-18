using System.Threading.Tasks;

namespace Core.Test
{
    internal class AsyncExample
    {
        public async Task<int> ComputeAsync(int x)
        {
            await Task.Delay(10);
            return x * 2;
        }
    }
}
