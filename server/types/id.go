package types

import "crypto/rand"

// idAlphabet is a URL-safe base62 alphabet. idLength is chosen to keep IDs short (like the
// previous shortid) while staying collision-resistant: 62^12 ≈ 3.2e21 possibilities.
const (
	idAlphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
	idLength   = 12
)

// NewID returns a short, random, URL-safe identifier. It replaces the unmaintained
// teris-io/shortid with a zero-dependency crypto/rand generator, keeping IDs short (unlike a
// UUID). IDs are opaque, so the exact alphabet/length is not part of the persisted format.
func NewID() string {
	b := make([]byte, idLength)
	if _, err := rand.Read(b); err != nil {
		// crypto/rand.Read does not fail on supported platforms; mirror the previous
		// shortid.MustGenerate behavior of not returning an error.
		panic(err)
	}
	for i := range b {
		b[i] = idAlphabet[int(b[i])%len(idAlphabet)]
	}
	return string(b)
}
