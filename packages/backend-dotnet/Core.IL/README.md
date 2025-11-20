This classes in this namespace encapsulate the `CSharpDecompiler` and catches any exceptions it may generate.

---

I also tried using a more light-weight library instead -- i.e. `jl0pd.Reflection` -- however:

- This depends on a method named `Module.ResolveMethod`
- The subclass of `Module` which we instantiate is `System.Reflection.TypeLoading.RoModule`
- Its `ResolveMethod` throws:

  > Resolving tokens is not supported on assemblies loaded by a MetadataLoadContext

See also [Support resolving metadata tokens in MetadataLoadContext](https://github.com/dotnet/runtime/issues/87657)

--

An answer to
[Is there a way to decompile a single function/method call?](https://github.com/icsharpcode/ILSpy/discussions/2226)
says,

> class AstBuilder was replaced by class CSharpDecompiler in ILSpy 3.0.
>
> You can decompile a single method using CSharpDecompiler.Decompile(), passing in the MethodDefinitionHandle.
> The "C# with IL" view works by decompiling the whole method, generating sequence points (debug information) for the decompiled code; and then using those sequence points to map the generated statements back to the IL instructions.
> https://github.com/icsharpcode/ILSpy/blob/master/ILSpy/Languages/CSharpILMixedLanguage.cs

and,

> Use MetadataTokens.EntityHandle to convert a metadata token into a handle.
>
>     var handle = (MethodDefinitionHandle)MetadataTokens.EntityHandle(cecilMethod.MetadataToken.ToInt32())
>
> See [this wiki page](https://github.com/icsharpcode/ILSpy/wiki/srm) for more information on the switch from Cecil to System.Reflection.Metadata.

MetadataToken is a property of the base MemberInfo type.

---

There's also  information on the [srm (System.Reflection.Metadata)](https://github.com/icsharpcode/ILSpy/wiki/srm) wiki page.

Here are exerpts:

> Note: there are different options to configure the type system.
> The ILSpy UI is using it essentially in "single-assembly-mode", so it can't resolve across assembly boundaries.
> You can create a full type system via new DecompilerTypeSystem(...).
>
> Use typeSystem.MainModule.GetDefinition() to get the ITypeDefinition for a TypeDefinitionHandle.
> Then you can use the GetAllBaseTypeDefinitions() extension method to walk the list of basetypes.

> We do not load method bodies into the type system, because it is metadata-only.
> Method bodies are stored in a different part of the binary.
> However, it is very easy to get to the MethodBodyBlock from IMethod:
>
> ```c#
> public MethodBodyBlock GetMethodBody(IMethod method)
> {
>   if (!method.HasBody || method.MetadataToken.IsNil)
>     return null;
>   var module = method.ParentModule.PEFile;
>   var md = module.Metadata.GetMethodDefinition((MethodDefinitionHandle)method.MetadataToken);
>   return module.Reader.GetMethodBody(md.RelativeVirtualAddress);
> }
> ```
>
> Note that there is no object model for instructions.
> You will have to do the byte parsing yourself.
> However there are some extension / helper methods in
> [ICSharpCode.Decompiler.Disassembler.ILParser](https://github.com/icsharpcode/ILSpy/blob/master/ICSharpCode.Decompiler/Disassembler/ILParser.cs).

> After getting the SRM MethodBodyBlock (like described above), you can get access to the IL byte stream via MethodBodyBlock.GetILReader()
>(there are GetILBytes() and GetILContent() as well, but it is a better idea to use GetILReader(), because it returns a BlobReader and avoids copying the bytes into a managed byte array.)
> The aforementioned ILParser defines extension methods on BlobReader.

> UniversalAssemblyResolver:  
> LoadMainModule removed: the IAssemblyResolver instance now needs to be constructed independently from the CSharpDecompiler.
> The IAssemblyResolver should be passed to the CSharpDecompiler constructor.

---

It may also be possible to use the https://www.nuget.org/packages/System.Reflection.Metadata API directly.

However the API e.g. the properties of the
[MetadataReader Class](https://learn.microsoft.com/en-us/dotnet/api/system.reflection.metadata.metadatareader?view=net-8.0)
seem undocumented.

There is source code for it here:

- https://github.com/dotnet/runtime/blob/main/src/libraries/System.Reflection.Metadata/src/PACKAGE.md