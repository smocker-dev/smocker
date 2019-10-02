module Header exposing (view)

import Html exposing (Html, a, div, img, nav, text)
import Html.Attributes exposing (alt, class, classList, href)
import Html.Events exposing (custom)
import Json.Decode as Decode
import Page.Home as Home
import Page.Live as Live
import Router
import Url exposing (Url)


view : Url -> Html msg
view url =
    nav [ class "navbar" ]
        [ div [ class "brand" ]
            [ Router.viewLink url.path
                Home.path
                [ class "item" ]
                [ text "Smocker" ]
            ]
        , div [ class "menu" ]
                [ Router.viewLink url.path Live.path [] [ text Live.name ] ]
        ]
