using System.Collections.Generic;

using Mono.Cecil;
using Mono.Cecil.Cil;

namespace Core.Cecil
{
    internal class MethodData
    {
        private MethodDefinition MethodDefinition { get; }
        internal List<MethodReference> Called { get; } = [];
        internal List<MethodReference> Argued { get; } = [];

        internal MethodData(MethodDefinition methodDefinition)
        {
            MethodDefinition = methodDefinition;

            if (!methodDefinition.HasBody) return;

            foreach (var instr in methodDefinition.Body.Instructions)
            {
                switch (instr.OpCode.Code)
                {
                    case Code.Call:
                    case Code.Callvirt:
                    case Code.Newobj:
                    case Code.Jmp: // this too is rare but its operand is a MethodReference
                        {
                            var target = (MethodReference)instr.Operand;
                            //Console.WriteLine($"{methodDefinition.FullName} calls {target.FullName}");
                            Called.Add(target);
                            break;
                        }


                    case Code.Ldftn:
                    case Code.Ldvirtftn: // similar, but for virtual methods
                        {
                            var target = (MethodReference)instr.Operand;
                            Argued.Add(target);
                            break;
                        }

                    case Code.Calli: // this is rarely used, e.g. a pointer to a native function -- its operand is a CallSite
                    default:
                        continue;
                }
            }
        }

        internal MetadataToken MetadataToken => MethodDefinition.MetadataToken;
    }
}
