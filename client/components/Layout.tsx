import { Grid, GridItem, VStack } from "@chakra-ui/react";
import React from "react";
import { Route, Routes } from "react-router-dom";
import { GlobalStateContext } from "../modules/state";
import { Footer } from "./Footer";
import { History } from "./History";
import { Mocks } from "./Mocks";
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
      >
        <VStack flex="1" align="stretch" spacing={10}>
          <Routes>
            <Route path="/pages/history" element={<History />} />
            <Route path="/pages/mocks" element={<Mocks />} />
            <Route path="*" element={<History />} />
          </Routes>
          <Footer />
        </VStack>
      </GridItem>
    </Grid>
  );
};
