import * as React from "react";
import type { AreaClass, GraphViewType, Area as MyArea, OnGraphClick } from "../shared-types";
import { Area, AreaMouseEvent, ImageMapper, Map } from "./3rd-party/ImageMapper"; // copied from "react-image-mapper2"
import "./Graph.css";
import { log } from "./log";

type GraphProps = {
  imagePath: string;
  areas: MyArea[];
  now: number; // https://stackoverflow.com/questions/47922687/force-react-to-reload-an-image-file
  zoomPercent: number;
  onGraphClick: OnGraphClick;
  useKeyStates: boolean;
  viewType: GraphViewType;
};

type State = {
  src: string;
  map: Map;
  size?: {
    // natural size
    imgWidth: number;
    imgHeight: number;
    // current zoomed size
    width: number;
    height: number;
  };
  zoomPercent: number;
};

interface ActionNewImage {
  type: "NewImage";
  props: GraphProps;
}

interface ActionImageLoaded {
  type: "ImageLoaded";
  naturalWidth: number;
  naturalHeight: number;
}

interface ActionMouseWheel {
  type: "ZoomPercent";
  zoomPercent: number;
}

type Action = ActionNewImage | ActionImageLoaded | ActionMouseWheel;

const srcFromProps = (props: GraphProps): string => (props.imagePath ? `${props.imagePath}?${props.now}` : "");

const initialState = (props: GraphProps): State => {
  return {
    src: srcFromProps(props),
    map: {
      name: "foo",
      // convert from MyArea (defined in "../shared-types") to Area (defined in "./ImageMapper")
      areas: props.areas.map((area) => {
        return {
          shape: area.shape,
          coords: area.coords,
          _id: area.id,
          strokeColor: getIdColor(area.id),
          className: area.className,
          tooltip: area.tooltip,
        };
      }),
    },
    // size undefined until ActionImageLoaded
    // zoomPercent unchanged from previous image
    zoomPercent: props.zoomPercent,
  };
};

const size = (imgWidth: number, imgHeight: number, zoomPercent: number) => {
  return {
    imgWidth,
    imgHeight,
    width: (imgWidth * zoomPercent) / 100,
    height: (imgHeight * zoomPercent) / 100,
  };
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "NewImage":
      return initialState(action.props);
    case "ImageLoaded":
      return {
        ...state,
        size: size(action.naturalWidth, action.naturalHeight, state.zoomPercent),
      };
    case "ZoomPercent":
      if (!state.size) return { ...state };
      return {
        ...state,
        zoomPercent: action.zoomPercent,
        size: size(state.size.imgWidth, state.size.imgHeight, action.zoomPercent),
      };
  }
};

const getIdColor = (id: string): "red" | "green" => (getIdType(id) === "leaf" ? "green" : "red");

const getIdType = (id: string): "leaf" | "group" | "edge" =>
  id[0] === "!" ? "group" : id.includes("|") ? "edge" : "leaf";

export const Graph: React.FunctionComponent<GraphProps> = (props: GraphProps) => {
  const [state, dispatch] = React.useReducer(reducer, initialState(props));
  const [className, setClassName] = React.useState<string | undefined>(undefined);

  const { src, map, size, zoomPercent } = state;

  React.useEffect(() => {
    if (src !== srcFromProps(props)) dispatch({ type: "NewImage", props });
    else if (zoomPercent !== props.zoomPercent) dispatch({ type: "ZoomPercent", zoomPercent: props.zoomPercent });
  }, [props, src, zoomPercent]);

  if (!src) return <>Loading...</>;

  const keyboardEvent: (event: KeyboardEvent) => void = (event) => {
    const shiftKey: boolean = event.shiftKey && props.useKeyStates;
    const ctrlKey: boolean = event.ctrlKey && props.useKeyStates;
    const newClassName: string | undefined = shiftKey
      ? ctrlKey
        ? "shiftKey ctrlKey"
        : "shiftKey"
      : ctrlKey
      ? "ctrlKey"
      : undefined;
    setClassName(newClassName);
    log(`setClassName(${newClassName})`);
  };
  document.addEventListener("keydown", keyboardEvent);
  document.addEventListener("keyup", keyboardEvent);

  // if we don't yet know the size of the image then display the naked image first
  if (!size) {
    const onLoad = (arg: React.SyntheticEvent<HTMLImageElement>) => {
      const { currentTarget } = arg;
      dispatch({
        type: "ImageLoaded",
        naturalWidth: currentTarget.naturalWidth,
        naturalHeight: currentTarget.naturalHeight,
      });
    };
    return <img onLoad={onLoad} src={src} />;
  }

  const { imgWidth, width, height } = size;

  const onClick = (area: Area, index: number, event: AreaMouseEvent): void => {
    console.log(`Clicked area ${area._id} ${area.className}`);
    if (area._id)
      props.onGraphClick({
        id: area._id,
        className: area.className as AreaClass,
        viewType: props.viewType,
        event: {
          altKey: event.altKey,
          button: event.button,
          buttons: event.buttons,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
        },
      });
  };

  return (
    <>
      <ImageMapper
        src={src}
        map={map}
        strokeColor="red"
        lineWidth={1}
        active={true}
        onClick={onClick}
        imgWidth={imgWidth}
        width={width}
        height={height}
        className={className}
      />
      <span className="zoom">{`${zoomPercent}%`}</span>
    </>
  );
};
