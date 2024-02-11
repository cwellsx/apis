import * as React from "react";
import { log } from "./log";
import { getScrollbarWidth } from "./scrollbarWidth";

/*
  This is a hook for use with the split-pane-react package and its SplitPane element.

  Requirements:

  - Replace i.e. encapsulate this statement: `const [sizes, setSizes] = useState([100, '30%', 'auto']);`
  - Minimize `useEffect`: https://react.dev/learn/you-might-not-need-an-effect
  - Resize to fit content when new content is inserted

  Implementation:

  - Uses ResizeObserver so that the application needn't say when the size changes
  - ResizeObserver is supported on Electron
  
  If you want a more robust or general-purpose solution consider using
  e.g. https://www.npmjs.com/package/@react-hook/resize-observer
  which supports polyfilling and other use-cases also.

  CAUTION: inputs must be memo-ized by the caller.
*/

type DefaultSize = string | number;
type Ref = React.RefObject<HTMLElement>;
type Pair = [DefaultSize, Ref];
export type Input = DefaultSize | Pair;

function isPair(input: Input): input is Pair {
  return Array.isArray(input);
}

type DefaultSizes = DefaultSize[];
type SetActualSizes = (newSizes: number[]) => void;

const scrollbarWidth = getScrollbarWidth();
const getWidth = (element: Element, padding: number): number => {
  const clientWidth = element.clientWidth;
  if (!clientWidth) return 0;
  const parentElement = element.parentElement;
  const hasScrollbar = parentElement && parentElement.scrollHeight > parentElement.clientHeight;
  return clientWidth + (hasScrollbar ? scrollbarWidth : 0) + padding;
};

export const usePaneSizes = (inputs: Input[], padding: number): [DefaultSizes, SetActualSizes] => {
  // extract and memoize the input
  const defaultSizes = React.useMemo(() => inputs.map((input) => (isPair(input) ? input[0] : input)), [inputs]);
  const refs = React.useMemo(() => inputs.map((input) => (isPair(input) ? input[1] : undefined)), [inputs]);
  const [sizes, setSizes] = React.useState<(string | number)[]>(defaultSizes);

  // this is so that useLayoutEffect can use sizes
  // without being reinvoked each time the sizes changes
  // becuase now it can depend on refSizes instead of on sizes
  const refSizes = React.useRef(sizes);

  const wrapSetSize = (sizes: DefaultSizes, who: string): void => {
    // log whether setSize is called internally and/or from the onChange event of the SplitPane component
    setSizes(sizes);
    refSizes.current = sizes;
  };

  React.useLayoutEffect(() => {
    log(`usePaneSizes useLayoutEffect`); // don't want this called often!
    let unmount = false;

    const mappedElements = new Map<Element, number>();

    refs.forEach((ref, index) => {
      if (!ref) return;
      const element = ref.current;
      if (!element) {
        log("!ref.current"); // don't expect this
        return;
      }
      mappedElements.set(element, index);
    });

    const onResized = (entries: ResizeObserverEntry[]): void => {
      if (unmount) return;

      const mappedSizes = new Map<Element, number>();
      for (const entry of entries) {
        const element = entry.target;
        // ignore the new size reported in the entry,
        // instead calculate depending on whether there's a scrollbar
        const newSize = getWidth(element, padding);
        mappedSizes.set(element, newSize);
      }

      const newSizes = [...defaultSizes];
      mappedElements.forEach((index, element) => {
        let newSize: DefaultSize | undefined = mappedSizes.get(element);
        if (newSize === undefined) newSize = refSizes.current[index];
        newSizes[index] = newSize;
      });

      wrapSetSize(newSizes, "onResized");
    };

    const resizeObserver = new ResizeObserver(onResized);
    const elements = [...mappedElements.keys()];
    elements.forEach((element) => resizeObserver.observe(element));

    return () => {
      unmount = true;
      elements.forEach((element) => resizeObserver.unobserve(element));
      resizeObserver.disconnect();
    };
  }, [defaultSizes, refs, padding]);

  const setNumericSizes: SetActualSizes = (newSizes: number[]) => wrapSetSize(newSizes, "setNumericSizes");
  return [sizes, setNumericSizes];
};
