port module Main exposing (Model, Msg(..), init, main, update, view)

import Browser exposing (Document, UrlRequest)
import Browser.Navigation as Navigation
import Debug exposing (log)
import Header
import Html exposing (..)
import Html.Attributes exposing (..)
import Model.History as History
import Page.Entries as EntriesPage
import Page.Home as HomePage
import Router
import Task
import Url exposing (Url)


main : Program Flags Model Msg
main =
    Browser.application
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        , onUrlChange = UrlChanged
        , onUrlRequest = LinkClicked
        }



-- MODEL


type alias Flags =
    { basePath : String
    , version : String
    }


type alias Model =
    { url : Url
    , key : Navigation.Key
    , history : History.Model
    , flags : Flags
    }


init : Flags -> Url -> Navigation.Key -> ( Model, Cmd Msg )
init flags url key =
    let
        model =
            { url = url
            , key = key
            , history = History.Success []
            , flags = flags
            }
    in
    ( model
    , onRouteChanged (Router.parseUrl url) model
    )



-- UPDATE


type Msg
    = LinkClicked Browser.UrlRequest
    | UrlChanged Url.Url
    | HistoryMsg History.Msg


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        LinkClicked urlRequest ->
            case urlRequest of
                Browser.Internal url ->
                    ( model, Navigation.pushUrl model.key (Url.toString url) )

                Browser.External href ->
                    ( model, Navigation.load href )

        UrlChanged url ->
            ( { model | url = url }
            , onRouteChanged (Router.parseUrl url) model
            )

        HistoryMsg historyMsg ->
            let
                ( history, cmd ) =
                    History.update model.flags.basePath historyMsg model.history
            in
            ( { model | history = history }, Cmd.map HistoryMsg cmd )


onRouteChanged : Router.Route -> Model -> Cmd Msg
onRouteChanged route model =
    case route of
        Router.Entries ->
            Cmd.map HistoryMsg (Task.succeed History.FetchHistory |> Task.perform identity)

        _ ->
            Cmd.none



-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.none



-- VIEW


view : Model -> Document Msg
view model =
    { title = "Smocker: " ++ model.url.path
    , body =
        [ div [ class "expended vertical layout start-justified" ]
            [ Header.view model.url
            , div [ class "flex vertical layout start-justified" ] [ viewRouter model ]
            ]
        ]
    }


viewRouter : Model -> Html Msg
viewRouter model =
    case Router.parseUrl model.url of
        Router.Home ->
            HomePage.view

        Router.Entries ->
            EntriesPage.view (EntriesPage.Model model.history)

        Router.NotFound ->
            HomePage.view
