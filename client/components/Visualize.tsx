import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Button,
  ButtonGroup,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  Spacer,
  Text,
  useDisclosure,
  VStack
} from "@chakra-ui/react";
import * as React from "react";
import { RiArrowLeftLine, RiEditLine, RiSaveLine } from "react-icons/ri";
import { NavLink, useSearchParams } from "react-router-dom";
import { useDebounce } from "../modules/hooks";
import { useSummarizeHistory } from "../modules/queries";
import { GlobalStateContext } from "../modules/state";
import { GraphHistoryType } from "../modules/types";
import { Code } from "./Code";
import { Empty } from "./Empty";
import { Mermaid } from "./Mermaid";

const cleanQueryParams = (queryParams: URLSearchParams): URLSearchParams => {
  const newQueryParams = new URLSearchParams();
  const sessionQueryParam = queryParams.get("session");
  if (sessionQueryParam) {
    newQueryParams.set("session", sessionQueryParam);
  }
  return newQueryParams;
};

const Header = ({
  onSave,
  onEdit
}: {
  onSave: () => void;
  onEdit: () => void;
}) => {
  const [searchParams] = useSearchParams();
  return (
    <HStack justify="space-between">
      <Heading size="md">Diagram of calls</Heading>
      <Spacer />
      <ButtonGroup>
        <NavLink
          to={{
            pathname: "/pages/history",
            search: cleanQueryParams(searchParams).toString()
          }}
        >
          <Button
            variant="pagination"
            bgColor="white"
            leftIcon={<Icon as={RiArrowLeftLine} />}
          >
            Back to History
          </Button>
        </NavLink>
        <Button
          variant="pagination"
          bgColor="white"
          leftIcon={<Icon as={RiSaveLine} />}
          onClick={onSave}
        >
          Save SVG
        </Button>
        <Button
          leftIcon={<Icon as={RiEditLine} boxSize="18px" />}
          colorScheme="blue"
          onClick={onEdit}
        >
          Edit
        </Button>
      </ButtonGroup>
    </HStack>
  );
};

const EditGraph = ({
  isOpen,
  value,
  onChange,
  onClose
}: {
  isOpen: boolean;
  value: string;
  onChange: (value: string) => unknown;
  onClose: () => unknown;
}) => {
  return (
    <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="xl">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>Edit Mermaid Graph</DrawerHeader>
        <DrawerBody>
          <Code
            language="txt"
            defaultValue={value}
            onChange={onChange}
            collapsible={false}
          />
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};

export const Visualize = () => {
  React.useEffect(() => {
    document.title = "Visualize | Smocker";
  });
  const { selectedSessionID } = React.useContext(GlobalStateContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [src, setSrc] = React.useState(searchParams.get("source-header") || "");
  const [dest, setDest] = React.useState(
    searchParams.get("destination-header") || ""
  );
  const { data, isFetching, refetch } = useSummarizeHistory(
    selectedSessionID || "",
    src,
    dest
  );
  const [diagram, setDiagram] = React.useState("");
  const [svg, setSVG] = React.useState("");
  const debouncedDiagram = useDebounce(diagram, 1000);
  const { isOpen, onOpen, onClose } = useDisclosure();

  React.useEffect(() => {
    setDiagram(computeGraph(data || []));
  }, [data]);

  const handleChangeSrc = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParams({
      ...Object.fromEntries(searchParams),
      "source-header": event.target.value
    });
    setSrc(event.target.value);
  };
  const handleChangeDest = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParams({
      ...Object.fromEntries(searchParams),
      "destination-header": event.target.value
    });
    setDest(event.target.value);
  };
  const handleChangeGraph = (diag: string) => setDiagram(diag);
  const handleChangeSVG = (content: string) => {
    setSVG(content);
  };

  const onSaveSVG = () => {
    const image = "data:image/svg+xml," + escape(svg);
    const link = document.createElement("a");
    link.download = "sequence.svg";
    link.href = image;
    return link.click();
  };

  const emptyDiagram = !debouncedDiagram.replace("sequenceDiagram", "").trim();
  return (
    <VStack flex="1" padding="2em 7% 0" alignItems="stretch">
      <Header onEdit={onOpen} onSave={onSaveSVG} />
      <Text>This is a graphical representation of call history.</Text>
      <Accordion allowToggle mb="4 !important">
        <AccordionItem border="none">
          <AccordionButton>
            <AccordionIcon />
            <Text fontSize="sm" as="b" flex="1" textAlign="left" ml="1">
              Customize diagram generation
            </Text>
          </AccordionButton>
          <AccordionPanel>
            <HStack>
              <FormControl>
                <FormLabel>Source Header</FormLabel>
                <Input
                  bgColor="white"
                  borderRadius="2px"
                  value={src}
                  onChange={handleChangeSrc}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Destination Header</FormLabel>
                <Input
                  bgColor="white"
                  borderRadius="2px"
                  value={dest}
                  onChange={handleChangeDest}
                />
              </FormControl>
              <FormControl>
                <FormLabel>&nbsp;</FormLabel>
                <Button colorScheme="blue" onClick={() => refetch()}>
                  Regenerate
                </Button>
              </FormControl>
            </HStack>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
      <VStack flex="1">
        {!emptyDiagram && !isFetching && (
          <Mermaid
            name="diagram"
            chart={debouncedDiagram}
            onChange={handleChangeSVG}
          />
        )}
        {emptyDiagram && (
          <Empty
            description="The history of calls is empty."
            loading={isFetching}
          />
        )}
      </VStack>
      <EditGraph
        isOpen={isOpen}
        value={diagram}
        onClose={onClose}
        onChange={handleChangeGraph}
      />
    </VStack>
  );
};

const computeGraph = (graph: GraphHistoryType): string => {
  const endpoints: Record<string, string> = {};
  graph.forEach(entry => {
    if (!endpoints[entry.from]) {
      endpoints[entry.from] = `P${Object.keys(endpoints).length}`;
    }
    if (!endpoints[entry.to]) {
      endpoints[entry.to] = `P${Object.keys(endpoints).length}`;
    }
  });

  const indent = "    ";
  let res = "sequenceDiagram\n\n";
  Object.entries(endpoints).forEach(([endpoint, alias]) => {
    res += indent + `participant ${alias} as ${endpoint}\n`;
  });
  res += "\n";
  graph.forEach(entry => {
    let arrow = "-->>";
    if (entry.type === "request") {
      arrow = "->>+";
    } else if (entry.type === "response") {
      arrow = "-->>-";
    }
    if (entry.from === "Client") {
      res += "\n";
    }
    res +=
      indent +
      `${endpoints[entry.from]}${arrow}${endpoints[entry.to]}: ${
        entry.message
      }\n`;
  });
  return res;
};
