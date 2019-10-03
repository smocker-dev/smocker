module Page.Entries exposing (..)

import Dict exposing (Dict)
import Html exposing (..)
import Html.Attributes exposing (..)
import Json.Encode as Encode
import Model.History as History


key : String
key =
    "entries"


path : String
path =
    "/entries"


name : String
name =
    "Entries"


type alias Model =
    { history : History.Model
    }


view : Model -> Html msg
view model =
    case model.history of
        History.Loading ->
            div [ class "expended layout vertical center-center" ]
                [ div [ class "loader" ]
                    [ div [] []
                    , div [] []
                    , div [] []
                    , div [] []
                    , div [] []
                    , div [] []
                    , div [] []
                    , div [] []
                    ]
                ]

        History.Success history ->
            renderHistory history

        History.Failure err ->
            text err


renderHistory : History.History -> Html msg
renderHistory history =
    div [ class "history" ]
        (List.map
            (\entry ->
                div [ class "history-entry" ]
                    [ renderHistoryRequest entry.request
                    , renderHistoryResponse entry.response
                    ]
            )
            history
        )


renderHistoryRequest : History.Request -> Html msg
renderHistoryRequest request =
    div [ class "history-request" ]
        [ span [ class "request-method" ] [ text request.method ]
        , span [ class "request-path" ] [ text (request.path ++ formatQueryParams request.queryParams) ]
        , renderHeaders request.headers
        ]


formatQueryParams : Maybe (Dict String (List String)) -> String
formatQueryParams maybeDict =
    case maybeDict of
        Just dict ->
            "?" ++ (Dict.foldl (\k values acc -> acc ++ List.map (\value -> k ++ "=" ++ value) values) [] dict |> String.join "&")

        Nothing ->
            ""


renderHistoryResponse : History.Response -> Html msg
renderHistoryResponse response =
    div [ class "history-response" ]
        [ renderStatus response.status
        , renderHeaders response.headers
        , pre [ class "response-body" ]
            [ text
                (case response.body of
                    Just txt ->
                        txt

                    Nothing ->
                        ""
                )
            ]
        ]


renderStatus : Int -> Html msg
renderStatus status =
    span
        [ class "response-status"
        , classList
            [ ( "response-status-success", status /= 404 )
            , ( "response-status-failure", status == 404 )
            ]
        ]
        [ text (String.fromInt status) ]


renderHeaders : Maybe (Dict String (List String)) -> Html msg
renderHeaders maybeHeaders =
    case maybeHeaders of
        Just headers ->
            table []
                (headers |> Dict.toList |> List.map renderHeader)

        Nothing ->
            text ""


renderHeader : ( String, List String ) -> Html msg
renderHeader ( header, values ) =
    tr []
        [ td [] [ text header ]
        , td [] [ values |> String.join ", " |> text ]
        ]
