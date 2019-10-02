import Browser
import Dict exposing (Dict)
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (..)
import Http
import Json.Decode exposing (Decoder, map2, map3, map4, maybe, field, int, string, list, dict)

-- MAIN

main =
  Browser.element
    { init = init
    , update = update
    , subscriptions = subscriptions
    , view = view
    }

-- MODEL

type alias DictStringToListString = Dict String (List String)

type alias HistoryRequest =
  { path : String
  , method : String
  , headers : Maybe DictStringToListString
  , queryParams : Maybe DictStringToListString
  }

type alias HistoryResponse =
  { status : Int
  , body : String
  , headers : Maybe DictStringToListString
  }

type alias HistoryEntry =
  { request : HistoryRequest
  , response : HistoryResponse
  }

type Model
  = Failure String
  | Loading
  | Success (List HistoryEntry)

init : () -> (Model, Cmd Msg)
init _ =
  (Loading, getHistory)

-- UPDATE

type Msg
  = GotHistory (Result Http.Error (List HistoryEntry))

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
  case msg of
    GotHistory result ->
      case result of
        Ok history ->
          (Success history, Cmd.none)

        Err error ->
          case error of
            Http.BadUrl s ->
              (Failure s, Cmd.none)
            Http.Timeout ->
              (Failure "Timeout", Cmd.none)
            Http.NetworkError ->
              (Failure "Network Error", Cmd.none)
            Http.BadStatus s ->
              (Failure (String.fromInt s), Cmd.none)
            Http.BadBody s ->
              (Failure s, Cmd.none)

-- SUBSCRIPTIONS

subscriptions : Model -> Sub Msg
subscriptions model =
  Sub.none

-- VIEW

view : Model -> Html Msg
view model =
  case model of
    Failure error ->
      pre [ class "error" ] [ text error ]

    Loading ->
      text "Loading..."

    Success history ->
      renderHistory history

renderHistory : List HistoryEntry -> Html msg
renderHistory history =
  div [ class "history" ]
    (List.map (\entry ->
      div [ class "history-entry" ]
      [ renderHistoryRequest entry.request
      , renderHistoryResponse entry.response
      ]
    ) history)

renderHistoryRequest : HistoryRequest -> Html msg
renderHistoryRequest request =
  div [ class "history-request" ]
    [ span [ class "request-method" ] [ text request.method ]
    , span [ class "request-path" ] [ text (request.path ++ (formatQueryParams request.queryParams)) ]
    , renderHeaders request.headers
    ]

formatQueryParams : Maybe DictStringToListString -> String
formatQueryParams maybeDict =
  case maybeDict of
    Just dict ->
      "?" ++ (Dict.foldl (\key values acc -> acc ++ List.map (\value -> key ++ "=" ++ value) values) [] dict |> String.join "&")
    Nothing -> ""

renderHistoryResponse : HistoryResponse -> Html msg
renderHistoryResponse response =
  div [ class "history-response"]
  [ span
    [ class "response-status"
    , classList
      [ ("response-status-success", response.status /= 404)
      , ("response-status-failure", response.status == 404)
      ]
    ]
    [ text (String.fromInt response.status) ]
  , renderHeaders response.headers
  , pre [ class "request-body"] [ text response.body ]
  ]

renderHeaders : Maybe DictStringToListString -> Html msg
renderHeaders maybeHeaders =
  case maybeHeaders of
    Just headers -> table []
      (headers |> Dict.toList |> List.map (\(header, values) -> renderHeader header values))
    Nothing -> text ""

renderHeader : String -> (List String) -> Html msg
renderHeader header values =
  tr []
    [ td [] [ text header ]
    , td [] [ String.join ", " values |> text ]
    ]

-- HTTP

getHistory : Cmd Msg
getHistory =
  Http.get
    { url = "http://localhost:8081/history"
    , expect = Http.expectJson GotHistory historyDecoder
    }

historyDecoder : Decoder (List HistoryEntry)
historyDecoder =
  list historyEntryDecoder

historyEntryDecoder : Decoder HistoryEntry
historyEntryDecoder =
  map2 HistoryEntry
    (field "request" requestDecoder)
    (field "response" responseDecoder)

requestDecoder : Decoder HistoryRequest
requestDecoder =
  map4 HistoryRequest
    (field "path" string)
    (field "method" string)
    (maybe (field "headers" (dict (list string))))
    (maybe (field "query_params" (dict (list string))))

responseDecoder : Decoder HistoryResponse
responseDecoder =
  map3 HistoryResponse
    (field "status" int)
    (field "body" (field "message" string))
    (field "headers" (maybe (dict (list string))))

