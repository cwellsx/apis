# Ids

## Output.Id

- Used in the Output records
- Contain the FullName from the Mono.Cecil TypeReference or MethodReference
- Also contain a ShortId which is an interface instance

## Short Ids

- Serialized into the output JSON instead of the FullName
- Output value is an integer, string, or array
- Interface <-> value mapping is implemented by a dictionary of Factory classes in the Name namespace

## Names

- Leaf records implement of ITypeId and IMethodId
- Factory classes map these to and from the "short Id" output values
- INames and AllName reconstruct a FullName from a short Id

## Full names

- Only the short Id is serialized, the full name is reconstructed by the host process

## Serializing in SpecificationFactory

- Could serialize to arrays containing ITypeId elements or flatten to scalar values
- Benefit of ITypeId is that serializer can also emit the full name as a comment
- Therefore serializer cannot assume that Array contains only scalar values
- OTOH SpecificationFactory.FromShortName should assume that input array is from serialized, fully-flattened scalars