import { Grid, GridItem, VStack } from "@chakra-ui/react";
import React from "react";
import { Route, Routes } from "react-router-dom";
import { GlobalStateContext } from "../modules/state";

const Navbar = React.lazy(() => import("./Navbar"));
const Sidebar = React.lazy(() => import("./Sidebar"));
const Footer = React.lazy(() => import("./Footer"));
const History = React.lazy(() => import("./History"));
const Mocks = React.lazy(() => import("./Mocks"));

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
        <React.Suspense>
          <Navbar />
        </React.Suspense>
      </GridItem>
      <GridItem
        width={isSidebarOpen ? "200px" : "0px"}
        area={"nav"}
        transition="all .2s"
        display="flex"
        flexDirection="column"
        minHeight="0"
      >
        <React.Suspense>
          <Sidebar />
        </React.Suspense>
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
          <React.Suspense>
            <Routes>
              <Route path="/pages/history" element={<History />} />
              <Route path="/pages/mocks" element={<Mocks />} />
              <Route path="*" element={<History />} />
            </Routes>
          </React.Suspense>
          <Footer />
        </VStack>
      </GridItem>
    </Grid>
  );
};
