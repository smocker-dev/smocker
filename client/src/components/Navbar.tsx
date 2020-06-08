import { Button, Layout, Menu, Row } from "antd";
import * as React from "react";
import { connect } from "react-redux";
import { Link, RouteComponentProps, withRouter } from "react-router-dom";
import { Dispatch } from "redux";
import Logo from "~assets/logo.png";
import { Actions, actions } from "~modules/actions";
import { AppState } from "~modules/reducers";
import "./Navbar.scss";

interface Props extends RouteComponentProps {
  loading: boolean;
  reset: () => unknown;
}

const Navbar = ({ loading, reset, location }: Props) => {
  return (
    <Layout.Header className="navbar">
      <Row justify="start" align="middle">
        <Link className="logo" to="/">
          <img height={42} src={Logo} />
          Smocker
        </Link>
        <Menu
          selectedKeys={[location.pathname]}
          defaultSelectedKeys={["/pages/history"]}
          className="menu"
          theme="dark"
          mode="horizontal"
        >
          <Menu.Item key="/pages/history">
            <Link to="/pages/history">History</Link>
          </Menu.Item>
          <Menu.Item key="/pages/mocks">
            <Link to="/pages/mocks">Mocks</Link>
          </Menu.Item>
          <Menu.Item>
            <a href="https://smocker.dev/" target="_blank" rel="noreferrer">
              Documentation
            </a>
          </Menu.Item>
        </Menu>
        <Button danger ghost loading={loading} onClick={reset}>
          Reset
        </Button>
      </Row>
    </Layout.Header>
  );
};

export default withRouter(
  connect(
    (state: AppState) => ({
      loading: state.history.loading || state.mocks.loading,
    }),
    (dispatch: Dispatch<Actions>) => ({
      reset: () => dispatch(actions.reset.request()),
    })
  )(Navbar)
);
