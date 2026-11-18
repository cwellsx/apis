import * as Dotnet from "../contracts-dotnet";

// properties except name and metadataToken of "members" types are stored as JSON
export type WithoutNameAndMetadataToken<T> = Omit<T, "name" | "metadataToken">;
export type AnyDotnetMembers = Dotnet.FieldMember | Dotnet.EventMember | Dotnet.PropertyMember | Dotnet.MethodMember;
export type MembersJson = WithoutNameAndMetadataToken<AnyDotnetMembers>;
