using ICSharpCode.Decompiler;
using ICSharpCode.Decompiler.CSharp;
using ICSharpCode.Decompiler.DebugInfo;
using ICSharpCode.Decompiler.IL;
using ICSharpCode.Decompiler.Metadata;
using ICSharpCode.Decompiler.TypeSystem;
using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Reflection.Metadata;
using System.Reflection.Metadata.Ecma335;
using System.Reflection.PortableExecutable;

/*
 * This class is implemented using and encapsulates the ICSharpCode.Decompiler package.
 * Its purpose is to return the list of methods which are called from each method.
 * It's in its own distinct namespace to ensure it's self-contained.
 * It may throw exceptions.
 */

namespace Core.IL
{
    public class Decompiler
    {
        // names of these fields match the names of members of the CSharpDecompiler class
        DecompilerSettings settings;
        DecompilerTypeSystem typeSystem;
        CSharpDecompiler cSharpDecompiler;

        MetadataModule module => typeSystem.MainModule;
        MetadataReader metadata => module.PEFile.Metadata;
        IDebugInfoProvider? DebugInfoProvider => null;

        public Decompiler(string fileName)
        {
            // This constructs a CSharpDecompiler.
            // Instead of using the simplest overload of the CSharpDecompiler constructor,
            // this copies code from the LoadPEFile and CreateTypeSystemFromFile methods of CSharpDecompiler
            // in order to create module and metadata instances, which can be used in the Decompile methods
            // and which would otherwise be private (inaccessible) members of the CSharpDecompiler instance.
            settings = new DecompilerSettings();
            settings.LoadInMemory = true;
            var file = new PEFile(
                fileName,
                new FileStream(fileName, FileMode.Open, FileAccess.Read),
                streamOptions: PEStreamOptions.PrefetchEntireImage,
                metadataOptions: settings.ApplyWindowsRuntimeProjections ? MetadataReaderOptions.ApplyWindowsRuntimeProjections : MetadataReaderOptions.None
                );
            var resolver = new UniversalAssemblyResolver(fileName, settings.ThrowOnAssemblyResolveErrors,
                file.DetectTargetFrameworkId(), file.DetectRuntimePack(),
                settings.LoadInMemory ? PEStreamOptions.PrefetchMetadata : PEStreamOptions.Default,
                settings.ApplyWindowsRuntimeProjections ? MetadataReaderOptions.ApplyWindowsRuntimeProjections : MetadataReaderOptions.None);

            typeSystem = new DecompilerTypeSystem(file, resolver, settings);

            cSharpDecompiler = new CSharpDecompiler(typeSystem, settings);
        }

        public string DecompileTypeAsString(Type type)
        {
            var reflectionName = type.FullName;
            if (reflectionName == null)
            {
                throw new ArgumentNullException("type.FullName is null");
            }
            var fullTypeName = new FullTypeName(reflectionName);
            return cSharpDecompiler.DecompileTypeAsString(fullTypeName);
        }

        public (string, Output.Method[]) Decompile(MethodBase methodBase) => Decompile(methodBase.MetadataToken);

        public (string, Output.Method[]) Decompile(int metadataToken)
        {
            EntityHandle entityHandle = MetadataTokens.EntityHandle(metadataToken);
            var asString = cSharpDecompiler.DecompileAsString(entityHandle);
            // the SyntaxTree discards important information i.e. the Fullname of invoked methods
            Assert(entityHandle.Kind == HandleKind.MethodDefinition, "Expect HandleKind.MethodDefinition");
            var methodDefinitionHandle = (MethodDefinitionHandle)entityHandle;
            IMethod method = module.GetDefinition(methodDefinitionHandle);
            Assert(method.MetadataToken == entityHandle, "Expect MetadataToken equality");
            if (!method.HasBody)
            {
                return (asString, Array.Empty<Output.Method>());
            }

            var context = new SimpleTypeResolveContext(method);
            // emulate DecompileBody
            var ilReader = new ILReader(module)
            {
                UseDebugSymbols = settings.UseDebugSymbols,
                DebugInfo = DebugInfoProvider
            };
            var methodDef = metadata.GetMethodDefinition((MethodDefinitionHandle)method.MetadataToken);
            MethodBodyBlock methodBody = module.PEFile.Reader.GetMethodBody(methodDef.RelativeVirtualAddress);
            var function = ilReader.ReadIL((MethodDefinitionHandle)method.MetadataToken, methodBody);
            if (function == null)
            {
                throw new ArgumentNullException("function");
            }
            ILInstruction body = function.Body;
            var visitor = new Visitor();
            body.AcceptVisitor(visitor);
            return (asString, visitor.CalledMethods.Transform());
        }

        void Assert(bool b, string message)
        {
            if (!b)
            {
                throw new Exception(message);
            }
        }

        class Visitor : ILVisitor
        {
            internal List<IMethod> CalledMethods { get; } = new List<IMethod>();

            void Found(CallInstruction inst) => CalledMethods.Add(inst.Method);

            protected override void Default(ILInstruction inst)
            {
                foreach (var child in inst.Children)
                {
                    child.AcceptVisitor(this);
                }
            }
            protected override void VisitCall(Call inst)
            {
                Found(inst);
                base.VisitCall(inst);
            }
            protected override void VisitNewObj(NewObj inst)
            {
                Found(inst);
                base.VisitNewObj(inst);
            }
            protected override void VisitCallVirt(CallVirt inst)
            {
                Found(inst);
                base.VisitCallVirt(inst);
            }
        }
    }
}
