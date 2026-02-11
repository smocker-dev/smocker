package handlers

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/smocker-dev/smocker/internal/pkg/assert"
	"github.com/smocker-dev/smocker/internal/types"
)

func Test_httpRequestToRequest(t *testing.T) {
	t.Parallel()

	now := time.Now().UTC()

	jsonBody := `
{
    "key": "value"
}
`

	yamlBody := `
key: value
`

	xmlBody := `
<root>
    <key attr="attr-value">text-value</key>
</root>
`
	formURLEncodedBody := `key=foo&key=bar&baz=qux`

	tests := map[string]struct {
		request *http.Request
		want    types.Request
	}{
		"minimal": {
			request: httptest.NewRequest(http.MethodGet, "http://example.com", nil),
			want: types.Request{
				Scheme:      "http",
				Host:        "example.com",
				Method:      http.MethodGet,
				Origin:      "192.0.2.1:1234",
				BodyString:  "",
				Body:        "",
				QueryParams: url.Values{},
				Headers:     http.Header{},
				Date:        now,
			},
		},
		"with https, path, query params, headers": {
			request: func() *http.Request {
				req := httptest.NewRequest(http.MethodGet, "https://example.com/foo?bar=baz", nil)
				req.Header.Add("X-Test-Header", "test-value")
				return req
			}(),
			want: types.Request{
				Scheme:     "https",
				Host:       "example.com",
				Path:       "/foo",
				Method:     http.MethodGet,
				Origin:     "192.0.2.1:1234",
				BodyString: "",
				Body:       "",
				QueryParams: url.Values{
					"bar": []string{"baz"},
				},
				Headers: http.Header{
					"X-Test-Header": []string{"test-value"},
				},
				Date: now,
			},
		},
		"with json body and header": {
			request: func() *http.Request {
				req := httptest.NewRequest(http.MethodPost, "http://example.com", strings.NewReader(jsonBody))
				req.Header.Add("Content-Type", "application/json")
				return req
			}(),
			want: types.Request{
				Scheme:     "http",
				Host:       "example.com",
				Method:     http.MethodPost,
				Origin:     "192.0.2.1:1234",
				BodyString: jsonBody,
				Body: map[string]any{
					"key": "value",
				},
				QueryParams: url.Values{},
				Headers: http.Header{
					"Content-Type": []string{"application/json"},
				},
				Date: now,
			},
		},
		"with json body only": {
			request: httptest.NewRequest(http.MethodPost, "http://example.com", strings.NewReader(jsonBody)),
			want: types.Request{
				Scheme:     "http",
				Host:       "example.com",
				Method:     http.MethodPost,
				Origin:     "192.0.2.1:1234",
				BodyString: jsonBody,
				Body: map[string]any{
					"key": "value",
				},
				QueryParams: url.Values{},
				Headers:     http.Header{},
				Date:        now,
			},
		},
		"with yaml body and header": {
			request: func() *http.Request {
				req := httptest.NewRequest(http.MethodPost, "http://example.com", strings.NewReader(yamlBody))
				req.Header.Add("Content-Type", "application/yaml")
				return req
			}(),
			want: types.Request{
				Scheme:     "http",
				Host:       "example.com",
				Method:     http.MethodPost,
				Origin:     "192.0.2.1:1234",
				BodyString: yamlBody,
				Body: map[string]any{
					"key": "value",
				},
				QueryParams: url.Values{},
				Headers: http.Header{
					"Content-Type": []string{"application/yaml"},
				},
				Date: now,
			},
		},
		"with xml body and header": {
			request: func() *http.Request {
				req := httptest.NewRequest(http.MethodPost, "http://example.com", strings.NewReader(xmlBody))
				req.Header.Add("Content-Type", "application/xml")
				return req
			}(),
			want: types.Request{
				Scheme:     "http",
				Host:       "example.com",
				Method:     http.MethodPost,
				Origin:     "192.0.2.1:1234",
				BodyString: xmlBody,
				Body: map[string]any{
					"root": map[string]any{
						"key": map[string]any{
							"#text": "text-value",
							"@attr": "attr-value",
						},
					},
				},
				QueryParams: url.Values{},
				Headers: http.Header{
					"Content-Type": []string{"application/xml"},
				},
				Date: now,
			},
		},
		"with form-urlencoded body and header": {
			request: func() *http.Request {
				req := httptest.NewRequest(http.MethodPost, "http://example.com", strings.NewReader(formURLEncodedBody))
				req.Header.Add("Content-Type", "application/x-www-form-urlencoded")
				return req
			}(),
			want: types.Request{
				Scheme:     "http",
				Host:       "example.com",
				Method:     http.MethodPost,
				Origin:     "192.0.2.1:1234",
				BodyString: formURLEncodedBody,
				Body: map[string]any{
					"key": []string{"foo", "bar"},
					"baz": "qux",
				},
				QueryParams: url.Values{},
				Headers: http.Header{
					"Content-Type": []string{"application/x-www-form-urlencoded"},
				},
				Date: now,
			},
		},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			got := httpRequestToRequest(t.Context(), tt.request, now)
			assert.Equal(t, tt.want, got)
		})
	}
}
