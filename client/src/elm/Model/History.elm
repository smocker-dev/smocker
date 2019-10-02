module Model.History exposing (..)

import Dict exposing (Dict)
import Http
import Json.Decode as Decode exposing (Decoder, bool, decodeString, dict, float, int, lazy, list, map, null, nullable, oneOf, string)
import Json.Decode.Pipeline exposing (hardcoded, optional, required)


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
    , body : String
    , queryParams : Dict String (List String)
    , headers : Dict String (List String)
    }


requestDecoder : Decoder Request
requestDecoder =
    Decode.succeed Request
        |> required "path" string
        |> required "method" string
        |> optional "body" string ""
        |> optional "query_params" (dict (list string)) Dict.empty
        |> optional "headers" (dict (list string)) Dict.empty


type alias Response =
    { status : Int
    , body : JsonValue
    , headers : Dict String (List String)
    }


responseDecoder : Decoder Response
responseDecoder =
    Decode.succeed Response
        |> required "status" int
        |> optional "body" jsonValueDecoder JsonNull
        |> optional "headers" (dict (list string)) Dict.empty


type JsonValue
    = JsonString String
    | JsonInt Int
    | JsonFloat Float
    | JsonBoolean Bool
    | JsonArray (List JsonValue)
    | JsonObject (Dict String JsonValue)
    | JsonNull


jsonValueDecoder : Decoder JsonValue
jsonValueDecoder =
    oneOf
        [ map JsonString string
        , map JsonInt int
        , map JsonFloat float
        , map JsonBoolean bool
        , list (lazy (\_ -> jsonValueDecoder)) |> map JsonArray
        , dict (lazy (\_ -> jsonValueDecoder)) |> map JsonObject
        , null JsonNull
        ]


type Model
    = Loading
    | Failure
    | Success History


type Msg
    = GotHistory (Result Http.Error History)


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        GotHistory result ->
            case result of
                Ok history ->
                    ( Success history, Cmd.none )

                Err _ ->
                    ( Failure, Cmd.none )


fetchHistory : String -> Cmd Msg
fetchHistory basePath =
    Http.get
        { url = "http://localhost:8081/history"
        , expect = Http.expectJson GotHistory historyDecoder
        }
