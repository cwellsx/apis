// the metadata table ids (ECMA-335) and this project's own boxed ids, together with the test for
// them: these describe how ids are packed, so they are internal to id2 and not exported by index.ts

export const enum TableId {
  // TypeRef = 0x01,
  TypeDef = 0x02,
  Field = 0x04,
  MethodDef = 0x06,
  // MethodRef = 0x0a,
  Event = 0x14,
  Property = 0x17,
  TypeSpec = 0x1b,
  GenericParam = 0x2a,
  MethodSpec = 0x2b,
}

export const enum BoxedId {
  Assembly = 0x40,
  Namespace = 0x41,
  Group = 0x42,
}

export const isTableId = (id: number, tableId: TableId | BoxedId): boolean =>
  (id & 0xff000000) == (tableId as number) << 24;
