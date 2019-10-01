module Header exposing (view)

import Html exposing (Html, a, div, img, nav, text)
import Html.Attributes exposing (alt, class, classList, href)
import Html.Events exposing (custom)
import Json.Decode as Decode
import Router
import Url exposing (Url)


view : Url -> Html msg
view url =
    nav [ class "navbar is-dark" ]
        [ div [ class "navbar-brand" ]
            [ Router.viewLink url.path
                "/"
                [ class "navbar-item has-text-primary is-uppercase has-text-weight-bold" ]
                [ text "Smocker" ]
            ]
        , div [ class "navbar-menu" ]
            [ div [ class "navbar-start" ]
                [ Router.viewLink url.path "/home" [] [ text "Home" ]
                , Router.viewLink url.path "/live" [] [ text "Live" ]
                ]
            ]
        ]
