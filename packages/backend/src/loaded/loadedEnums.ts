export const enum Access {
  Public = 1,
  ProtectedInternal = 2,
  Protected = 3,
  Internal = 4,
  PrivateProtected = 5,
  Private = 6,
}

export const enum TypeKind {
  None,
  GenericParameter,
  Array,
  Pointer,
  ByReference,
}
