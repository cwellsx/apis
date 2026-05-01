import * as DotNet from "../../contracts/dotnet2";

// properties except name and metadataToken of "members" types are stored as JSON
export type WithoutNameAndMetadataToken<T> = Omit<T, "name" | "metadataToken">;
export type AnyDotNetMembers = DotNet.FieldMember | DotNet.EventMember | DotNet.PropertyMember | DotNet.MethodMember;
export type MembersJson = WithoutNameAndMetadataToken<AnyDotNetMembers>;
