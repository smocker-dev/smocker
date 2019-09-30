module Header exposing (view)

import Html exposing (Html, a, div, img, nav, text)
import Html.Attributes exposing (alt, class, height, src, width)


view : Html msg
view =
    nav [ class "navbar is-dark" ]
        [ div [ class "navbar-brand" ]
            [ a [ class "navbar-item has-text-primary is-uppercase has-text-weight-bold" ]
                [ text "Smocker" ]
            ]
        , div [ class "navbar-menu" ]
            [ div [ class "navbar-start" ]
                [ a [ class "navbar-item" ]
                    [ text "Live" ]
                ]
            ]
        ]
