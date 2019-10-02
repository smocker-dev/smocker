module Router exposing (..)

import Browser exposing (Document)
import Browser.Navigation as Nav
import Html exposing (..)
import Html.Attributes exposing (..)
import Page.Home as Home
import Page.Live as Live
import String exposing (endsWith, slice, startsWith)
import Url exposing (Url)


type alias RouterModel =
    { url : Url
    , key : Nav.Key
    }


type RouterMsg
    = LinkClicked Browser.UrlRequest
    | UrlChanged Url.Url


updateRouter : RouterMsg -> RouterModel -> ( RouterModel, Cmd msg )
updateRouter msg model =
    case msg of
        LinkClicked urlRequest ->
            case urlRequest of
                Browser.Internal url ->
                    ( model, Nav.pushUrl model.key (Url.toString url) )

                Browser.External href ->
                    ( model, Nav.load href )

        UrlChanged url ->
            ( { model | url = url }
            , Cmd.none
            )


viewRouter : String -> List (Html msg)
viewRouter path =
    if startsWith path Live.path then
        Live.view

    else if startsWith path Home.path then
        Home.view

    else
        Live.view


viewLink : String -> String -> List (Html.Attribute msg) -> List (Html msg) -> Html msg
viewLink currentPath path attrs values =
    let
        attributes =
            [ classList
                [ ( "navbar-item", True )
                , ( "is-active", currentPath == path )
                ]
            , href path
            ]
                ++ attrs
    in
    a attributes values


trimRightPath : String -> String
trimRightPath path =
    if endsWith path "/" then
        slice 0 -1 path

    else
        path
