module Model.History exposing (..)

import Dict exposing (Dict)
import Http
import Json.Decode as Decode exposing (Decoder, bool, decodeString, dict, float, int, lazy, list, map, null, nullable, oneOf, string, value)
import Json.Decode.Pipeline exposing (hardcoded, optional, required)
import Json.Encode exposing (encode)


type alias History =
    List Entry


historyDecoder : Decoder History
historyDecoder =
    Decode.list entryDecoder


type alias Entry =
    { request : Request
    , response : Response
    }


entryDecoder : Decoder Entry
entryDecoder =
    Decode.succeed Entry
        |> required "request" requestDecoder
        |> required "response" responseDecoder


type alias Request =
    { path : String
    , method : String
    , body : Maybe String
    , queryParams : Maybe (Dict String (List String))
    , headers : Maybe (Dict String (List String))
    }


requestDecoder : Decoder Request
requestDecoder =
    Decode.succeed Request
        |> required "path" string
        |> required "method" string
        |> optional "body" (nullable string) Nothing
        |> optional "query_params" (nullable (dict (list string))) Nothing
        |> optional "headers" (nullable (dict (list string))) Nothing


type alias Response =
    { status : Int
    , body : Maybe String
    , headers : Maybe (Dict String (List String))
    }


responseDecoder : Decoder Response
responseDecoder =
    Decode.succeed Response
        |> required "status" int
        |> optional "body" (nullable (value |> Decode.map (encode 2))) Nothing
        |> optional "headers" (nullable (dict (list string))) Nothing


type Model
    = Loading
    | Success History
    | Failure String


type Msg
    = FetchHistory
    | GotHistory (Result Http.Error History)


update : String -> Msg -> Model -> ( Model, Cmd Msg )
update basePath msg model =
    case msg of
        FetchHistory ->
            ( Loading, fetchHistory basePath )

        GotHistory result ->
            case result of
                Ok history ->
                    ( Success history, Cmd.none )

                Err error ->
                    case error of
                        Http.BadUrl s ->
                            ( Failure s, Cmd.none )

                        Http.Timeout ->
                            ( Failure "Timeout", Cmd.none )

                        Http.NetworkError ->
                            ( Failure "Network Error", Cmd.none )

                        Http.BadStatus s ->
                            ( Failure (String.fromInt s), Cmd.none )

                        Http.BadBody s ->
                            ( Failure s, Cmd.none )


fetchHistory : String -> Cmd Msg
fetchHistory basePath =
    Http.get
        { url = "http://localhost:8081/history"
        , expect = Http.expectJson GotHistory historyDecoder
        }
