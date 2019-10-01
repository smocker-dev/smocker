module Page.Live exposing (..)

import Html exposing (..)
import Html.Attributes exposing (..)


view : List (Html msg)
view =
    [ textarea [ class "textarea has-background-dark has-text-white is-primary" ] [ text "test" ] ]
