import {
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs
} from "@chakra-ui/react";
import React from "react";
import { Code } from "./Code";

export const MocksDrawer = ({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const ref = React.useRef<any>(null);
  const onClick = () => {
    console.log(ref.current.getValue());
  };
  return (
    <Drawer onClose={onClose} isOpen={isOpen}>
      <DrawerOverlay />
      <DrawerContent maxWidth="70%">
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px" borderColor="border">
          Add new mocks
        </DrawerHeader>
        <DrawerBody>
          <Tabs variant="line" colorScheme="blue" mt="1em">
            <TabList>
              <Tab>Visual Editor</Tab>
              <Tab>Raw YAML Editor</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <p>one!</p>
              </TabPanel>
              <TabPanel>
                <Code ref={ref} language="yaml" collapsible={false} editable />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </DrawerBody>
        <DrawerFooter borderTopWidth="1px">
          <Button variant="outline" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={onClick}>
            Save
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
