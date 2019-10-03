module Header exposing (view)

import Html exposing (Html, a, div, img, nav, text)
import Html.Attributes exposing (alt, class, classList, href)
import Html.Events exposing (custom)
import Json.Decode as Decode
import Page.Entries as EntriesPage
import Page.Home as HomePage
import Router
import Url exposing (Url)


view : Url -> Html msg
view url =
    nav [ class "navbar" ]
        [ Router.link url.path HomePage.path [ class "item brand" ] [ text "Smocker" ]
        , Router.link url.path EntriesPage.path [ class "item" ] [ text EntriesPage.name ]
        ]
