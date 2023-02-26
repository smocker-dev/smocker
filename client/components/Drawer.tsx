import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  ListItem,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  UnorderedList,
  VStack
} from "@chakra-ui/react";
import yaml, { YAMLException } from "js-yaml";
import React from "react";
import { useAddMocks } from "../modules/queries";
import {
  MocksCodec,
  MocksType,
  MockType,
  processError
} from "../modules/types";
import { Code } from "./Code";
import MockEditor from "./mock_editor/Editor";

export const MocksDrawer = ({
  isOpen,
  onClose,
  initMock
}: {
  isOpen: boolean;
  onClose: () => void;
  initMock: MockType;
}) => {
  const useAddMocksMutation = useAddMocks();
  const [mocks, setMocks] = React.useState<MocksType>([initMock]);
  const [errors, setErrors] = React.useState<string[]>([]);

  React.useEffect(() => {
    setMocks([initMock]);
    setErrors([]);
  }, [initMock]);

  React.useEffect(() => {
    onClose();
  }, [useAddMocksMutation.isSuccess]);

  const onClick = () => {
    useAddMocksMutation.mutate(mocks);
  };
  const onStringChange = (mocksString: string) => {
    try {
      const tmp = yaml.load(mocksString);
      const res = MocksCodec.safeParse(tmp);
      if (!res.success) {
        setErrors(processError(res.error));
      } else {
        setMocks(res.data);
        setErrors([]);
      }
    } catch (e) {
      setErrors([`Invalid YAML: ${(e as YAMLException).message}`]);
    }
  };

  const alerts = errors.length ? (
    <Alert status="error">
      <AlertIcon boxSize="2em" />
      <Box>
        <AlertTitle>Invalid Mocks</AlertTitle>
        <AlertDescription>
          <UnorderedList>
            {errors.map((e, index) => (
              <ListItem key={`error-${index}`}>{e}</ListItem>
            ))}
          </UnorderedList>
        </AlertDescription>
      </Box>
    </Alert>
  ) : null;

  return (
    <Drawer onClose={onClose} isOpen={isOpen}>
      <DrawerOverlay />
      <DrawerContent maxWidth="70%">
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px" borderColor="border">
          Add new mocks
        </DrawerHeader>
        <DrawerBody>
          <Tabs
            variant="line"
            colorScheme="blue"
            mt="1em"
            isLazy
            lazyBehavior="unmount"
            onChange={() => setErrors([])}
          >
            <TabList>
              <Tab>Visual Editor</Tab>
              <Tab>Raw YAML Editor</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <MockEditor initMock={mocks[0]} onChange={m => setMocks([m])} />
              </TabPanel>
              <TabPanel>
                <VStack alignItems="stretch" justifyContent="space-between">
                  <Code
                    defaultValue={yaml.dump(mocks, { skipInvalid: true })}
                    language="yaml"
                    collapsible={false}
                    onChange={v => onStringChange(v)}
                  />
                  {alerts}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </DrawerBody>
        <DrawerFooter borderTopWidth="1px">
          {Boolean(useAddMocksMutation.error) && (
            <Alert status="error" flex="1" mr="1em">
              <AlertIcon />
              {useAddMocksMutation.error?.message}
            </Alert>
          )}
          <Button variant="outline" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={onClick}
            isDisabled={Boolean(errors.length)}
          >
            Save
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
