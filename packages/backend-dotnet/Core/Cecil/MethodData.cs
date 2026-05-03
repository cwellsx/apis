using Mono.Cecil;
using Mono.Cecil.Cil;
using System;
using System.Collections.Generic;
using System.Linq;
using Core.Output.Ids;
using Core.Id.Methods;

namespace Core.Cecil
{
    internal class MethodData
    {
        private MethodDefinition _methodDefinition;

        internal MetadataToken MetadataToken => _methodDefinition.MetadataToken;
        internal LocalMethodId LocalMethodId => new LocalMethodId(FullName, new LocalMethod(MetadataToken.ToInt32()));
        internal TypeDefinition DeclaringType => _methodDefinition.DeclaringType;
        internal bool IsCompilerGenerated() => DeclaringType.IsCompilerGenerated();
        internal string FullName => _methodDefinition.FullName;
        internal string Name => _methodDefinition.Name;

        internal List<MethodReference> _called { get; } = [];
        internal List<MethodReference> _argued { get; } = [];
        internal IEnumerable<MethodReference> Called => _called;
        internal IEnumerable<MethodReference> Argued => _argued;
        internal List<VariableReference> Locals { get; } = [];

        private List<MethodReference> _newobj { get; } = [];

        // method has AsyncStateMachineAttribute or IteratorStateMachineAttribute
        private readonly List<TypeDefinition> _stateMachineTypes = [];
        // method uses Newobj to construct a compiler-generated type
        private readonly List<TypeDefinition> _ownCompilerTypes = [];
        internal IEnumerable<TypeDefinition> CompilerGeneratedTypes =>
            _stateMachineTypes
            .Concat(_ownCompilerTypes)
            .Where(typeDefinition => typeDefinition.IsSignificantCompilerGenerated())
            .Distinct();

        // probably don't need Distinct() -- probably the delegate is constructed once even if it's called multiple times
        private List<MethodDefinition> _ownCompilerMethods { get; } = [];
        internal IEnumerable<MethodDefinition> CompilerGeneratedMethods =>
            _ownCompilerMethods
            .Where(methodDefinition => methodDefinition.DeclaringType.IsSignificantCompilerGenerated())
            .Distinct();

        internal bool IsLambdaCacheStaticCtor => _methodDefinition.IsLambdaCacheStaticCtor();
        internal bool IsInsignificantCompilerGenerated => _methodDefinition.IsInsignificantCompilerGenerated();

        internal MethodData(MethodDefinition methodDefinition)
        {
            _methodDefinition = methodDefinition;

            if (methodDefinition.HasBody)
            {
                ParseMethodBody();

                if (methodDefinition.Body.HasVariables)
                {
                    Locals.AddRange(methodDefinition.Body.Variables);
                }
            }

            ParseCompilerTypes();
        }

        private void ParseCompilerTypes()
        {
            ParseLdftn();
            ParseNewobj();
            ParseAttributes();
        }

        private void ParseLdftn()
        {
            foreach (var methodReference in Argued)
            {
                if (methodReference.DeclaringType.Module.Assembly != _methodDefinition.Module.Assembly)
                {
                    // compiler-generated typed are necessarily in the same assembly
                    continue;
                }
                if (methodReference.DeclaringType.IsLambdaCache())
                {
                    var resolvedMethod = methodReference.Resolve();
                    if (resolvedMethod == null)
                    {
                        throw new Exception();
                    }
                    _ownCompilerMethods.Add(resolvedMethod);
                }
            }
        }

        private void ParseNewobj()
        {
            foreach (var methodReference in _newobj)
            {
                var declaringType = methodReference.DeclaringType;
                if (declaringType.Module.Assembly != _methodDefinition.Module.Assembly)
                {
                    // compiler-generated typed are necessarily in the same assembly
                    continue;
                }
                var resolvedType = declaringType.Resolve();
                if (resolvedType.IsCompilerGenerated())
                {
                    if (resolvedType.IsLambdaCache() && !IsLambdaCacheStaticCtor)
                    {
                        throw new Exception();
                    }
                    _ownCompilerTypes.Add(resolvedType);
                }
            }
        }

        private void ParseAttributes()
        {
            foreach (var customAttribute in _methodDefinition.CustomAttributes)
            {
                switch (customAttribute.AttributeType.FullName)
                {
                    case "System.Runtime.CompilerServices.AsyncStateMachineAttribute":
                    case "System.Runtime.CompilerServices.IteratorStateMachineAttribute":
                        break;
                    default:
                        continue;
                }

                if (customAttribute.ConstructorArguments.Count != 1)
                {
                    throw new Exception();
                }
                var argument = customAttribute.ConstructorArguments[0];
                if (argument.Type.FullName != "System.Type")
                {
                    throw new Exception();
                }
                var typeReference = argument.Value as TypeReference;
                if (typeReference == null)
                {
                    throw new Exception();
                }
                var resolvedType = typeReference.Resolve();
                if (resolvedType == null)
                {
                    throw new Exception();
                }
                _stateMachineTypes.Add(resolvedType);
            }
        }

        private void ParseMethodBody()
        {
            foreach (var instr in _methodDefinition.Body.Instructions)
            {
                switch (instr.OpCode.Code)
                {
                    case Code.Call:
                    case Code.Callvirt:
                    case Code.Jmp: // this too is rare but its operand is a MethodReference
                        {
                            var target = (MethodReference)instr.Operand;
                            _called.Add(target);
                            break;
                        }

                    case Code.Newobj:
                        {
                            var target = (MethodReference)instr.Operand;
                            _called.Add(target);
                            _newobj.Add(target);
                            break;
                        }

                    case Code.Ldftn:
                    case Code.Ldvirtftn: // similar, but for virtual methods
                        {
                            var target = (MethodReference)instr.Operand;
                            _argued.Add(target);
                            break;
                        }

                    case Code.Calli: // this is rarely used, e.g. a pointer to a native function -- its operand is a CallSite
                    default:
                        continue;
                }
            }
        }
    }
}
