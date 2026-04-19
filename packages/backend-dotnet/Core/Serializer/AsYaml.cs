using Core.FullNames;
using System;
using System.Linq;
using YamlDotNet.Serialization;

namespace Core.Serializer
{
    internal static class AsYaml
    {
        internal static string ToYaml<T>(this T value, INames? names, bool prettyPrint) where T : notnull
        {
            var defaultValuesHandling = DefaultValuesHandling.OmitNull;
            var serializer = new SerializerBuilder()
                .WithTypeConverter(new YamlTypeConverter(names, defaultValuesHandling))
                .ConfigureDefaultValuesHandling(defaultValuesHandling)
                .DisableAliases()
                .Build();

            string yaml = serializer.Serialize(
                YamlTypeConverter.WrapRoot(value)
                );

            if (!prettyPrint)
            {
                return yaml;
            }

            // postprocess the "special" comments to change this
            //
            // - - 33554469 # Core.Loader.ILoaded`1 # ;Core.Loader.ILoaded`1<U>
            //
            // to this
            //
            // - # Core.Loader.ILoaded`1<U>
            //   - 33554469 # Core.Loader.ILoaded`1

            var lines = yaml.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None).ToList();

            for (var i = 0; i < lines.Count; i++)
            {
                var line = lines[i];
                var index0 = line.IndexOf("- -");
                var index1 = line.IndexOf("# ;");
                if (index0 < 0 || index1 < 0)
                {
                    continue;
                }
                var line0 = new string(' ', index0) + "- # " + line.Substring(index1 + 3);
                var line1 = new string(' ', index0 + 2) + line.Substring(index0 + 2, index1 - index0 - 3);
                lines[i] = line0;
                lines.Insert(i + 1, line1);
            }

            yaml = string.Join("\r\n", lines);

            return yaml;
        }
    }
}
