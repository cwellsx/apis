# Serialization

## Output formats

There are two output formats: JSON and YAML.

### JSON
   
- machine-readable
- sent to the host process via stdout
- normalized to be optimum for storing in a database

### YAML

- human-readable
- full name of each element is embedded as a comment
- intended foe the developer inspecting the output

## Implementation

### TypeId

- Included in the Output namespace and the output data
- Defined as a struct so it has no subclasses
- Contains two elements -- Id and FullName.

### Id

- An integer or string
- In the output JSON whereever an Id is used

### FullName

- Created by Mono.Cecil types
- Copied into the TypeId
- Not output in the JSON
- Reconstructed from the Id

### NameFromId

- Host reconstructs FullName from the Id
- Algorithm is also implemented in C#
- C# tests the reconstructed FullName matches the original

### CoreJsonConverter

- Serializes only the Id value from any TypeId

