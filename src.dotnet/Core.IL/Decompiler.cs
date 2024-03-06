using ICSharpCode.Decompiler;
using ICSharpCode.Decompiler.CSharp;
using ICSharpCode.Decompiler.DebugInfo;
using ICSharpCode.Decompiler.IL;
using ICSharpCode.Decompiler.Metadata;
using ICSharpCode.Decompiler.TypeSystem;
using ICSharpCode.Decompiler.TypeSystem.Implementation;
using Core.IL.Output;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
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
    // This defines the output/return types, to insulate the caller from ICSharpCode types such as IType and IMethod
    namespace Output
    {
        public record Method(
            string Name,
            (string, TypeId)[]? Parameters,
            TypeId[]? GenericArguments,
            TypeId ReturnType,
            bool IsStatic,
            bool IsConstructor,
            TypeId DeclaringType,
            string[]? Attributes,
            Accessibility Accessibility
            );

        public record TypeId(
            string? AssemblyName,
            string? Namespace,
            string Name,
            TypeId[]? GenericTypeArguments,
            TypeId? DeclaringType
            );

        public enum Accessibility
        {
            None = ICSharpCode.Decompiler.TypeSystem.Accessibility.None,
            Private = ICSharpCode.Decompiler.TypeSystem.Accessibility.Private,
            ProtectedAndInternal = ICSharpCode.Decompiler.TypeSystem.Accessibility.ProtectedAndInternal,
            Protected = ICSharpCode.Decompiler.TypeSystem.Accessibility.Protected,
            Internal = ICSharpCode.Decompiler.TypeSystem.Accessibility.Internal,
            ProtectedOrInternal = ICSharpCode.Decompiler.TypeSystem.Accessibility.ProtectedOrInternal,
            Public = ICSharpCode.Decompiler.TypeSystem.Accessibility.Public,
        }

        internal static class Extensions
        {
            internal static Method[] Transform(this IEnumerable<IMethod> methods)
            {
                return methods.Select(Transform).ToArray();
            }

            static Method Transform(IMethod method)
            {
                //if (method.Name == "FindPaths")
                //{
                //    Console.WriteLine("found");
                //}
                return new Method(
                    method.Name,
                    method.Parameters.Select(parameter => (parameter.Name, parameter.Type.Transform())).ToArrayOrNull(),
                    method.TypeArguments.Select(Transform).ToArrayOrNull(),
                    method.ReturnType.Transform(),
                    method.IsStatic,
                    method.IsConstructor,
                    method.DeclaringType.Transform(),
                    GetAttributes(method.GetAttributes()),
                    (Accessibility)method.Accessibility
                   );
            }

            static TypeId Transform(this IType type)
            {
                //if (type.Name == "KeyValuePair[]")
                //{
                //    Console.WriteLine("found");
                //}
                type = (type as TupleType)?.UnderlyingType ?? type;
                var elementType = (type as TypeWithElementType)?.ElementType ?? type;
                var nameSuffix = (type as TypeWithElementType)?.NameSuffix ?? string.Empty;
                var assemblyName = elementType.GetDefinition()?.ParentModule?.AssemblyName;
                // want a name like "KeyValuePair`2[]" (i.e. with generic arity appended) and not just "KeyValuePair[]"
                var name = elementType.GetDefinition()?.MetadataName ?? type.Name;
                // we have the name of the element not the type, so add the suffix
                name += nameSuffix;

                return new TypeId(
                    assemblyName,
                    type.Namespace == string.Empty ? null : type.Namespace,
                    name,
                    type.TypeArguments.Select(Transform).ToArrayOrNull(),
                    type.DeclaringType?.Transform()
                   );
            }

            static T[]? ToArrayOrNull<T>(this IEnumerable<T> enumerable)
            {
                var array = enumerable.ToArray();
                return array.Length > 0 ? array : null;
            }

            static string[]? GetAttributes(IEnumerable<IAttribute> attributes)
            {
                return (!attributes.Any()) ? null : attributes.Select(attribute =>
                {
                    var name = attribute.AttributeType.FullName;
                    var constructorArguments = attribute.FixedArguments.Select(arg => arg.ToString());
                    var namedArguments = attribute.NamedArguments.Select(arg => arg.ToString());
                    var args = constructorArguments.Concat(namedArguments).ToArray();
                    return (args.Length != 0) ? $"[{name}({string.Join(", ", args)})]" : $"[{name}]";
                }).ToArray();
            }
        }
    }

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

        public (string, Output.Method[]) Decompile(MethodBase methodBase)
        {
            var metadataToken = methodBase.MetadataToken;
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
