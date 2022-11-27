import { Box, Flex, Grid, GridItem } from "@chakra-ui/react";
import React from "react";
import { GlobalStateContext } from "../modules/state";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

export const Layout = () => {
  const { isSidebarOpen } = React.useContext(GlobalStateContext);
  return (
    <Grid
      templateAreas={`"header header"
                  "nav main"`}
      gridTemplateRows={"46px auto"}
      gridTemplateColumns={"auto 1fr"}
      height="100vh"
    >
      <GridItem area={"header"}>
        <Navbar />
      </GridItem>
      <GridItem
        width={isSidebarOpen ? "200px" : "0px"}
        area={"nav"}
        transition="all .2s"
        display="flex"
        flexDirection="column"
        alignItems="stretch"
        minHeight="0"
      >
        <Sidebar />
      </GridItem>
      <GridItem
        bg="page.bg"
        area={"main"}
        display="flex"
        flexDirection="column"
        flex={1}
        minHeight="100%"
        overflowY="auto"
        alignItems="center"
      >
        <Flex>
          <Box flex={1}>Body</Box>
          <Footer />
        </Flex>
      </GridItem>
    </Grid>
  );
};
