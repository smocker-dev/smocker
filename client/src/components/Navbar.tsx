import * as React from "react";
import { Link, withRouter, RouteComponentProps } from "react-router-dom";
import Logo from "~assets/logo.png";
import { connect } from "react-redux";
import { AppState } from "~modules/reducers";
import { Dispatch } from "redux";
import { Actions, actions } from "~modules/actions";
import { Button, Layout, Menu, Row } from "antd";
import "./Navbar.scss";

interface Props extends RouteComponentProps {
  loading: boolean;
  reset: () => void;
}

const Navbar = ({ loading, reset, location }: Props) => {
  return (
    <Layout.Header className="navbar">
      <Row type="flex" justify="start" align="middle">
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
            <a href="https://smocker.dev/" target="_blank">
              Documentation
            </a>
          </Menu.Item>
        </Menu>
        <Button
          type="danger"
          ghost
          loading={loading && { delay: 300 }}
          onClick={reset}
        >
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
