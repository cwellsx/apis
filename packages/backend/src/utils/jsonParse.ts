export const jsonParse = <T>(text: string): T => {
  return JSON.parse(text) as T;
};
