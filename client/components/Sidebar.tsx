import {
  Box,
  Button,
  CircularProgress,
  Flex,
  Heading,
  HStack,
  Icon,
  Input,
  Link,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Portal,
  Spacer,
  Text,
  Tooltip,
  useDisclosure,
  VStack
} from "@chakra-ui/react";
import React, { useContext } from "react";
import {
  RiAddFill,
  RiDeleteBinLine,
  RiEditLine,
  RiMenuFoldFill,
  RiMenuUnfoldFill,
  RiSortAsc,
  RiSortDesc
} from "react-icons/ri";
import {
  useAddSession,
  useResetSessions,
  useSessions,
  useUpdateSession
} from "../modules/queries";
import { GlobalStateContext } from "../modules/state";
import { SessionsType, SessionType } from "../modules/types";
import { FileUploader } from "./Uploader";

const BurgerIcon = () => {
  const { isSidebarOpen, toggleSidebar } = React.useContext(GlobalStateContext);
  return (
    <VStack
      position="fixed"
      top="46"
      left={isSidebarOpen ? "199px" : "0px"}
      width="36px"
      height="42px"
      bg="white"
      paddingTop=".5rem"
      align="center"
      justify="center"
      borderRadius="0 0 2px 0"
      borderBottom="1px solid"
      borderBottomColor="sidebar.border"
      borderRight="1px solid"
      borderRightColor="sidebar.border"
      transition="all .2s"
    >
      <Link
        onClick={() => toggleSidebar()}
        title={isSidebarOpen ? "Hide Sessions" : "Show Sessions"}
      >
        <Icon
          as={isSidebarOpen ? RiMenuFoldFill : RiMenuUnfoldFill}
          boxSize="20px"
        />
      </Link>
    </VStack>
  );
};

const Header = ({ loading }: { loading: boolean }) => {
  const addSessionsMutation = useAddSession();
  const { isSessionsAscSorted, toggleSessionsSort } = useContext(
    GlobalStateContext
  );
  return (
    <Flex
      padding="20px 16px"
      borderBottom="1px dashed"
      borderBottomColor="sidebar.border"
      align="center"
      height="42px"
      overflow="hidden"
    >
      <HStack>
        <Tooltip hasArrow label="Add Session">
          <Link
            color="primary"
            _hover={{ color: "hover.primary" }}
            onClick={() => addSessionsMutation.mutate()}
          >
            <Icon as={RiAddFill} boxSize="5" mb="-.25em" />
          </Link>
        </Tooltip>
        <FileUploader />
      </HStack>
      <Heading pl="2" size="sm" color="sidebar.header">
        Sessions
      </Heading>
      <Spacer />
      <Tooltip hasArrow label="Sort Sessions">
        <Link
          color="primary"
          _hover={{ color: "hover.primary" }}
          onClick={() => toggleSessionsSort()}
        >
          {loading ? (
            <CircularProgress size="18px" isIndeterminate color="primary" />
          ) : (
            <Icon
              as={isSessionsAscSorted ? RiSortAsc : RiSortDesc}
              boxSize="5"
              mb="-.25em"
            />
          )}
        </Link>
      </Tooltip>
    </Flex>
  );
};

const Session = (props: { data: SessionType }) => {
  const { selectedSessionID, selectSession } = useContext(GlobalStateContext);
  const { data: session } = props;
  const isSelected = selectedSessionID === session.id;
  const [sessionName, setSessionName] = React.useState(session.name);
  const updateSessionsMutation = useUpdateSession();
  const { onOpen, onClose, isOpen } = useDisclosure();
  const ref = React.useRef<HTMLInputElement>(null);

  return (
    <Link
      data-group
      _hover={{ bg: "#e6f7ff" }}
      onClick={() => selectSession(session.id)}
    >
      <Flex
        direction="row"
        fontWeight="500"
        padding="10px 16px"
        bg={isSelected ? "#e6f7ff" : undefined}
        borderRight={isSelected ? "3px solid" : "none"}
        borderRightColor={isSelected ? "primary" : "#e6f7ff"}
        transition="border-color .3s,background .3s,padding .1s cubic-bezier(.215,.61,.355,1)"
      >
        <Text noOfLines={1} title={session.name}>
          {session.name}
        </Text>
        <Spacer />
        {isSelected && (
          <Popover
            isLazy
            isOpen={isOpen}
            initialFocusRef={ref}
            onOpen={onOpen}
            onClose={onClose}
            placement="right"
          >
            <PopoverTrigger>
              <Box _hover={{ color: "hover.primary" }}>
                <Icon as={RiEditLine} boxSize="4" mb="-.25em" />
              </Box>
            </PopoverTrigger>
            <Portal>
              <PopoverContent bg="white">
                <PopoverArrow bg="white" />
                <PopoverCloseButton />
                <PopoverHeader>Rename session</PopoverHeader>
                <PopoverBody>
                  <HStack>
                    <Input
                      ref={ref}
                      value={sessionName}
                      onChange={e => setSessionName(e.target.value)}
                    />
                    <Button
                      isDisabled={!sessionName}
                      colorScheme="blue"
                      onClick={() => {
                        updateSessionsMutation.mutate({
                          ...session,
                          name: sessionName
                        });
                        onClose();
                      }}
                    >
                      Save
                    </Button>
                  </HStack>
                </PopoverBody>
              </PopoverContent>
            </Portal>
          </Popover>
        )}
      </Flex>
    </Link>
  );
};

const Sessions = ({ data }: { data?: SessionsType }) => {
  const { isSessionsAscSorted } = useContext(GlobalStateContext);
  data = data?.sort((a, b) => {
    const aDate = new Date(a.date).getTime();
    const bDate = new Date(b.date).getTime();
    return isSessionsAscSorted ? aDate - bDate : bDate - aDate;
  });
  return (
    <VStack
      align="stretch"
      overflowX="hidden"
      overflowY="auto"
      minHeight="0"
      spacing={0}
      flex={1}
      fontSize="13px"
    >
      {data?.map(session => (
        <Session key={session.id} data={session} />
      ))}
    </VStack>
  );
};

const Footer = () => {
  const resetSessionsMutation = useResetSessions();
  return (
    <Flex
      direction="column"
      align="center"
      borderTop="1px dashed"
      borderTopColor="sidebar.border"
      overflowX="hidden"
    >
      <Button
        leftIcon={<Icon as={RiDeleteBinLine} boxSize="18px" />}
        colorScheme="red"
        variant="outline"
        onClick={() => resetSessionsMutation.mutate()}
        margin={3}
      >
        Reset Sessions
      </Button>
    </Flex>
  );
};

export const Sidebar = () => {
  const { data, isFetching } = useSessions();
  const ref = React.useRef<HTMLDivElement>(null);
  return (
    <VStack
      bg="white"
      borderRight="1px solid"
      borderRightColor="sidebar.border"
      minHeight="0"
      justify="flex-start"
      align="stretch"
      spacing={0}
      ref={ref}
      flex={1}
    >
      <Header loading={isFetching} />
      <Sessions data={data} />
      <Footer />
      <Portal containerRef={ref}>
        <BurgerIcon />
      </Portal>
    </VStack>
  );
};
