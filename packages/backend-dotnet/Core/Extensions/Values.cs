using System;
using System.Linq;

namespace Core.Extensions
{
    // this JSON serializes like an array but implements value-equality semantics
    public class Values<T> where T : notnull
    {
        public T[]? Array { get; }

        public static implicit operator Values<T>(T[]? array) => new Values<T>(array);

        internal Values(T[]? array)
        {
            if (array?.Length == 0)
            {
                array = null;
            }
            Array = array;
        }

        internal int Length => Array?.Length ?? 0;
        internal T this[int i] => Array![i];

        public override int GetHashCode()
        {
            // https://stackoverflow.com/questions/263400/what-is-the-best-algorithm-for-overriding-gethashcode
            int hash = 17;
            if (Array != null)
            {
                foreach (T item in Array)
                {
                    hash = hash * 23 + item.GetHashCode();
                }
            }
            return hash;
        }

        public override string ToString() => Array != null ? $"[{string.Join(", ", Array)}]" : "null";

        public bool Equals(Values<T>? other)
        {
            if (other is null)
                return false;

            if (this.Array == null || other.Array == null)
                return this.Array == null && other.Array == null;

            return Array.SequenceEqual(other.Array);
        }

        public override bool Equals(object? obj) => Equals(obj as Values<T>);

        public static bool operator ==(Values<T>? left, Values<T>? right)
        {
            if (ReferenceEquals(left, right)) return true;
            if (!(left is null))
            {
                return left.Equals(right);
            }
            if (!(right is null))
            {
                return right.Equals(left);
            }
            return true; // both null
        }

        public static bool operator !=(Values<T>? left, Values<T>? right) => !(left == right);
    }
}
