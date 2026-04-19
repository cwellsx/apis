To make this faster

- Change AllNamesFetched to visit every node and ID without serializing to YAML
  i.e. implement a new visitor which invokes INames like YamlTypeConverter does
- Make the Decompiler optional -- try decompiling the whole assembly instead of each method
