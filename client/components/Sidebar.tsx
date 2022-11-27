import {
  Box,
  Button,
  CircularProgress,
  Flex,
  Heading,
  HStack,
  Icon,
  Link,
  Portal,
  Spacer,
  Text,
  Tooltip,
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
  useSessions
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
      borderBottom="1px solid sidebar.border"
      borderRight="1px solid sidebar.border"
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

  return (
    <Link
      data-group
      _hover={{ bg: "#e6f7ff" }}
      onClick={() => selectSession(session.id)}
    >
      <Flex
        direction="row"
        align="stretch"
        fontWeight="500"
        padding="10px 16px"
        bg={isSelected ? "#e6f7ff" : undefined}
      >
        <Text noOfLines={1}>{session.name}</Text>
        <Spacer />
        <Tooltip hasArrow label="Edit Session">
          <Box _hover={{ color: "hover.primary" }}>
            <Icon as={RiEditLine} boxSize="5" mb="-.25em" />
          </Box>
        </Tooltip>
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
    <Flex direction="column" align="center" padding={2}>
      <Button
        leftIcon={<Icon as={RiDeleteBinLine} />}
        colorScheme="red"
        variant="outline"
        onClick={() => resetSessionsMutation.mutate()}
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
