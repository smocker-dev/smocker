port module Main exposing (Model, Msg(..), init, main, update, view)

import Browser exposing (Document)
import Browser.Navigation as Navigation
import Header
import Html exposing (Html, button, div, text)
import Html.Attributes exposing (class, style)
import Html.Events exposing (onClick)
import Url exposing (Url)


port title : String -> Cmd msg


main =
    Browser.application
        { init = init
        , onUrlChange = ChangedUrl
        , onUrlRequest = ClickedLink
        , update = update
        , subscriptions = subscriptions
        , view = view
        }



-- MODEL


type alias Flags =
    { basePath : String
    , version : String
    }


type alias Model =
    { flags : Flags
    , counter : Int
    }


init : Flags -> Url -> Navigation.Key -> ( Model, Cmd Msg )
init flags _ _ =
    ( { flags = flags
      , counter = 0
      }
    , title flags.version
    )



-- UPDATE


type Msg
    = ChangedUrl Url
    | ClickedLink Browser.UrlRequest


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        _ ->
            ( model, Cmd.none )



-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.none



-- VIEW


view : Model -> Document Msg
view model =
    { title = "Home"
    , body =
        [ div [ class "has-background-black-ter", style "height" "100%" ]
            [ Header.view
            , div [ class "section has-text-centered has-text-white" ] [ text "Under construction" ]
            ]
        ]
    }
