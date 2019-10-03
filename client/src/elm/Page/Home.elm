module Page.Home exposing (..)

import Html exposing (..)
import Html.Attributes exposing (..)


key : String
key =
    "home"


path : String
path =
    "/page/home"


name : String
name =
    "Home"


init : Cmd msg
init =
    Cmd.none


view : Html msg
view =
    div [ class "home" ]
        [ div [ class "segment" ]
            [ h1 [] [ text "Overview" ]
            , p []
                [ text "Smocker (server mock) is a simple and efficient HTTP mock server." ]
            , p []
                [ text "The documentation is available on the "
                , a [ href "https://github.com/Thiht/smocker/wiki" ]
                    [ text "project's wiki" ]
                , text "."
                ]
            , h2 [ id "installation" ]
                [ text "Installation" ]
            , h3 [ id "withdocker" ]
                [ text "With Docker" ]
            , pre []
                [ code [ class "sh language-sh" ]
                    [ text
                        """docker run -d \\
  --restart=always \\
  -p 8080:8080 \\
  -p 8081:8081 \\
  --name smocker \\
  thiht/smocker
"""
                    ]
                ]
            , h3 [ id "healthcheck" ]
                [ text "Healthcheck" ]
            , pre []
                [ code [ class "sh language-sh" ]
                    [ text "curl localhost:8081/version" ]
                ]
            , h2 [ id "usage" ]
                [ text "Usage" ]
            , p []
                [ text "smocker exposes two ports:" ]
            , ul []
                [ li []
                    [ strong []
                        [ text "8080: " ]
                    , text "is the mock server port. It will expose the routes you register through the configuration port"
                    ]
                , li []
                    [ strong []
                        [ text "8081: " ]
                    , text "is the configuration port. It's the port you will use to register new mocks"
                    ]
                ]
            , h3 [ id "helloworld" ]
                [ text "Hello, World!" ]
            , p []
                [ text "To register a mock, you can use the YAML and the JSON formats. A basic mock might look like this:" ]
            , pre []
                [ code [ class "yaml language-yaml" ]
                    [ text
                        """# helloworld.yml
# This mock register two routes: GET /hello/world and GET /foo/bar
- request:
    # Note: the method could be omitted because GET is the default
    method: GET
    path: /hello/world
  response:
    # Note: the status could be omitted because 200 is the default
    status: 200
    headers:
      Content-Type: [application/json]
    body: >
      {
        "hello": "Hello, World!"
      }

- request:
    method: GET
    path: /foo/bar
  response:
    status: 204"""
                    ]
                ]
            , p []
                [ text "You can then register it to the configuration server with the following command:" ]
            , pre []
                [ code [ class "sh language-sh" ]
                    [ text "curl -XPOST --header \"Content-Type: application/x-yaml\" --data-binary \"@helloworld.yml\" localhost:8081/mocks" ]
                ]
            , p []
                [ text "After your mock is registered, you can query the mock server on the specified route, so that it returns the expected response to you:" ]
            , pre []
                [ code [ class "sh language-sh" ]
                    [ text
                        """$ curl -i localhost:8080/hello/world
HTTP/1.1 200 OK
Content-Type: application/json
Date: Thu, 05 Sep 2019 15:49:32 GMT
Content-Length: 31

{
  "hello": "Hello, World!"
}"""
                    ]
                ]
            , p []
                [ text "To cleanup the mock server without restarting it, you can execute the following command:" ]
            , pre []
                [ code [ class "sh language-sh" ]
                    [ text "curl -XPOST localhost:8081/reset" ]
                ]
            , p []
                [ text "For more advanced usage, please read the "
                , a [ href "https://github.com/Thiht/smocker/wiki" ]
                    [ text "project's documentation" ]
                , text "."
                ]
            , h2 [ id "development" ]
                [ text "Development" ]
            , h3 [ id "integrationtests" ]
                [ text "Integration Tests" ]
            , p []
                [ text "In order to launch integrations tests, you must first launch smocker:" ]
            , pre []
                [ code [ class "sh language-sh" ]
                    [ text "make start" ]
                ]
            , p []
                [ text "Then, open another terminal and launch the integration tests:" ]
            , pre []
                [ code [ class "sh language-sh" ]
                    [ text "make test-integration" ]
                ]
            ]
        ]
