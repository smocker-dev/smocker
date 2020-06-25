import { fold, left } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";
import * as t from "io-ts";
import { PathReporter } from "io-ts/lib/PathReporter";
import { Observable, of, throwError } from "rxjs";

export const dateFormat = "ddd, D MMM YYYY HH:mm:ss.SSS";
export const defaultMatcher = "ShouldEqual";

export const ErrorCodec = t.type({
  message: t.any,
});
export type Error = t.TypeOf<typeof ErrorCodec>;

export const SessionCodec = t.type({
  id: t.string,
  name: t.string,
  date: t.string,
});
export type Session = t.TypeOf<typeof SessionCodec>;

export const SessionsCodec = t.array(SessionCodec);
export type Sessions = t.TypeOf<typeof SessionsCodec>;

const MultimapCodec = t.dictionary(t.string, t.array(t.string));
export type Multimap = t.TypeOf<typeof MultimapCodec>;

const StringMatcherCodec = t.type({
  matcher: t.string,
  value: t.string,
});
export type StringMatcher = t.TypeOf<typeof StringMatcherCodec>;

const StringMatcherSliceCodec = t.array(StringMatcherCodec);
export type StringMatcherSlice = t.TypeOf<typeof StringMatcherSliceCodec>;

const StringMatcherMapCodec = t.dictionary(t.string, StringMatcherCodec);
export type StringMatcherMap = t.TypeOf<typeof StringMatcherMapCodec>;

const MultimapMatcherCodec = t.dictionary(t.string, StringMatcherSliceCodec);
export type MultimapMatcher = t.TypeOf<typeof MultimapMatcherCodec>;

const BodyMatcherCodec = t.union([StringMatcherCodec, StringMatcherMapCodec]);
export type BodyMatcher = t.TypeOf<typeof BodyMatcherCodec>;

const EntryRequestCodec = t.type({
  path: t.string,
  method: t.string,
  body: t.union([t.any, t.undefined]),
  query_params: t.union([MultimapCodec, t.undefined]),
  headers: t.union([MultimapCodec, t.undefined]),
  date: t.string,
});
export type EntryRequest = t.TypeOf<typeof EntryRequestCodec>;

const EntryResponseCodec = t.type({
  status: t.number,
  body: t.union([t.undefined, t.any]),
  headers: t.union([MultimapCodec, t.undefined]),
  date: t.string,
});
export type EntryResponse = t.TypeOf<typeof EntryResponseCodec>;

const EntryCodec = t.type({
  mock_id: t.union([t.undefined, t.string]),
  request: EntryRequestCodec,
  response: EntryResponseCodec,
});
export type Entry = t.TypeOf<typeof EntryCodec>;

export const HistoryCodec = t.array(EntryCodec);
export type History = t.TypeOf<typeof HistoryCodec>;

const MockRequestCodec = t.type({
  path: StringMatcherCodec,
  method: StringMatcherCodec,
  body: t.union([BodyMatcherCodec, t.undefined]),
  query_params: t.union([MultimapMatcherCodec, t.undefined]),
  headers: t.union([MultimapMatcherCodec, t.undefined]),
});
export type MockRequest = t.TypeOf<typeof MockRequestCodec>;

const MockResponseCodec = t.type({
  status: t.number,
  body: t.union([t.undefined, t.unknown]),
  headers: t.union([MultimapCodec, t.undefined]),
});
export type MockResponse = t.TypeOf<typeof MockResponseCodec>;

const MockDynamicResponseCodec = t.type({
  engine: t.union([
    t.literal("go_template"),
    t.literal("go_template_yaml"),
    t.literal("go_template_json"),
    t.literal("lua"),
  ]),
  script: t.string,
});
export type MockDynamicResponse = t.TypeOf<typeof MockDynamicResponseCodec>;

const MockProxyCodec = t.type({
  host: t.string,
});
export type MockProxy = t.TypeOf<typeof MockProxyCodec>;

const MockContextCodec = t.type({
  times: t.union([t.number, t.undefined]),
});
export type MockContext = t.TypeOf<typeof MockContextCodec>;

const MockStateCodec = t.type({
  times_count: t.number,
  creation_date: t.string,
  id: t.string,
  locked: t.boolean,
});
export type MockState = t.TypeOf<typeof MockStateCodec>;

const MockCodec = t.type({
  request: MockRequestCodec,
  response: t.union([MockResponseCodec, t.undefined]),
  dynamic_response: t.union([MockDynamicResponseCodec, t.undefined]),
  proxy: t.union([MockProxyCodec, t.undefined]),
  context: MockContextCodec,
  state: MockStateCodec,
});
export type Mock = t.TypeOf<typeof MockCodec>;

export const MocksCodec = t.array(MockCodec);
export type Mocks = t.TypeOf<typeof MocksCodec>;

const GraphEntryCodec = t.type({
  type: t.string,
  message: t.string,
  from: t.string,
  to: t.string,
  date: t.string,
});
export type GraphEntry = t.TypeOf<typeof GraphEntryCodec>;

export const GraphHistoryCodec = t.array(GraphEntryCodec);
export type GraphHistory = t.TypeOf<typeof GraphHistoryCodec>;

export function decode<C extends t.Mixed>(
  codec: C
): (json: unknown) => Observable<t.TypeOf<C>> {
  return (json) => {
    return pipe(
      codec.decode(json),
      fold(
        (error) =>
          throwError(new Error(PathReporter.report(left(error)).join("\n"))),
        (data) => of(data)
      )
    );
  };
}
