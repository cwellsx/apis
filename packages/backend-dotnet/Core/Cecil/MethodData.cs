using Mono.Cecil;
using Mono.Cecil.Cil;
using System.Collections.Generic;
using Core.Cecil.Private;

namespace Core.Cecil
{
    internal class MethodData
    {
        private MethodDefinition _methodDefinition;
        internal MethodDefinition MethodDefinition => _methodDefinition;

        internal MetadataToken MetadataToken => _methodDefinition.MetadataToken;
        internal TypeDefinition DeclaringType => _methodDefinition.DeclaringType;
        internal string FullName => _methodDefinition.FullName;
        internal string Name => _methodDefinition.Name;

        private List<MethodReference> _called { get; } = [];
        private List<MethodReference> _argued { get; } = [];
        private List<MethodReference> _newobj { get; } = [];

        internal IEnumerable<MethodReference> Called => _called;
        internal IEnumerable<MethodReference> Argued => _argued;
        internal IEnumerable<MethodReference> NewObj => _newobj;
        internal List<VariableReference> Locals { get; } = [];
        
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
