import {
  Alert,
  AlertDescription,
  AlertTitle,
  Box,
  Button,
  Editable,
  EditableInput,
  EditablePreview,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  Link,
  Portal,
  Spacer,
  Spinner,
  Text,
  Tooltip,
  useEditableControls,
  VStack
} from "@chakra-ui/react";
import React, { useContext } from "react";
import {
  RiAddFill,
  RiCheckFill,
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
import { sortByDate } from "../modules/utils";
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
      borderBottomColor="border"
      borderRight="1px solid"
      borderRightColor="border"
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
      borderBottomColor="border"
      align="center"
      height="42px"
      overflow="hidden"
    >
      <HStack>
        <Tooltip hasArrow label="Add Session">
          <Link colorScheme="blue" onClick={() => addSessionsMutation.mutate()}>
            <Icon as={RiAddFill} boxSize="5" mb="-.25em" />
          </Link>
        </Tooltip>
        <FileUploader />
      </HStack>
      <Heading pl="2" size="sm" color="gray.500">
        Sessions
      </Heading>
      <Spacer />
      <Tooltip hasArrow label="Sort Sessions">
        <Link colorScheme="blue" onClick={() => toggleSessionsSort()}>
          {loading ? (
            <Spinner boxSize="5" color="blue.400" />
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

const EditableControls = () => {
  const {
    isEditing,
    getSubmitButtonProps,
    getEditButtonProps
  } = useEditableControls();

  return isEditing ? (
    <IconButton
      ml={3}
      size="sm"
      aria-label="submit button"
      variant="outline"
      colorScheme="blue"
      icon={<Icon as={RiCheckFill} />}
      {...getSubmitButtonProps()}
    />
  ) : (
    <IconButton
      ml={3}
      size="sm"
      aria-label="submit button"
      variant="outline"
      colorScheme="blue"
      icon={<Icon as={RiEditLine} />}
      {...getEditButtonProps()}
    />
  );
};

const CustomEditableInput = ({
  value,
  onSubmit
}: {
  value: string;
  onSubmit?: (value: string) => void;
}) => {
  return (
    <Editable
      defaultValue={value}
      display="flex"
      flexDirection="row"
      flex="1"
      alignItems="center"
      justifyContent="space-between"
      isPreviewFocusable={false}
      onSubmit={onSubmit}
    >
      <EditablePreview
        noOfLines={1}
        title={value}
        pt={1.5}
        pb={1.5}
        wordBreak="break-all"
      />
      <EditableInput borderRadius={0} />
      <EditableControls />
    </Editable>
  );
};

const Session = (props: { data: SessionType }) => {
  const { selectedSessionID, selectSession } = useContext(GlobalStateContext);
  const { data: session } = props;
  const isSelected = selectedSessionID === session.id;
  const updateSessionsMutation = useUpdateSession();

  return (
    <Link
      data-group
      _hover={{ bg: "session.bg" }}
      onClick={() => selectSession(session.id)}
    >
      <Flex
        direction="row"
        fontWeight="500"
        padding="10px 16px"
        bg={isSelected ? "session.bg" : undefined}
        borderRight={isSelected ? "3px solid" : "none"}
        borderRightColor={isSelected ? "blue.400" : "session.bg"}
        transition="border-color .3s,background .3s,padding .1s cubic-bezier(.215,.61,.355,1)"
      >
        {isSelected ? (
          <CustomEditableInput
            value={session.name}
            onSubmit={name =>
              updateSessionsMutation.mutate({ ...session, name })
            }
          />
        ) : (
          <Text
            noOfLines={1}
            title={session.name}
            pt={1.5}
            pb={1.5}
            wordBreak="break-all"
          >
            {session.name}
          </Text>
        )}
      </Flex>
    </Link>
  );
};

const Sessions = ({ data }: { data?: SessionsType }) => {
  const { isSessionsAscSorted } = useContext(GlobalStateContext);
  data = data?.sort(sortByDate(isSessionsAscSorted));
  return (
    <VStack
      align="stretch"
      overflowX="hidden"
      overflowY="auto"
      minHeight="0"
      spacing={0}
      flex={1}
      fontSize="sm"
    >
      {data?.map(session => (
        <Session key={`session-${session.id}`} data={session} />
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
      borderTopColor="border"
      overflowX="hidden"
    >
      <Button
        leftIcon={<Icon as={RiDeleteBinLine} boxSize="18px" />}
        colorScheme="red"
        onClick={() => resetSessionsMutation.mutate()}
        margin={3}
      >
        Reset Sessions
      </Button>
    </Flex>
  );
};

const Sidebar = () => {
  const { data, isFetching, error } = useSessions();
  const { selectedSessionID, selectSession, isSessionsAscSorted } = useContext(
    GlobalStateContext
  );
  React.useEffect(() => {
    const elems = data || [];
    const containsSelectedSession =
      elems.filter(session => session.id === selectedSessionID).length > 0;
    if (!containsSelectedSession) {
      selectSession(
        elems.length > 0
          ? elems.sort(sortByDate(isSessionsAscSorted))[0].id
          : ""
      );
    }
  }, [data, selectedSessionID, isSessionsAscSorted]);
  const ref = React.useRef<HTMLDivElement>(null);
  return (
    <VStack
      bg="white"
      borderRight="1px solid"
      borderRightColor="border"
      minHeight="0"
      justify="flex-start"
      align="stretch"
      spacing={0}
      ref={ref}
      flex={1}
      overflowX="hidden"
    >
      <Header loading={isFetching} />
      {error ? (
        <>
          <Alert status="error">
            <Box>
              <AlertTitle fontSize="sm">Unable to retrieve sessions</AlertTitle>
              <AlertDescription fontSize="sm">
                {error?.message}
              </AlertDescription>
            </Box>
          </Alert>
          <Spacer />
        </>
      ) : (
        <Sessions data={data} />
      )}
      <Footer />
      <Portal containerRef={ref}>
        <BurgerIcon />
      </Portal>
    </VStack>
  );
};

export default Sidebar;
