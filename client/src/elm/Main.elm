port module Main exposing (Model, Msg(..), init, main, update, view)

import Browser exposing (Document, UrlRequest)
import Browser.Navigation as Nav
import Debug exposing (log)
import Header
import Html exposing (..)
import Html.Attributes exposing (..)
import Model.History as History
import Page.Home as Home
import Router exposing (..)
import Url exposing (Url)


main : Program Flags Model Msg
main =
    Browser.application
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        , onUrlChange = onUrlChange
        , onUrlRequest = onUrlRequest
        }


onUrlChange : Url -> Msg
onUrlChange url =
    RouterMsg (UrlChanged url)


onUrlRequest : UrlRequest -> Msg
onUrlRequest urlRequest =
    RouterMsg (LinkClicked urlRequest)



-- MODEL


type alias Flags =
    { basePath : String
    , version : String
    }


type alias Model =
    { router : RouterModel
    , history : History.Model
    , flags : Flags
    }


init : Flags -> Url -> Nav.Key -> ( Model, Cmd Msg )
init flags url key =
    ( { router =
            { url = url
            , key = key
            }
      , history = History.Success []
      , flags = flags
      }
    , Cmd.batch
        [ initPath url
            key
            Home.path
        , Cmd.map
            HistoryMsg
            (History.fetchHistory
                flags.basePath
            )
        ]
    )


initPath : Url -> Nav.Key -> String -> Cmd msg
initPath url key path =
    if url.path == "/" then
        Nav.pushUrl key path

    else
        Cmd.none



-- UPDATE


type Msg
    = RouterMsg RouterMsg
    | HistoryMsg History.Msg


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        RouterMsg routerMsg ->
            let
                ( router, cmd ) =
                    updateRouter routerMsg model.router
            in
            ( { model | router = router }, Cmd.map RouterMsg cmd )

        HistoryMsg historyMsg ->
            let
                ( history, cmd ) =
                    History.update historyMsg model.history
            in
            ( { model | history = history }, Cmd.map HistoryMsg cmd )



-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.none



-- VIEW


view : Model -> Document Msg
view model =
    { title = "Smocker: " ++ model.router.url.path
    , body =
        [ div [ class "has-background-black-ter", style "height" "100%" ]
            [ Header.view model.router.url
            , div [ class "section has-text-centered has-text-white" ] (viewRouter model.router.url.path)
            ]
        ]
    }
