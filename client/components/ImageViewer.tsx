import { Box, Icon, IconButton, VStack } from "@chakra-ui/react";
import { padEnd } from "lodash";
import * as React from "react";
import { RiAddLine, RiRestartLine, RiSubtractLine } from "react-icons/ri";

interface DragData {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

const preventDefault = (e: any) => {
  e = e || window.event;
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.returnValue = false;
};

const ZoomDragPanel = ({
  drag,
  onDrag,
  zoom,
  setZoom,
  children
}: {
  drag: DragData;
  onDrag: (drag: DragData) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  style?: unknown;
  children?: React.ReactNode;
}) => {
  const [mouseDown, setMouseDown] = React.useState(false);

  const panStart = (
    pageX: number,
    pageY: number,
    event: React.MouseEvent<EventTarget> | React.TouchEvent<EventTarget>
  ) => {
    onDrag({
      dx: drag.dx,
      dy: drag.dy,
      x: pageX,
      y: pageY
    });
    setMouseDown(true);
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    event.preventDefault();
  };

  const panEnd = () => {
    setMouseDown(false);
    onDrag(drag);
  };

  const updateMousePosition = (pageX: number, pageY: number) => {
    if (!mouseDown) return;

    const newDrag = {
      x: pageX,
      y: pageY,
      dx: drag.dx - (drag.x - pageX),
      dy: drag.dy - (drag.y - pageY)
    };
    onDrag(newDrag);
  };

  const onTouchStart = (e: React.TouchEvent<EventTarget>) => {
    panStart(e.touches[0].pageX, e.touches[0].pageY, e);
  };
  const onMouseDown = (e: React.MouseEvent<EventTarget>) => {
    panStart(e.pageX, e.pageY, e);
  };

  const onTouchEnd = () => {
    padEnd();
  };
  const onMouseUp = () => {
    panEnd();
  };

  const onTouchMove = (e: React.TouchEvent<EventTarget>) => {
    updateMousePosition(e.touches[0].pageX, e.touches[0].pageY);
  };
  const onMouseMove = (e: React.MouseEvent<EventTarget>) => {
    updateMousePosition(e.pageX, e.pageY);
  };

  const onWheel = (e: React.WheelEvent<EventTarget>) => {
    Math.sign(e.deltaY) < 0
      ? setZoom(zoom + 0.1)
      : zoom > 0.2 && setZoom(zoom - 0.1);
  };

  const onMouseEnter = () => {
    window.addEventListener("wheel", preventDefault, {
      passive: false
    });
  };

  const onMouseLeave = () => {
    window.removeEventListener("wheel", preventDefault, false);
    if (mouseDown) {
      panEnd();
    }
  };

  return (
    <div
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseMove={onMouseMove}
      onWheel={onWheel}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        userSelect: "none"
      }}
    >
      <div
        style={{
          cursor: mouseDown ? "move" : "",
          transform: `matrix(${zoom},0,0,${zoom},${drag.dx},${drag.dy})`
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const ImageViewer = ({ image, alt }: { image: string; alt: string }) => {
  const imageRef = React.useRef<HTMLImageElement>(null);
  const [drag, setDrag] = React.useState<DragData>({
    x: 0,
    y: 0,
    dx: 0,
    dy: 0
  });
  const [zoom, setZoom] = React.useState(1);

  const resetAll = () => {
    setDrag({
      x: 0,
      y: 0,
      dx: 0,
      dy: 0
    });
    setZoom(1);
  };
  const zoomIn = () => {
    setZoom(zoom + 0.1);
  };

  const zoomOut = () => {
    if (zoom > 0.2) {
      setZoom(zoom - 0.1);
    }
  };

  return (
    <Box>
      <VStack
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 2,
          userSelect: "none"
        }}
      >
        <IconButton
          variant="outline"
          colorScheme="blue"
          aria-label="Zoom in"
          title="Zoom in"
          bgColor="white"
          onClick={zoomIn}
          icon={<Icon as={RiAddLine} />}
        />
        <IconButton
          variant="outline"
          colorScheme="blue"
          aria-label="Zoom out"
          title="Zoom out"
          bgColor="white"
          onClick={zoomOut}
          icon={<Icon as={RiSubtractLine} />}
        />
        <IconButton
          variant="outline"
          colorScheme="blue"
          aria-label="Reset All"
          title="Reset All"
          bgColor="white"
          onClick={resetAll}
          icon={<Icon as={RiRestartLine} />}
        />
      </VStack>
      <ZoomDragPanel
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1
        }}
        zoom={zoom}
        setZoom={setZoom}
        drag={drag}
        onDrag={setDrag}
      >
        <img
          ref={imageRef}
          style={{
            width: "100%"
          }}
          src={image}
          alt={alt}
        />
      </ZoomDragPanel>
    </Box>
  );
};
