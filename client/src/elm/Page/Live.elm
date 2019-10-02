module Page.Live exposing (..)

import Html exposing (..)
import Html.Attributes exposing (..)


name : String
name =
    "Live"


path : String
path =
    "/live"


view : List (Html msg)
view =
    [ textarea [ class "is-body" ] [ text "test" ] ]
