import { MainApi } from "../ui";

// utility type to convert all void methods to Promise<void>
type PromiseifyVoidMethods<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => void ? (...args: A) => Promise<void> : never;
};

// this Api is implemented in the backend
// it's the same as MainApi but all methods return Promise<void> instead of void
// SQLite method as quick and synchronous,
// but rendering the Graph in graphViz.ts is slow and asynchronous
export type MainApiAsync = PromiseifyVoidMethods<MainApi> & {
  // MainApiAsync is implemented and returned by createAppWindow which contains a DisplayApi
  // so this method can be used by the caller if any methods throw an error
  showException: (error: unknown) => void;
};
