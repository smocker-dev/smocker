port module Main exposing (Model, Msg(..), init, main, update, view)

import Browser exposing (Document)
import Browser.Navigation as Nav
import Header
import Html exposing (..)
import Html.Attributes exposing (..)
import Router
import Url exposing (Url)


port title : String -> Cmd msg


main : Program Flags Model Msg
main =
    Browser.application
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        , onUrlChange = \url -> Route (Router.UrlChanged url)
        , onUrlRequest = \urlRequest -> Route (Router.LinkClicked urlRequest)
        }



-- MODEL


type alias Flags =
    { basePath : String
    , version : String
    }


type alias Model =
    { router : Router.RouterModel
    , flags : Flags
    , counter : Int
    }


init : Flags -> Url -> Nav.Key -> ( Model, Cmd Msg )
init flags url key =
    ( { router = { url = url, key = key }
      , flags = flags
      , counter = 0
      }
    , title flags.version
    )



-- UPDATE


type Msg
    = Route Router.RouterMsg


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        Route routerMsg ->
            let
                ( router, cmd ) =
                    Router.updateRouter routerMsg model.router
            in
            ( { model | router = router }, cmd )



-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.none



-- VIEW


view : Model -> Document Msg
view model =
    { title = model.router.url.path
    , body =
        [ div [ class "has-background-black-ter", style "height" "100%" ]
            [ Header.view model.router.url
            , div [ class "section has-text-centered has-text-white" ] (Router.viewRouter model.router.url.path)
            ]
        ]
    }
