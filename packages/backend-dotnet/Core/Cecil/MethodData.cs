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
        internal string FullName => _methodDefinition.FullName;
        internal string Name => _methodDefinition.Name;

        internal bool IsCompilerOrLocalFunction => _methodDefinition.DeclaringType.IsCompilerGenerated()
            || _methodDefinition.IsLocalFunction()
            ;

        internal bool IsLambdaOrLocalFunction => _methodDefinition.DeclaringType.IsLambdaCache()
            || _methodDefinition.IsLocalFunction()
            ;

        internal bool IsLocalFunction => _methodDefinition.IsLocalFunction();

        private List<MethodReference> _called { get; } = [];
        private List<MethodReference> _argued { get; } = [];
        private List<MethodReference> _newobj { get; } = [];

        internal IEnumerable<MethodReference> Called => _called;
        internal IEnumerable<MethodReference> Argued => _argued;
        internal List<VariableReference> Locals { get; } = [];
        
        private readonly List<TypeDefinition> _ownStateMachineTypes = []; // method has AsyncStateMachineAttribute or IteratorStateMachineAttribute
        private readonly List<TypeDefinition> _ownCompilerTypes = []; // method uses Newobj to construct a compiler-generated type
        internal IEnumerable<TypeDefinition> OwnCompilerTypes => _ownStateMachineTypes.Concat(_ownCompilerTypes).Distinct();

        private List<MethodDefinition> _ownLambdaMethods { get; } = [];
        internal IEnumerable<MethodDefinition> OwnLamdaMethods => _ownLambdaMethods.Distinct();

        private List<MethodDefinition> _ownLocalFunctions { get; } = [];
        internal IEnumerable<MethodDefinition> OwnLocalFunctions => _ownLocalFunctions.Distinct();

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
            foreach (var methodReference in Argued.Concat(Called))
            {
                if (methodReference.DeclaringType.Module.Assembly != _methodDefinition.Module.Assembly)
                {
                    // compiler-generated typed are necessarily in the same assembly
                    continue;
                }

                var resolvedMethod = methodReference.Resolve();

                if (resolvedMethod.DeclaringType.IsLambdaCache())
                {
                    _ownLambdaMethods.Add(resolvedMethod);
                }
                if (resolvedMethod.IsLocalFunction())
                {
                    _ownLocalFunctions.Add(resolvedMethod);
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
                if (resolvedType.IsSignificantCompilerGenerated())
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
            bool found = false;
            foreach (var customAttribute in _methodDefinition.CustomAttributes)
            {
                switch (customAttribute.AttributeType.FullName)
                {
                    case "System.Runtime.CompilerServices.AsyncStateMachineAttribute": // method returns async Task
                    case "System.Runtime.CompilerServices.IteratorStateMachineAttribute": // method returns IEnumerable
                        break;
                    default:
                        continue;
                }

                Assert(!found); // assert each method is one or the other
                found = true;

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
                _ownStateMachineTypes.Add(resolvedType);
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
                            Add(_called, target);
                            break;
                        }

                    case Code.Newobj:
                        {
                            var target = (MethodReference)instr.Operand;
                            Add(_called, target);
                            Add(_newobj, target);
                            break;
                        }

                    case Code.Ldftn:
                    case Code.Ldvirtftn: // similar, but for virtual methods
                        {
                            var target = (MethodReference)instr.Operand;
                            Add(_argued, target);
                            break;
                        }

                    case Code.Calli: // this is rarely used, e.g. a pointer to a native function -- its operand is a CallSite
                    default:
                        continue;
                }
            }
        }

        private static void Add(List<MethodReference> list, MethodReference methodReference)
        {
            // synthetic => no method definition => can't resolve
            if (!methodReference.IsSynthetic())
            {
                list.Add(methodReference);
            }
        }

        public override string ToString() => _methodDefinition.ToString();
    }
}
