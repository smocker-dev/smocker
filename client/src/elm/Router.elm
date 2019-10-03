module Router exposing (..)

import Browser exposing (Document)
import Browser.Navigation as Navigation
import Html exposing (..)
import Html.Attributes exposing (..)
import Page.Entries as EntriesPage
import Page.Home as HomePage
import String exposing (endsWith, slice, startsWith)
import Url exposing (Url)
import Url.Parser as P


type Route
    = Home
    | Entries
    | NotFound


matchers : P.Parser (Route -> a) a
matchers =
    P.oneOf
        [ P.map Home (P.s HomePage.key)
        , P.map Entries (P.s EntriesPage.key)
        ]


parseUrl : Url -> Route
parseUrl url =
    let
        route =
            P.parse matchers url
    in
    case route of
        Just r ->
            r

        Nothing ->
            NotFound


pathFor : Route -> String
pathFor route =
    case route of
        Home ->
            HomePage.path

        Entries ->
            EntriesPage.path

        NotFound ->
            HomePage.path


link : String -> String -> List (Html.Attribute msg) -> List (Html msg) -> Html msg
link currentPath path attrs values =
    let
        attributes =
            [ classList
                [ ( "is-active", currentPath == path ) ]
            , href path
            ]
                ++ attrs
    in
    a attributes values
