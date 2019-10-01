module Router exposing (..)

import Browser exposing (Document)
import Browser.Navigation as Nav
import Html exposing (..)
import Html.Attributes exposing (..)
import Page.Home as Home
import Page.Live as Live
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
    case path of
        "/live" ->
            Live.view

        "/home" ->
            Home.view

        _ ->
            []


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
