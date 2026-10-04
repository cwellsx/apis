export type Boolean = 0 | 1;

export const toBoolean = (b: Boolean): boolean => b == 1;
export const fromBoolean = (b: boolean): Boolean => (b ? 1 : 0);
