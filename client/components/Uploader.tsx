import {
  Box,
  CircularProgress,
  Icon,
  Link,
  Tooltip,
  useToast
} from "@chakra-ui/react";
import React from "react";
import { RiUpload2Fill } from "react-icons/ri";
import { useUploadSessions } from "../modules/queries";

export const FileUploader = () => {
  const [uploading, setUploading] = React.useState(false);
  const ref = React.createRef<HTMLInputElement>();
  const toast = useToast();
  const uploadSessionsMutation = useUploadSessions();
  const onFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUploading(true);
    const files = event.target.files;
    if (!files) {
      return;
    }
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (ev: ProgressEvent<FileReader>) => {
      try {
        const sessionToUpload = JSON.parse(ev.target?.result as string);
        uploadSessionsMutation.mutate(sessionToUpload);
      } catch (e) {
        const err = e as Error;
        toast({
          title: "Unable to upload sessions",
          description: err.message,
          status: "error",
          duration: 9000,
          isClosable: true,
          position: "top-right"
        });
      }
      setUploading(false);
    };
    reader.readAsText(file);
  };

  return (
    <Box>
      <input
        ref={ref}
        type="file"
        onChange={onFileUpload}
        style={{ display: "none" }}
      />
      <Tooltip hasArrow label="Upload Sessions">
        {uploading ? (
          <CircularProgress size="18px" isIndeterminate color="blue.400" />
        ) : (
          <Link colorScheme="blue" onClick={() => ref.current?.click()}>
            <Icon as={RiUpload2Fill} boxSize="5" mb="-.25em" />
          </Link>
        )}
      </Tooltip>
    </Box>
  );
};
