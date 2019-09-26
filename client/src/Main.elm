port module Main exposing (Model, Msg(..), init, main, update, view)

import Browser
import Html exposing (Html, button, div, text)
import Html.Attributes exposing (class)
import Html.Events exposing (onClick)


port title : String -> Cmd msg


main =
    Browser.element
        { init = init
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
    { basePath : String
    , version : String
    , counter : Int
    }


init : Flags -> ( Model, Cmd Msg )
init flags =
    ( { basePath = flags.basePath
      , version = flags.version
      , counter = 0
      }
    , title flags.version
    )



-- UPDATE


type Msg
    = Increment
    | Decrement


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        Increment ->
            ( { model | counter = model.counter + 1 }
            , Cmd.none
            )

        Decrement ->
            ( { model | counter = model.counter - 1 }
            , Cmd.none
            )



-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.none



-- VIEW


view : Model -> Html Msg
view model =
    div [ class "buttons has-addons is-centered" ]
        [ button [ class "button is-primary", onClick Decrement ] [ text "-" ]
        , button [ class "button is-static", onClick Increment ] [ text (String.fromInt model.counter) ]
        , button [ class "button is-primary", onClick Increment ] [ text "+" ]
        ]
